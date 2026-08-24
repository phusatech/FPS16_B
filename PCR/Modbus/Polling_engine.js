/**
 * =========================================================
 * MODBUS POLLING ENGINE 
 * =========================================================
 * RULE:
 * - ONLY READ WHEN FLAG = 1
 * - INPUT: 30001 trigger
 * - HOLDING: 40001 trigger
 * - decode the data into variables.
 * =========================================================
 */
const map                    = require("./Modbus_Map.js");
const Decoder                = require("./Modbus_Decoder.js");
const { Cache, expandCache } = require("./Cache_Mapper.js");
const Modbus_Package         = require("./Modbus_Package");
const Constants              = require("./Modbus_Constants");
const TftService             = require("../services/tft_service");
const Runtime                = require("../Runtime/runtime_manager");

let Modbus = null;
const commandQueue = [];
let _lastInputLog   = 0;
let _lastTftWrite   = 0;
const _notifiedErrors = new Set(); // track lỗi đã xử lý trong lần chạy hiện tại
let _pollErrCount = 0;  // số lần lỗi đọc polling định kỳ
let _cmdErrCount  = 0;  // số lần lỗi thực thi lệnh

// ─── CẤU HÌNH KÍCH THƯỚC THANH GHI ───
function getInputSize() { return 60; }
function getHoldingSize() { return 200; }

/**
 * Đẩy một lệnh mới vào hàng đợi tập trung (Trả về Promise để đồng bộ luồng gọi)
 * @param {string} type - Định danh loại lệnh (Ví dụ: 'SYSTEM_RUN')
 * @param {any} payload - Dữ liệu đi kèm lệnh
 * @returns {Promise}
 */
function sendCommand(type, payload) {
    return new Promise((resolve, reject) => {
        commandQueue.push({ type, payload, resolve, reject });
    });
}

/**
 * Encode float → [high word, low word] — khớp với floatToRegisters() bên Modbus_Package.js
 */
function _encodeFloat(val) {
    const b = Buffer.allocUnsafe(4);
    b.writeFloatBE(Number(val) || 0, 0);
    return [b.readUInt16BE(0), b.readUInt16BE(2)];
}

/**
 * @private
 * Xác nhận lưu calib thành công bằng cách đọc lại Holding Registers và so sánh
 * với giá trị đã ghi.
 *
 * Cơ chế: sau khi Calib_Flash_Task() lưu flash thành công, firmware gọi
 * Modbus_Update_HoldingRegisters() → cập nhật Calib mới (kể cả Speed) vào holding block.
 * → So sánh u8 fields + Speed float (raw register words) với payload đã ghi.
 * → Tất cả khớp = thành công, timeout 5s = thất bại.
 *
 * Layout holding (addr → index trong block đọc từ addr 1):
 *   addr 5  → idx 4      : Fan_Speed_Hi_Threshold  (u8)
 *   addr 6  → idx 5      : Fan_Speed_Med_Threshold (u8)
 *   addr 7  → idx 6      : Fan_Speed_Lo_Threshold  (u8)
 *   addr 8  → idx 7      : Fan_Cool_Down_Time       (u8)
 *   addr 37 → idx 36     : Lid_Control_Max_Val      (u8)
 *   addr 38 → idx 37     : Block_Control_Max_Val    (u8)
 *   addr 39 → idx 38     : Control_Timeout          (u8)
 *   addr 40 → idx 39     : Heating_Speed high word  (float)
 *   addr 41 → idx 40     : Heating_Speed low  word
 *   addr 42 → idx 41     : Cooling_Speed high word  (float)
 *   addr 43 → idx 42     : Cooling_Speed low  word
 *   addr 45 → idx 44     : Debug_LOG  (u8)  — bundled system config
 *   addr 46 → idx 45     : Simulate   (u8)
 *   addr 47 → idx 46     : Device     (u8)
 */
