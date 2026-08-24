import { API } from "../../core/api.js";
import { subscribe } from "../../core/socket_client.js";

// ── Role-gated reveal: page stays hidden until header + role + program are all ready ──
let _deviceRole    = null;
let _roleReady     = false;
let _programReady  = false;
let _headerReady   = false;

function _applyRoleMode() {
    if (_deviceRole !== 'customer') return;
    [ui_BtnEdit, ui_BtnSave, ui_BtnSaveAs].forEach(b => { if (b) b.style.display = 'none'; });
    PANEL_STEP_RUNNING?.forEach(p => Lock_Panel(p, true));
    LABEL_TIME_RUNNING?.forEach(p => Lock_Panel(p, true));
    INPUT_CYCLES_RUNNING?.forEach(p => Lock_Panel(p, true));
    if (ui_LidTemp) Lock_Panel(ui_LidTemp, true);
    if (ui_Liquid)  Lock_Panel(ui_Liquid,  true);
}

function _tryReveal() {
    if (!_headerReady || !_roleReady || !_programReady) return;
    _applyRoleMode();
    _reveal();
}

subscribe("calib:device_result", (info) => {
    _deviceRole = info?.role || 'staff';
    _roleReady  = true;
    _tryReveal();
});
import {Update_Chart, Update_Chart_Estimate, Update_Chart_Temp, Set_Chart_Buf, Reset_Chart_Before_Run} from "../PCR_Elements/Update_UI.js"
window.API   = API;
window.SystemReady = false; // Cờ nhận dữ liệu

// =========================================================================
// 1. LẮNG NGHE PHẢN HỒI PROTOCOL MẶC ĐỊNH TỪ SERVER GỬI VỀ
// =========================================================================
subscribe("protocol:load_result", (data) => {
    window.PROTOCOL_NAME      = data.PROTOCOL_NAME;
    window.BLOCK_SETPOINT     = data.Block;
    window.TIME_SETPOINT      = data.Time;
    window.LID_SETPOINT       = data.Lid; 
    window.LIQUID_SETPOINT    = data.Liquid; 
    window.HOLD_START_CNT     = data.Hold_Start;
    window.PCR_LOOP_CNT       = data.PCR_Loop;
    window.HOLD_END_CNT       = data.Hold_End;
    window.STEP_PCR_CNT       = data.Step_PCR;
    window.CYCLES_SETPOINT    = data.Cycles_PCR;
    
    window.Runtime_State = data.Runtime_State || {};
    window.System_State  = data.System_State ?? 0;

    Load_Runtime_State(data.Runtime_State);

    if (typeof window.Render_PCR_Program === "function")
    {
        window.Render_PCR_Program();
    }
    _programReady = true;
    _tryReveal();

    window.Runtime_State = data.Runtime_State || {};

    const measured = data.Measured_Temperature_Array || [];
    const target   = data.Target_Temperature_Array   || [];

    const _isHistoryView = window.System?.Tab_Status === "history" && window.System?.Option_Status === "view";
    const _isActive = data.System_State === 1 || data.System_State === 2; // RUNNING hoặc PAUSE

    if (_isHistoryView)
    {
        // History view: show saved chart as fixed reference
        Set_Chart_Buf(measured, target);
        Update_Chart(measured);
        Update_Chart_Estimate(target);
    }
    else if (_isActive && measured.length > 0)
    {
        // Đang chạy hoặc đang pause (resume sau F5): restore chart
        Set_Chart_Buf(measured, target);
        Update_Chart(measured);
        Update_Chart_Estimate(target);
    }
    else if (!_isActive)
    {
        // Không chạy (mở New tab, load history run): xóa sạch chart
        Reset_Chart_Before_Run(0);
    }

    UpdateProtocolInformation(data);
});

