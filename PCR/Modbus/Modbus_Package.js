/**
 * ============================================================================
 * MODBUS PACKAGING & TRANSMISSION SERVICE
 * ============================================================================
 * Nhiệm vụ: Đóng gói và chuyển đổi kiểu dữ liệu (Float/Integer) thành cấu trúc
 * mảng thanh ghi 16-bit để truyền xuống Slave (STM32 PCR) qua Modbus RTU.
 * ============================================================================
 */
const ModbusConstant = require("./Modbus_Constants");

/**
 * @private
 * Ép kiểu dữ liệu về số nguyên 16-bit an toàn (0 -> 65535)
 */
const toUint16 = (val) => Math.floor(Math.max(0, Math.min(65535, Number(val) || 0)));
/**
 * @private
 * Chuyển đổi số thực Float 32-bit thành 2 thanh ghi 16-bit (Big-Endian)
 */
function floatToRegisters(value) 
{
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(Number(value) || 0, 0);
    return [buf.readUInt16BE(0), buf.readUInt16BE(2)];
}



/**
 * 🛠️ LỆNH ĐỒNG BỘ CẤU HÌNH PROTOCOL PCR (Chia 2 gói liên tiếp tránh tràn buffer)
 * @param {Object} modbusInstance - Thư viện Modbus kết nối vật lý
 * @param {Object} protocolData - Bộ tham số cấu hình chạy máy từ Web UI
 */
async function packAndWriteProtocol(modbusInstance, protocolData) {

    const SETPOINT_COUNT = ModbusConstant.TEMP_TIME_SETPOINT_NUM || 30;
    const LOOP_COUNT = ModbusConstant.PCR_LOOP || 4;
    const CMD_ENUM = ModbusConstant.INDEX_REGISTERS_MODBUS_RECEIVE;
    const package1_Registers = [];
    const package2_Registers = [];

    // -----------------------------------------------------------------------------------
    // GÓI 1: Cấu hình Mảng Nhiệt độ & Thời gian (Ghi vào Adr: 43 | Kích thước: 121 Regs)
    // Structure: [ Mã Lệnh 3 (1 Reg) | Block Temp Array (60 Regs) | Run Time Array (60 Regs) ]
    // -----------------------------------------------------------------------------------
    package1_Registers.push(toUint16(CMD_ENUM.MT_UPDATE_BLOCK_TIME_CONFIG)); 

    const blockData = protocolData.ProConf_Block || [];
    for (let i = 0; i < SETPOINT_COUNT; i++) 
        {
        const val = blockData[i] !== undefined ? blockData[i] : 25.0;
        package1_Registers.push(...floatToRegisters(val));
    }

    const timeData = protocolData.ProConf_Time || [];
    for (let i = 0; i < SETPOINT_COUNT; i++) {
        const val = timeData[i] !== undefined ? timeData[i] : 0.0;
        package1_Registers.push(...floatToRegisters(val));
    }

// -----------------------------------------------------------------------------------
    // GÓI 2: Thông số vận hành máy khác (Ghi vào Adr: 164 | Kích thước: 15 Regs)
    // Structure: [ Mã Lệnh 4 (1 Reg) | Lid Temp (2 Regs) | Biến lẻ u8 (4 Regs) | Step/Cycles (8 Regs) ]
    // -----------------------------------------------------------------------------------
    package2_Registers.push(toUint16(CMD_ENUM.MT_UPDATE_PROTOCOL_CONFIG));

    package2_Registers.push(...floatToRegisters(protocolData.ProConf_Lid || 60.0));
    package2_Registers.push(toUint16(protocolData.ProConf_Liquid));     
    package2_Registers.push(toUint16(protocolData.ProConf_Hold_Start));  
    package2_Registers.push(toUint16(protocolData.ProConf_PCR_Loop));    
    package2_Registers.push(toUint16(protocolData.ProConf_Hold_End));    

    const stepPcr = protocolData.ProConf_Step_PCR || [];
    for (let i = 0; i < LOOP_COUNT; i++) {
        package2_Registers.push(toUint16(stepPcr[i]));
    }

    const cyclesPcr = protocolData.ProConf_Cycles_PCR || [];
    for (let i = 0; i < LOOP_COUNT; i++) {
        package2_Registers.push(toUint16(cyclesPcr[i]));
    }

    // ===================================================================================
    // THỰC THI TRUYỀN DẪN QUA UART MODBUS
    // ===================================================================================
    await modbusInstance.writeRegisters(0, package1_Registers);
    await new Promise(resolve => setTimeout(resolve, 10));   // Chờ 10ms sau khi gửi gói Block Time
    
    await modbusInstance.writeRegisters(0, package2_Registers);
    await new Promise(resolve => setTimeout(resolve, 10));   // Chờ 10ms ổn định gửi gói Config
}