async function _pollCalibSaveStatus(data) {
    const INIT_DELAY = 200;   // ms — chờ slave bắt đầu Calib_Flash_Task
    const POLL_MS    = 50;    // ms — chu kỳ poll
    const TIMEOUT_MS = 5000;  // ms — erase 4K ~100ms + write + verify × 3 lần thử

    // u8 fields — calib
    const sentHi      = (data.Fan_Speed_Hi_Threshold  ?? 100) & 0xFF;
    const sentMed     = (data.Fan_Speed_Med_Threshold ?? 70)  & 0xFF;
    const sentLo      = (data.Fan_Speed_Lo_Threshold  ?? 40)  & 0xFF;
    const sentFan     = (data.Fan_Cool_Down_Time       ?? 30)  & 0xFF;
    const sentLid     = (data.Lid_Control_Max_Val      ?? 100) & 0xFF;
    const sentBlock   = (data.Block_Control_Max_Val    ?? 100) & 0xFF;
    const sentTimeout = (data.Control_Timeout          ?? 30)  & 0xFF;

    // Float Speed — encode thành raw words để so sánh chính xác (không bị lỗi float precision)
    const [heatHi, heatLo] = _encodeFloat(data.Heating_Speed ?? 3.5);
    const [coolHi, coolLo] = _encodeFloat(data.Cooling_Speed ?? 3.5);

    // u8 fields — system config (bundled)
    const sentDebug  = (data.Debug_LOG ?? 0)  & 0xFF;
    const sentSim    = (data.Simulate  ?? 0)  & 0xFF;
    const sentDevice = (data.Device    ?? 16) & 0xFF;

    await new Promise(r => setTimeout(r, INIT_DELAY));

    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_MS));
        try {
            // Đọc block holding addr 1..47 (47 registers); idx = addr - 1
            const hld = await Modbus.readHolding(1, 47);

            const match =
                (hld[4]  & 0xFF) === sentHi      &&   // addr 5  = Fan_Speed_Hi
                (hld[5]  & 0xFF) === sentMed      &&   // addr 6  = Fan_Speed_Med
                (hld[6]  & 0xFF) === sentLo       &&   // addr 7  = Fan_Speed_Lo
                (hld[7]  & 0xFF) === sentFan      &&   // addr 8  = Fan_Cool_Down_Time
                (hld[36] & 0xFF) === sentLid      &&   // addr 37 = Lid_Control_Max_Val
                (hld[37] & 0xFF) === sentBlock    &&   // addr 38 = Block_Control_Max_Val
                (hld[38] & 0xFF) === sentTimeout  &&   // addr 39 = Control_Timeout
                hld[39] === heatHi                &&   // addr 40 = Heating_Speed high
                hld[40] === heatLo                &&   // addr 41 = Heating_Speed low
                hld[41] === coolHi                &&   // addr 42 = Cooling_Speed high
                hld[42] === coolLo                &&   // addr 43 = Cooling_Speed low
                (hld[44] & 0xFF) === sentDebug    &&   // addr 45 = Debug_LOG
                (hld[45] & 0xFF) === sentSim      &&   // addr 46 = Simulate
                (hld[46] & 0xFF) === sentDevice;       // addr 47 = Device

            if (match) return { success: true };
        } catch (err) {
            console.warn(`⚠️  [WRITE_CALIB] poll error:`, err.message);
        }
    }

    return { success: false, message: 'Timeout: calib values did not update within 5s' };
}

/**
 * @private
 * Bộ thực thi lệnh Modbus (Command Executor)
 * Trả về kết quả tùy lệnh — WRITE_CALIB trả về { success, message? },
 * các lệnh còn lại trả về undefined (caller sẽ dùng default resolve).
 */