subscribe("EMIT_REALTIME_DEVICE_DATA", (serverData) =>
{
    if (!serverData) return;

    // ==========================
    // Thông tin chương trình PCR
    // ==========================
    window.PROTOCOL_NAME = serverData.PROTOCOL_NAME;
    window.Date_Saved    = serverData.Date_Saved;
    window.Time_Saved    = serverData.Time_Saved;

    window.Date_Run        = serverData.Date_Run;
    window.Time_Run_Start  = serverData.Time_Run_Start;
    window.Time_Run_Stop   = serverData.Time_Run_Stop;
    window.Time_Run_Total  = serverData.Time_Run_Total;
    window.Time_Estimate   = serverData.Time_Estimate || "";

    // ==========================
    // Cấu hình chương trình
    // ==========================
    window.Pro_Conf_Block      = [...(serverData.Block || [])];
    window.Pro_Conf_Time       = [...(serverData.Time || [])];

    window.Pro_Conf_Lid        = serverData.Lid;
    window.Pro_Conf_Liquid     = serverData.Liquid;

    window.Pro_Conf_Hold_Start = serverData.Hold_Start;
    window.Pro_Conf_PCR_Loop   = serverData.PCR_Loop;
    window.Pro_Conf_Hold_End   = serverData.Hold_End;

    window.Pro_Conf_Step_PCR   = [...(serverData.Step_PCR || [])];
    window.Pro_Conf_Cycles_PCR = [...(serverData.Cycles_PCR || [])];

    // ==========================
    // Runtime State
    // ==========================
    const rt = serverData.Runtime_State || {};

    window.Pro_State_Step_Setpoint  = rt.Step_Setpoint;
    window.Pro_State_Step_Cnt       = rt.Step_Cnt;

    window.Pro_State_Hold_Start_Cnt = rt.Hold_Start_Cnt;

    window.Pro_State_PCR_Loop_Cnt   = rt.PCR_Loop_Cnt;
    window.Pro_State_PCR_Loop_Index = rt.PCR_Loop_Index;

    window.Pro_State_Hold_End_Cnt   = rt.Hold_End_Cnt;

    window.Pro_State_Time_Run_Start = rt.Time_Run_Start;
    window.Pro_State_Time_Run_Cnt   = rt.Time_Run_Cnt;

    window.Pro_State_Step_PCR_Cnt   = [...(rt.Step_PCR_Cnt || [])];
    window.Pro_State_Cycles_PCR_Cnt = [...(rt.Cycles_PCR_Cnt || [])];

    // ==========================
    // Nhiệt độ Realtime từ Modbus
    // ==========================
    window.Show_UI_Block  = serverData.Show_UI_Block  ?? 0;
    window.Show_UI_Lid    = serverData.Show_UI_Lid    ?? 0;
    window.Setpoint_Block = serverData.Setpoint_Block ?? 0;
    window.Setpoint_Time  = serverData.Setpoint_Time  ?? 0;

    // Cập nhật Sample Temp label luôn (kể cả khi stop)
    const _sampleLabel = document.querySelector(".label-Sample-Temp");
    if (_sampleLabel) _sampleLabel.textContent = `Sample Temp: ${Math.round(window.Show_UI_Block)}°C`;

    // ==========================
    // Trạng thái hệ thống
    // ==========================
    window.System_State = serverData.System_State;

    UpdateProtocolInformation(serverData);

    // History view (xem lịch sử): không cập nhật biểu đồ hay giao diện realtime
    if (window.System?.Option_Status === "view") return;

    if (typeof window.On_PCR_Realtime_Update === "function")
    {
        window.On_PCR_Realtime_Update(serverData);
    }

    // Cập nhật biểu đồ nhiệt mỗi chu kỳ nhận dữ liệu (0.5s)
    // Estimate (xanh) = Setpoint_Block khi đang chạy, = 0 khi stop
    const _estimateVal = (window.System_State === 1) ? (window.Setpoint_Block ?? 0) : 0;
    Update_Chart_Temp(window.Show_UI_Block, _estimateVal);
});


function Load_Runtime_State(runtime = {})
{
    window.Pro_State_Step_Cnt       = runtime.Step_Cnt || 0;
    window.Pro_State_Step_Setpoint  = runtime.Step_Setpoint || 0;
    window.Pro_State_Hold_Start_Cnt =  runtime.Hold_Start_Cnt || 0;
    window.Pro_State_PCR_Loop_Cnt   =  runtime.PCR_Loop_Cnt || 0;
    window.Pro_State_PCR_Loop_Index =  runtime.PCR_Loop_Index || 0;
    window.Pro_State_Hold_End_Cnt   = runtime.Hold_End_Cnt || 0;
    window.Pro_State_Time_Run_Cnt   = runtime.Time_Run_Cnt || 0;
    window.Pro_State_Step_PCR_Cnt   =  [...(runtime.Step_PCR_Cnt || [])];
    window.Pro_State_Cycles_PCR_Cnt =  [...(runtime.Cycles_PCR_Cnt || [])];
}