/**
 * 🛠️ LỆNH ĐIỀU KHIỂN TRẠNG THÁI HỆ THỐNG (RUN / STOP / PAUSE / AUTO)
 * @param {Object} modbusInstance - Thư viện Modbus kết nối vật lý
 * @param {Number} targetState - Mã trạng thái mong muốn (0 -> 3 từ Hệ Enum)
 * Structure: [ Mã Lệnh 2 (1 Reg) | Trạng thái máy (1 Reg) ] -> Ghi vào Adr: 0
 */
async function packAndWriteControl(modbusInstance, targetState) {
    const CMD_ENUM = ModbusConstant.INDEX_REGISTERS_MODBUS_RECEIVE;
    const controlRegisters = 
    [
        toUint16(CMD_ENUM.MT_UPDATE_SYSTEM_STATE), 
        toUint16(targetState)
    ];
    await modbusInstance.writeRegisters(0, controlRegisters);
}




/**
 * LỆNH GHI CALIB + SYSTEM CONFIG (Ghi vào Adr: 0, kích thước 47 thanh ghi)
 *
 * Layout:
 *   [0]      MT_UPDATE_CALIB_CONFIG (command = 1)
 *   [1-2]    HeatSink_Threshold       (float)
 *   [3-4]    Block_Threshold          (float)
 *   [5]      Fan_Speed_Hi_Threshold   (u8)
 *   [6]      Fan_Speed_Med_Threshold  (u8)
 *   [7]      Fan_Speed_Lo_Threshold   (u8)
 *   [8]      Fan_Cool_Down_Time       (u8)
 *   [9-18]   Temp_Hi_Measure[5]       (float × 5)
 *   [19-28]  Temp_Lo_Measure[5]       (float × 5)
 *   [29-30]  Heating_Val              (float)
 *   [31-32]  Cooling_Val              (float)
 *   [33-34]  Hold_Time_Adjust_Factor_Normal (float)
 *   [35-36]  Hold_Time_Adjust_Factor_First  (float)
 *   [37]     Lid_Control_Max_Val      (u8)
 *   [38]     Block_Control_Max_Val    (u8)
 *   [39]     Control_Timeout          (u8)
 *   [40-41]  Heating_Speed            (float)
 *   [42-43]  Cooling_Speed            (float)
 *   [44]     Debug_LOG                (u8)  — system config bundled
 *   [45]     Simulate                 (u8)
 *   [46]     Device                   (u8, values: 16/32/48/96)
 */