async function executeCommand(cmd) {
    console.log(`🚀 [Loop Engine] Đang xử lý lệnh: [${cmd.type}]`);

    switch (cmd.type) {
        case "WRITE_PROTOCOL_CONFIG":
            await Modbus_Package.packAndWriteProtocol(Modbus, cmd.payload);
            break;

        case "WRITE_PRO_STATE":
            await Modbus_Package.packAndWriteProState(Modbus, cmd.payload);
            break;

        case "WRITE_CALIB":
            await Modbus_Package.packAndWriteCalib(Modbus, cmd.payload);
            return await _pollCalibSaveStatus(cmd.payload);   // ← so sánh holding với payload đã ghi

        // ─────────────────────────────────────────────────────────────────
        // NHÓM LỆNH ĐIỀU KHIỂN TRẠNG THÁI HỆ THỐNG
        // ─────────────────────────────────────────────────────────────────
        case "SYSTEM_RUN":
            await Modbus_Package.packAndWriteControl(Modbus, Constants.SYSTEM_STATE.SYSTEM_RUN);
            break;

        case "SYSTEM_STOP":
            await Modbus_Package.packAndWriteControl(Modbus, Constants.SYSTEM_STATE.SYSTEM_STOP);
            break;

        case "SYSTEM_PAUSE":
            await Modbus_Package.packAndWriteControl(Modbus, Constants.SYSTEM_STATE.SYSTEM_PAUSE);
            break;

        case "SYSTEM_RESUME":
            await Modbus_Package.packAndWriteControl(Modbus, Constants.SYSTEM_STATE.SYSTEM_RESUME);
            break;

        case "SYSTEM_AUTO":
            await Modbus_Package.packAndWriteControl(Modbus, Constants.SYSTEM_STATE.SYSTEM_AUTO);
            break;

        default:
            throw new Error(`Loại lệnh [${cmd.type}] không được hỗ trợ!`);
    }
}

/**
 * @private
 * Quét chu kỳ vùng nhớ Input Registers (3xxxx)
 */
async function readInputIfReady()
{
    // Đọc ô kiểm tra (Flag) tại địa chỉ 0
    const flag = await Modbus.readInput(0, 1); 

    if(flag[0] !== 1)
        return;

    // Đọc toàn bộ block dữ liệu từ địa chỉ 1 nếu Flag = 1
    const size = getInputSize();
    const data = await Modbus.readInput(1, size);

    // Giải mã và cập nhật bộ nhớ đệm toàn cục
    Cache.input.raw  = data;
    Cache.input.data = Decoder.decodeRegisters(Cache.input.raw, map.input);
    expandCache(Cache, Cache.input.data);
    Cache.meta.lastInputUpdate = Date.now();

    // DEBUG: log khi Show_UI_Block = 0 để xem raw registers
    const blockVal = Cache.input.data?.Show_UI_Block ?? null;
    if (blockVal !== null && blockVal < 5) {
        console.warn(`[DEBUG] Show_UI_Block=0 | raw[0]=${data[0]} raw[1]=${data[1]} (hex: ${data[0]?.toString(16)} ${data[1]?.toString(16)})`);
    }
}

/**
 * @private
 * Quét chu kỳ vùng nhớ Holding Registers (4xxxx)
 */
async function readHoldingIfReady()
{
    // Đọc ô kiểm tra (Flag) tại địa chỉ 0
    const flag = await Modbus.readHolding(0, 1); // Kiểm tra Flag Register Holding nếu = 1 thì có dữ liệu mới

    if(flag[0] !== 1)
        return;

    //console.log(`[HOLDING] flag=1 → đọc holding registers (sysState=${Cache.System?.State ?? "?"}`);
    // Đọc phân đoạn (split-read) tránh vượt quá giới hạn khung truyền Modbus
    const block1 = await Modbus.readHolding(1, 125);
    const block2 = await Modbus.readHolding(126, getHoldingSize() - 126); 
    
    // Gom mảng, giải mã và đẩy vào Cache
    const full = [...block1, ...block2];
    Cache.holding.raw = full;
    Cache.holding.data = Decoder.decodeRegisters( Cache.holding.raw, map.holding);
    expandCache(Cache, Cache.holding.data);
    Cache.meta.lastHoldingUpdate = Date.now();

    // console.log(Cache.holding.raw);
}


let _loopRunning = false;

/**
 * 🔄 CORE ENGINE LOOP
 * Được thực thi định kỳ để điều phối luồng truyền nhận
 */