function UpdateProtocolInformation(data)
{
    const container = document.getElementById("protocolInfoContainer");
    const notificationList = document.getElementById("notificationList");

    if (!container || !notificationList) return;

    let html = "";

    const addItem = (title, value) =>
    {
        if (
            value === undefined ||
            value === null ||
            value === ""
        )
        {
            return;
        }

        html += `
            <div class="info-card">
                <label>${title}</label>
                <span>${value}</span>
            </div>
        `;
    };

    addItem("Protocol Name", data.PROTOCOL_NAME);

    // ==========================
    // Saved Date & Time
    // ==========================
    if (data.Date_Saved || data.Time_Saved)
    {
        addItem(
            "Saved",
            `${data.Date_Saved || "--"} - ${data.Time_Saved || ""}`
        );
    }

    // ==========================
    // Run Date
    // ==========================
    addItem("Run Date", data.Date_Run);

    // ==========================
    // Start & Stop Time
    // ==========================
    if (data.Time_Run_Start || data.Time_Run_Stop)
    {
        addItem(
            "Run Time",
            `${data.Time_Run_Start || "--"} → ${data.Time_Run_Stop || "--"}`
        );
    }

    // ==========================
    // Total Time & Time Estimate
    // ==========================
    addItem("Duration", data.Time_Run_Total);

    // Time Estimate: Chỉ ẩn khi ở màn hình New/Run mà chưa từng bắt đầu chạy
    // Khi đang chạy (System_State 1 hoặc 2) hoặc khi đã chạy xong (đã có Time_Run_Start/Stop/Duration) hoặc chế độ View -> Luôn hiển thị
    const hasStartedOrFinished = (window.System_State === 1 || window.System_State === 2) || !!data.Time_Run_Start || !!data.Time_Run_Stop || !!data.Time_Run_Total || (window.System?.Option_Status === "view");
    if (hasStartedOrFinished) {
        addItem("Time Estimate", data.Time_Estimate || window.Time_Estimate);
    }

    container.innerHTML = html;

    // ==========================
    // Notifications
    // ==========================
    notificationList.innerHTML = "";

    if (
        !data.Notifications ||
        data.Notifications.length === 0
    )
    {
        notificationList.innerHTML = `
            <div class="notification-item notification-empty">
                No notifications
            </div>
        `;
        return;
    }

    data.Notifications.forEach(notification =>
    {
        notificationList.insertAdjacentHTML(
            "beforeend",
            `
            <div class="notification-item">

                <div class="notification-code">
                    ${notification.Error_Code || ""}
                </div>

                <div class="notification-message">
                    ${notification.Message || ""}
                </div>

            </div>
            `
        );
    });
}

function OpenProtocolDrawer()
{
    document.getElementById("protocolDrawer")?.classList.add("show");
    document.getElementById("protocolOverlay")?.classList.add("show");

    document.body.style.overflow = "hidden";
}

function CloseProtocolDrawer()
{
    document.getElementById("protocolDrawer")?.classList.remove("show");
    document.getElementById("protocolOverlay")?.classList.remove("show");

    document.body.style.overflow = "";
}