async function packAndWriteCalib(modbusInstance, data) {
    const CMD_ENUM = ModbusConstant.INDEX_REGISTERS_MODBUS_RECEIVE;
    const SENSORS  = ModbusConstant.TEMP_SENSOR || 5;
    const regs     = [];

    regs.push(toUint16(CMD_ENUM.MT_UPDATE_CALIB_CONFIG));                    // [0]  command → 5 = flash save

    regs.push(...floatToRegisters(data.HeatSink_Threshold   ?? 45));        // [1-2]
    regs.push(...floatToRegisters(data.Block_Threshold      ?? 95));        // [3-4]

    regs.push(toUint16(data.Fan_Speed_Hi_Threshold  ?? 100));               // [5]
    regs.push(toUint16(data.Fan_Speed_Med_Threshold ?? 70));                // [6]
    regs.push(toUint16(data.Fan_Speed_Lo_Threshold  ?? 40));                // [7]
    regs.push(toUint16(data.Fan_Cool_Down_Time       ?? 30));               // [8]

    const tempHi = data.Temp_Hi_Measure || [];
    for (let i = 0; i < SENSORS; i++)
        regs.push(...floatToRegisters(tempHi[i] ?? 0));                     // [9-18]

    const tempLo = data.Temp_Lo_Measure || [];
    for (let i = 0; i < SENSORS; i++)
        regs.push(...floatToRegisters(tempLo[i] ?? 0));                     // [19-28]

    regs.push(...floatToRegisters(data.Heating_Val                    ?? 100)); // [29-30]
    regs.push(...floatToRegisters(data.Cooling_Val                    ?? 0));   // [31-32]
    regs.push(...floatToRegisters(data.Hold_Time_Adjust_Factor_Normal ?? 1));   // [33-34]
    regs.push(...floatToRegisters(data.Hold_Time_Adjust_Factor_First  ?? 1));   // [35-36]

    regs.push(toUint16(data.Lid_Control_Max_Val   ?? 100));                 // [37]
    regs.push(toUint16(data.Block_Control_Max_Val ?? 100));                 // [38]
    regs.push(toUint16(data.Control_Timeout        ?? 30));                  // [39]

    regs.push(...floatToRegisters(data.Heating_Speed ?? 3.5));              // [40-41]
    regs.push(...floatToRegisters(data.Cooling_Speed ?? 3.5));              // [42-43]

    // System config — bundled into same write (addr 44-46 = holding 45-47)
    regs.push(toUint16(data.Debug_LOG ?? 0));   // [44] Debug_LOG
    regs.push(toUint16(data.Simulate  ?? 0));   // [45] Simulate
    regs.push(toUint16(data.Device    ?? 16));  // [46] Device

    await modbusInstance.writeRegisters(0, regs);
    await new Promise(resolve => setTimeout(resolve, 10));
}

/**
 * LỆNH KHÔI PHỤC PROTOCOL STATE (Ghi vào Adr: 0, kích thước 16 thanh ghi)
 *
 * Dùng khi phục hồi sau mất nguồn — ghi lại vị trí đang chạy
 * trong chu trình PCR để slave tiếp tục đúng chỗ.
 *
 * Layout:
 *   [0]   MT_UPDATE_PRO_STATE (6)
 *   [1]   Step_Cnt        (u8)
 *   [2]   Step_Setpoint   (u8)
 *   [3]   Hold_Start_Cnt  (u8)
 *   [4]   PCR_Loop_Cnt    (u8)
 *   [5]   PCR_Loop_Index  (u8)
 *   [6]   Hold_End_Cnt    (u8)
 *   [7]   Time_Run_Cnt    (u16)
 *   [8-11]  Step_PCR_Cnt[4]    (u8 × 4)
 *   [12-15] Cycles_PCR_Cnt[4]  (u8 × 4)
 */
async function packAndWriteProState(modbusInstance, state) {
    const CMD_ENUM  = ModbusConstant.INDEX_REGISTERS_MODBUS_RECEIVE;
    const PCR_LOOP  = ModbusConstant.PCR_LOOP || 4;
    const regs      = [];

    regs.push(toUint16(CMD_ENUM.MT_UPDATE_PRO_STATE));   // [0]

    regs.push(toUint16(state.Step_Cnt       ?? 0));      // [1]
    regs.push(toUint16(state.Step_Setpoint  ?? 0));      // [2]
    regs.push(toUint16(state.Hold_Start_Cnt ?? 0));      // [3]
    regs.push(toUint16(state.PCR_Loop_Cnt   ?? 0));      // [4]
    regs.push(toUint16(state.PCR_Loop_Index ?? 0));      // [5]
    regs.push(toUint16(state.Hold_End_Cnt   ?? 0));      // [6]
    regs.push(toUint16(state.Time_Run_Cnt   ?? 0));      // [7]

    const stepPcr   = state.Step_PCR_Cnt   || [];
    const cyclesPcr = state.Cycles_PCR_Cnt || [];
    for (let i = 0; i < PCR_LOOP; i++) regs.push(toUint16(stepPcr[i]   ?? 0));  // [8-11]
    for (let i = 0; i < PCR_LOOP; i++) regs.push(toUint16(cyclesPcr[i] ?? 0));  // [12-15]

    await modbusInstance.writeRegisters(0, regs);
    await new Promise(resolve => setTimeout(resolve, 10));
}

module.exports = {
    packAndWriteProtocol,
    packAndWriteControl,
    packAndWriteCalib,
    packAndWriteProState,
};