async function loop() {
    if (_loopRunning) return;  // bỏ qua nếu loop trước chưa xong
    _loopRunning = true;

    try {
        // 1. GIAI ĐOẠN ƯU TIÊN: Xử lý toàn bộ hàng đợi lệnh liên tục, không delay
        while (commandQueue.length > 0)
        {
            let currentCmd = commandQueue.shift();
            try {
                const result = await executeCommand(currentCmd);
                console.log(`✅ [Loop Engine] Lệnh [${currentCmd.type}] đã thực thi thành công.`);
                currentCmd.resolve(result ?? { success: true, type: currentCmd.type });
            }
            catch (err) {
                _cmdErrCount++;
                console.error(`❌ [Loop Engine Error #${_cmdErrCount}] Lỗi khi xử lý lệnh [${currentCmd.type}]:`, err.message);
                currentCmd.reject(err);
            }
        }

        // 2. GIAI ĐOẠN ĐỌC: Quét Polling định kỳ từ Slave (Chỉ chạy khi hàng đợi lệnh trống)
        try {
            await readInputIfReady();
            await readHoldingIfReady();
        }
        catch (err) {
            _pollErrCount++;
            console.error(`❌ [Loop Engine Error #${_pollErrCount}] Lỗi khi đọc Polling định kỳ:`, err.message);
            // Flush stale bytes trong OS buffer sau timeout, chờ slave recover
            if (typeof Modbus?.flushPort === "function") await Modbus.flushPort();
            await new Promise(r => setTimeout(r, 50));
        }

        // 3. KIỂM TRA LỖI từ Cache.Flag (slave gửi qua holding registers)
        _checkErrors();

        // 4. CẬP NHẬT TFT — độc lập với socket/browser, mỗi 500ms
        _updateTFT();

    } finally {
        _loopRunning = false;
    }
}

/**
 * Khởi tạo Instance Modbus Client kết nối vật lý
 */
function init(client) {
     Modbus = client;
}



// Kiểm tra lỗi từ Cache.Flag (slave gửi qua holding registers khi flag=1)
// Chạy mỗi loop, không cần browser
function _checkErrors() {
    const flag     = Cache.Flag   || {};
    const sysState = Cache.System?.State ?? 0;

    // Đọc flag TRƯỚC khi kiểm tra sysState để không bỏ sót lỗi xảy ra ngay khi dừng
    const errSensor  = flag.Error_Sensor  ? 1 : 0;
    const errPower   = flag.Error_Power   ? 1 : 0;
    const errTimeout = flag.Error_Timeout ? 1 : 0;
    const errMemory  = flag.Error_Memory  ? 1 : 0;
    const anyErr     = errSensor || errPower || errTimeout || errMemory;

    if (sysState === 0) {
        // Chỉ reset tracker khi không còn flag lỗi nào → lần chạy tiếp theo detect lại được
        if (!anyErr) { _notifiedErrors.clear(); }
        if (!anyErr) return;
    }

    if (!anyErr) return;

    const webData = Runtime.GetRuntime();
    if (!Array.isArray(webData.Notifications)) webData.Notifications = [];
    const m       = Cache.Measure || {};
    const r1      = (v) => v != null ? Math.round(v * 10) / 10 : "N/A";
    const now     = new Date();
    const ts      = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
    let   stopNeeded = false;
    let   notifAdded = false;

    if (errSensor && !_notifiedErrors.has("ERR_SENSOR")) {
        _notifiedErrors.add("ERR_SENSOR");
        webData.Notifications.push({ Error_Code: "ERR_SENSOR", Message: `[${ts}] Temperature sensor error` });
        stopNeeded  = true;
        notifAdded  = true;
    }
    if (errPower && !_notifiedErrors.has("ERR_POWER")) {
        _notifiedErrors.add("ERR_POWER");
        console.error(`[ERR_POWER] at ${ts}`);
        webData.Notifications.push({ Error_Code: "ERR_POWER", Message: `[${ts}] Power stage control fault` });
        stopNeeded = true;
        notifAdded = true;
    }

    // ERR_TIMEOUT và ERR_MEMORY chỉ ghi Notification, không gửi SYSTEM_STOP
    if (errTimeout && !_notifiedErrors.has("ERR_TIMEOUT")) {
        _notifiedErrors.add("ERR_TIMEOUT");
        const rt        = webData.Runtime_State || {};
        const loopIndex = rt.PCR_Loop_Index ?? 0;
        const cycleCur  = (rt.Cycles_PCR_Cnt?.[loopIndex] ?? 0) || 1;
        const cycleSp   = webData.Cycles_PCR?.[loopIndex] ?? "?";
        const detail    = `Loop ${loopIndex + 1}, Cycle ${cycleCur}/${cycleSp}`;
        console.error(`[ERR_TIMEOUT] ${detail}`);
        webData.Notifications.push({ Error_Code: "ERR_TIMEOUT", Message: `[${ts}] Control timeout — ${detail}` });
        notifAdded = true;
    }
    if (errMemory && !_notifiedErrors.has("ERR_MEMORY")) {
        _notifiedErrors.add("ERR_MEMORY");
        console.error(`[ERR_MEMORY] Flash/memory write failed`);
        webData.Notifications.push({ Error_Code: "ERR_MEMORY", Message: `[${ts}] Memory error — flash write failed` });
        notifAdded = true;
    }

    // Lưu ngay khi có notification mới để tránh mất dữ liệu do race condition với module-level watcher
    if (notifAdded) Runtime.SaveRuntime();

    if (stopNeeded && sysState !== 0) {
        sendCommand("SYSTEM_STOP").catch(e =>
            console.error("[Auto-Stop]", e.message)
        );
    }
}