let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const main = document.getElementById('pcr-main');
    const ov   = document.getElementById('page-loading');
    if (main) main.style.visibility = '';
    if (ov) { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
setTimeout(_reveal, 3000);

function Render_PCR_New()
{
    loadHeader();

    document.addEventListener("headerLoaded", () =>
    {
        _headerReady = true;
        const navbarRight =
            document.querySelector(".navbar-right");

        if (
            navbarRight &&
            !document.getElementById("btnProtocolInfo")
        )
        {
            navbarRight.insertAdjacentHTML(
                "beforeend",
                `
                <button id="btnProtocolInfo"
                        class="header-info-btn">
                    <img src="../../assets/PCR_INFORMATION.png">
                </button>
                `
            );
        }

        if (!document.getElementById("protocolOverlay"))
        {
            document.body.insertAdjacentHTML(
                "beforeend",
                `
                <div id="protocolOverlay"
                     class="protocol-overlay"></div>
                `
            );
        }

        document.getElementById("btnProtocolInfo")?.addEventListener("click", OpenProtocolDrawer);
        document.getElementById("closeDrawer") ?.addEventListener("click", CloseProtocolDrawer);
        document.getElementById("protocolOverlay") ?.addEventListener("click", CloseProtocolDrawer);

        // Override PCR_BG to match dark theme before Render_Tool
        if (window.COLORS) window.COLORS.PCR_BG = 'transparent';

        window.API.send("protocol:new");
        window.API.send("calib:device_read", {});

        window.Render_Chart_Temp();

console.log(
    "[Render Tool]",
    window.System.Option_Status
);

        window.Render_Tool("control-panel-new",  window.System.Option_Status);
        _tryReveal();
    }, { once: true });
}

document.addEventListener("DOMContentLoaded", () =>
{
    // Render_PCR_New();

    const waitSystem = () =>
    {
        if (!window.SystemReady)
        {
            setTimeout(waitSystem, 10);
            return;
        }
        Render_PCR_New(System.Option_Prev);
    };
    waitSystem();
});

window.Render_PCR_New = Render_PCR_New;


// ==========================================================================
// public/PCR/features/PCR_New/pcr_new.js
// Xử lý logic hiển thị và điều phối giao diện thời gian thực (Realtime UI)
// ==========================================================================

// --- 🛠️ KHỞI TẠO CÁC BIẾN LƯU TRẠNG THÁI TRƯỚC ĐÓ (PREV STATE) ---
let block_temp_prev = 0;       
let Time_count_prev = 0;       
let lid_temp_prev = -1;
let cycles_pcr_prev = new Array(4).fill(100);   
let Fist_Reload_Page = true;
let pcr_loop_index_prev = 100; 
let step_setpoint_prev = 100;  
let time_run_prev = 0;         
let state_system_prev = -1; // Mặc định -1 để chu kỳ đầu tiên luôn ép kiểm tra trạng thái máy

function Update_Start_Protocol(serverData)
{
    if (!serverData || !ui_LidTemp) return;

    const runtime = serverData.Runtime_State || {};
    // ===== Realtime Data =====
    const block_temp    = window.Show_UI_Block ?? 0;
    const lid_temp      = Number(serverData.Lid ?? 0);
    const step_setpoint  = Number(runtime.Step_Setpoint ?? 0);
    const pcr_loop_index = Number(runtime.PCR_Loop_Index ?? 0);
    const cycles_pcr     = runtime.Cycles_PCR_Cnt || [];
    const time_run       = Number(runtime.Time_Run_Cnt ?? 0);
    const state_system   = Number(serverData.System_State ?? 0);

    // Ghi nhận Time_Estimate lần đầu tiên khi bắt đầu chạy
    if (state_system === 1 && time_run > 0 && (!window.Time_Estimate || window.Time_Estimate === "00:00:00")) {
        window.Time_Estimate = Format_time_setpoint(time_run);
        if (serverData) serverData.Time_Estimate = window.Time_Estimate;
    }

    // ==========================================================
    // Lid Temp đo thực tế (Show_UI_Lid)
    // ==========================================================
    const lid_measured = window.Show_UI_Lid ?? 0;
    if (!window._lidDebugT || Date.now() - window._lidDebugT > 3000) {
        window._lidDebugT = Date.now();
        //console.log(`[Lid Debug] Show_UI_Lid=${window.Show_UI_Lid} lid_measured=${lid_measured} lid_temp_prev=${lid_temp_prev} ui_LidTemp.value=${ui_LidTemp?.value}`);
    }
    if (lid_measured !== lid_temp_prev)
    {
        ui_LidTemp.value = Math.round(lid_measured);
        lid_temp_prev = lid_measured;
    }

    // Block Temp: cập nhật block_temp_prev để track thay đổi
    block_temp_prev = block_temp;

    // ==========================================================
    // Countdown time của step (Setpoint_Time từ Modbus)
    // ==========================================================
    const step_time = window.Setpoint_Time ?? 0;
    if (step_time !== Time_count_prev && LABEL_TIME_RUNNING?.[step_setpoint])
    {
        LABEL_TIME_RUNNING[step_setpoint].value = Format_time_setpoint(step_time);
        Time_count_prev = step_time;
    }

    // ==========================================================
    // Highlight Step (đổi màu nền + khôi phục step cũ)
    // ==========================================================
    if (step_setpoint !== step_setpoint_prev)
    {
        if (step_setpoint_prev >= 0 && PANEL_STEP_RUNNING?.[step_setpoint_prev])
        {
            PANEL_STEP_RUNNING[step_setpoint_prev].style.background = "#FFFFFF";

            // Khôi phục thời gian cấu hình của step cũ
            if (LABEL_TIME_RUNNING?.[step_setpoint_prev] && serverData.Time?.[step_setpoint_prev] !== undefined)
            {
                LABEL_TIME_RUNNING[step_setpoint_prev].value = Format_time_setpoint(serverData.Time[step_setpoint_prev]);
            }

        }

        if (PANEL_STEP_RUNNING?.[step_setpoint])
        { PANEL_STEP_RUNNING[step_setpoint].style.background = "#F5F34C"; }

        step_setpoint_prev = step_setpoint;
        Time_count_prev = 0; // reset để cập nhật ngay khi vào step mới
    }

    // ==========================================================
    // Cycles PCR
    // ==========================================================
    if (Fist_Reload_Page)
    {
        let _initCount = 0;
        for (let i = 0; i < (window.PCR_LOOP_CNT || 0); i++)
        {
            if (!LABEL_CYCLES_RUNNING?.[i]) continue;
            const current_cycle = (cycles_pcr[i] ?? 0) === 0 ? 1 : cycles_pcr[i];
            LABEL_CYCLES_RUNNING[i].textContent = Format_Cycles_Topic(current_cycle, window.CYCLES_SETPOINT?.[i] ?? 0);
            cycles_pcr_prev[i] = current_cycle;
            _initCount++;
        }
        // Chỉ đánh dấu done khi đã init được ít nhất 1 element — tránh trường hợp render chưa xong
        if (_initCount > 0) Fist_Reload_Page = false;
    }

    if ( pcr_loop_index >= 0 && pcr_loop_index < cycles_pcr.length )
    {
        const current_cycle = (cycles_pcr[pcr_loop_index] ?? 0) === 0 ? 1 : cycles_pcr[pcr_loop_index];
        if ( current_cycle !== cycles_pcr_prev[pcr_loop_index] && LABEL_CYCLES_RUNNING?.[pcr_loop_index])
        {
            LABEL_CYCLES_RUNNING[pcr_loop_index].textContent =
                Format_Cycles_Topic(
                    current_cycle,
                    window.CYCLES_SETPOINT?.[pcr_loop_index] ?? 0
                );

            cycles_pcr_prev[pcr_loop_index] = current_cycle;
        }
    }

    // ==========================================================
    // Tổng thời gian chạy
    // ==========================================================
    if (time_run !== time_run_prev)
    {
        ui_TimeProgram.textContent =
            Format_time_setpoint(time_run, " ");

        time_run_prev = time_run;
    }

    // ==========================================================
    // State Change
    // ==========================================================
    if ( state_system !== state_system_prev ||  state_system_prev === -1 )
    {
        switch (state_system)
        {
            case 1: // RUNNING

                PANEL_STEP_RUNNING?.forEach(p => Lock_Panel(p, true));
                LABEL_TIME_RUNNING?.forEach(p => Lock_Panel(p, true));
                INPUT_CYCLES_RUNNING?.forEach(p => { Lock_Panel(p, true); if (p) p.style.display = 'none'; });

                Lock_Panel(ui_LidTemp, true);
                Lock_Panel(ui_Liquid, true);

                if (ui_BtnBack)   Update_Btn(ui_BtnBack, "../../assets/PCR_BACK_TOOL.png", "BACK", false);
                if (ui_BtnSave)   Update_Btn(ui_BtnSave,   "../../assets/PCR_SAVE_TOOL.png",  "SAVE",    false);
                if (ui_BtnSaveAs) Update_Btn(ui_BtnSaveAs, "../../assets/PCR_SAVE_TOOL.png",  "SAVE AS", false);

                Update_Btn(ui_BtnStart, "../../assets/PCR_STOP_TOOL.png",  "STOP",  true);
                Update_Btn(ui_BtnEdit,  "../../assets/PCR_PAUSE_TOOL.png", "PAUSE", true);
                break;

            case 2: // PAUSE
                // Nếu reload trang trong lúc PAUSE: phải apply UI của RUNNING trước
                if (state_system_prev === -1) {
                    PANEL_STEP_RUNNING?.forEach(p => Lock_Panel(p, true));
                    LABEL_TIME_RUNNING?.forEach(p => Lock_Panel(p, true));
                    INPUT_CYCLES_RUNNING?.forEach(p => { Lock_Panel(p, true); if (p) p.style.display = 'none'; });
                    Lock_Panel(ui_LidTemp, true);
                    Lock_Panel(ui_Liquid, true);
                    if (ui_BtnBack)   Update_Btn(ui_BtnBack,   "../../assets/PCR_BACK_TOOL.png", "BACK",    false);
                    if (ui_BtnSave)   Update_Btn(ui_BtnSave,   "../../assets/PCR_SAVE_TOOL.png", "SAVE",    false);
                    if (ui_BtnSaveAs) Update_Btn(ui_BtnSaveAs, "../../assets/PCR_SAVE_TOOL.png", "SAVE AS", false);
                    Update_Btn(ui_BtnStart, "../../assets/PCR_STOP_TOOL.png", "STOP", true);
                }
                Update_Btn(ui_BtnEdit, "../../assets/PCR_RESUME_TOOL.png", "RESUME", true);
                break;
        }

        state_system_prev = state_system;
    }
}

function Update_Stop_Protocol_Clean(serverData)
{
    const time_run      = window.Pro_State_Time_Run_Cnt || 0; 

    // =========================================================================
    // 🟢 KHÔI PHỤC TOÀN BỘ MÀU NỀN STEP VỀ TRẮNG (Chạy hết tất cả PANEL)
    // =========================================================================
    if (typeof PANEL_STEP_RUNNING !== "undefined" && PANEL_STEP_RUNNING.length > 0) {
        PANEL_STEP_RUNNING.forEach((panel) => {
            if (panel) {
                panel.style.background = "#FFFFFF"; 
            }
        });
    }

    // =========================================================================
    // 🟢 KHÔI PHỤC TOÀN BỘ THỜI GIAN VỀ MẶC ĐỊNH (Chạy hết tất cả LABEL)
    // =========================================================================
    if (typeof LABEL_TIME_RUNNING !== "undefined" && window.TIME_SETPOINT) {
        LABEL_TIME_RUNNING.forEach((label, index) => {
            if (label && window.TIME_SETPOINT[index] !== undefined) {
                label.value = Format_time_setpoint(window.TIME_SETPOINT[index]);
            }
        });
    }

    // Đổi lại nhãn mặc định hiển thị cho các Stage PCR và hiện lại ô nhập liệu chu kỳ
    for(let i = 0; i < window.PCR_LOOP_CNT; i++) 
    {
        if(LABEL_CYCLES_RUNNING[i] != null) {
            LABEL_CYCLES_RUNNING[i].textContent = "PCR Stage   cycles ";
            INPUT_CYCLES_RUNNING[i].style.display = "inline-block"; 
        }     
    }
    
    // Trả lại giá trị nhiệt độ nắp và bộ đếm tổng thời gian về mặc định ban đầu
    ui_LidTemp.value = window.Pro_Conf_Lid || 0;  
    if(ui_TimeProgram)
    { ui_TimeProgram.textContent = "00 : 00 : 00"; }

    // Mở khóa (Unlock) toàn bộ giao diện cho phép người dùng chỉnh sửa thông số mới
    PANEL_STEP_RUNNING.forEach(p => Lock_Panel(p, false));
    LABEL_TIME_RUNNING.forEach(p => Lock_Panel(p, false));
    INPUT_CYCLES_RUNNING.forEach(p => Lock_Panel(p, false));
    Lock_Panel(ui_LidTemp, false);
    Lock_Panel(ui_Liquid,  false);

    // Chuyển tập hợp nút bấm công cụ quay về trạng thái chuẩn bị chạy (START)
    if(ui_BtnStart)
    {Update_Btn(ui_BtnStart, "../../assets/PCR_START_TOOL.png", "START",   true);}
    if( ui_BtnEdit)
    {Update_Btn(ui_BtnEdit,  "../../assets/PCR_EDIT_TOOL.png",  "EDIT" ,   true);}
    if(ui_BtnSave )
    {Update_Btn(ui_BtnSave,  "../../assets/PCR_SAVE_TOOL.png",  "SAVE" ,   true);}
    if(ui_BtnSaveAs)
    {Update_Btn(ui_BtnSaveAs, "../../assets/PCR_SAVE_TOOL.png",  "SAVE AS", true);}
    if (ui_BtnBack) Update_Btn(ui_BtnBack, "../../assets/PCR_BACK_TOOL.png", "BACK", true);

    // Kích hoạt Pop-up báo cáo tổng thời gian hoàn thành chương trình
    const totalTimeStr = (window.Time_Run_Total || "00:00:00").replace(/:/g, " : ");
    Show_Notification(`Complete Program!<br>Total time run: ${totalTimeStr}`, "Cancel");

    // --- RESET HOÀN TOÀN CÁC BIẾN PREV ĐỂ SẴN SÀNG CHO LƯỢT CHẠY TIẾP THEO ---
    block_temp_prev = 0;
    Time_count_prev = 0;
    lid_temp_prev   = -1;  // -1 để lần đầu vào RUN luôn update dù Show_UI_Lid = 0
    cycles_pcr_prev  = new Array(4).fill(100);
    Fist_Reload_Page = true;
    pcr_loop_index_prev = 100;
    step_setpoint_prev  = 100;
    time_run_prev       = 0;
    _applyRoleMode();
}

// --- 🔀 HÀM 3: BỘ ĐIỀU PHỐI TRUNG TÂM (CHỈ CHẠY TỰ ĐỘNG KHI CÓ DATA MỚI) ---

function PCR_New_UI_Dispatcher(serverData)
{
    const current_state = window.System_State;

    // ── Xử lý Error Flags ──────────────────────────────────────────────
    const errSensor  = serverData.Flag_Error_Sensor  ?? 0;
    const errPower   = serverData.Flag_Error_Power   ?? 0;
    const errTimeout = serverData.Flag_Error_Timeout ?? 0;
    const errMemory  = serverData.Flag_Error_Memory  ?? 0;
    const hasError   = !!(errSensor || errPower || errTimeout || errMemory);

    if (ui_BtnStart && current_state !== 1)
    {
        ui_BtnStart.disabled = hasError;
    }
    // ── Dispatch trạng thái chạy ────────────────────────────────────────
    if (current_state === 0)
    {
        // Chỉ trigger UI stop khi thực sự có sự chuyển đổi từ đang chạy → stop.
        // state_system_prev === -1 nghĩa là lần đầu load trang → không hiện notification.
        if (state_system_prev !== 0 && state_system_prev !== -1)
        {
            Update_Stop_Protocol_Clean(serverData);
        }

        state_system_prev = 0;
    }
    else
    {
        Update_Start_Protocol(serverData);
    }
}

// --- 🌐 ĐĂNG KÝ HÀM ĐIỀU PHỐI VÀO GLOBAL WINDOW ĐỂ CORE_ENGINE TỰ ĐỘNG GỌI NGƯỢC ---
window.On_PCR_Realtime_Update  = PCR_New_UI_Dispatcher;
window.On_System_Run_Start = () => Reset_Chart_Before_Run(10);





//============== Các hàm xử lý giao diện ===============//
function Lock_Panel(panel, lock)
{
    if(!panel) return;

    panel.style.pointerEvents = lock ? "none" : "auto";
}

function Update_Btn(btn, imgSrc, text, enabled = true) {
    // Gán nội dung nút bằng ảnh + text
    btn.innerHTML = `<img src="${imgSrc}" style="width:16px; height:16px;"> ${text}`;

    // Bật/tắt nút
    btn.disabled = !enabled;

    if (enabled)
    {
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
    else
    {
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
    }
}

// =========================================================================
// SUBSCRIBE KẾT QUẢ SAVE / SAVE AS TỪ SERVER
// =========================================================================
subscribe("protocol:save_result", (res) =>
{
    if (res.success)
    {
        window.Notifications = [];
        Show_Notification("Protocol saved successfully!", "Cancel");
    }
    else
    {
        Show_Notification(`Save failed: ${res.message || "Unknown error"}`, "Cancel");
    }
});

subscribe("protocol:save_as_result", (res) =>
{
    if (!res.success && res.name_taken_today)
    {
        window._pendingSaveAs = null;
        Show_Notification(`"${res.existingName}" is already used today.\nPlease choose a different name.`, "Cancel");
    }
    else if (res.success)
    {
        window.PROTOCOL_NAME = res.PROTOCOL_NAME;
        window.Date_Saved    = res.Date_Saved;
        window.Time_Saved    = res.Time_Saved;
        if (window.ui_LBNameProtocol)
        {
            window.ui_LBNameProtocol.textContent = `Protocol Name: ${res.PROTOCOL_NAME}`;
        }
        window.Notifications = [];
        window._pendingSaveAs = null;
        Show_Notification("Protocol saved!", "Cancel");
    }
    else
    {
        Show_Notification(`Save As failed: ${res.message || "Unknown error"}`, "Cancel");
    }
});