// Cập nhật TFT độc lập — không cần browser, chạy cùng polling loop
function _updateTFT() {
    const now = Date.now();
    if (now - _lastTftWrite < 500) return;
    _lastTftWrite = now;

    try {
        const webData    = Runtime.GetRuntime();
        const rt         = webData.Runtime_State || {};
        const showUI     = Cache.Show_UI  || {};
        const sysState   = Cache.System?.State ?? 0;
        const loopIndex  = rt.PCR_Loop_Index ?? 0;

        // Dùng Cycles_PCR_Cnt[loopIndex] như web (per-stage counter), min=1 khi =0
        const cyclesCnt  = rt.Cycles_PCR_Cnt || [];
        const cycleCur   = (cyclesCnt[loopIndex] ?? 0) === 0 ? 1 : cyclesCnt[loopIndex];
        const cycleSp    = webData.Cycles_PCR?.[loopIndex] ?? 30;

        TftService.sendToTFT({
            state:          sysState,
            temp:           Math.round((showUI.Block ?? 0) * 10) / 10,
            cycle_cnt:      cycleCur,
            cycle_setpoint: cycleSp,
            time:           rt.Time_Run_Cnt   ?? 0,
            time_total:     webData.Time_Run_Total_Sec ?? 0,
        });
    } catch (e) {
        // không để lỗi TFT làm crash polling engine
    }
}

async function start() {
    if(!Modbus) throw new Error("Modbus client not initialized");
    console.log("[MODBUS] SCAN ENGINE STARTED");
    setInterval(loop, 200);
}

module.exports = {
    init,
    start,
    sendCommand, 
    Cache
};





        //console.log(Cache.input.data);
        //console.log(Cache.holding.data); 
        //console.log(Cache); // In toàn bộ dữ liệu
        
        //console.log(Cache.Show_UI.Block); // In cụ thể từng biến
        // console.log(Cache.Show_UI.Lid);
        
        // Cache.Show_UI 
        // Cache.Setpoint  
        // Cache.Pro_State
        // Cache.Calib   
        // Cache.System   
        // Cache.Pro_Conf 

        // console.log(Cache.Show_UI);
        // console.log(Cache.Setpoint);
        // console.log(Cache.Pro_State);
        // console.log(Cache.Calib);
        // console.log(Cache.System);
        //  console.log(Cache.Pro_Conf);