//*================================ CẤU HÌNH THÔNG SỐ PROTOCOL ========================================*//
let System = 
{
    lidTemp: 30,          // Nhiệt độ đo đượck
    BlockTemp: 30,
    Tab_Prev: "",
    Request_Data: "",
    History_Position: Number(localStorage.getItem("History_Position")) || 0,
};

//*================================ CẤU HÌNH BIỂU ĐỒ NHIỆT ========================================*//
const Chart_Buf_Size   = 8000;
let Chart_Buf = new Array(Chart_Buf_Size).fill(0);
let Chart_Estimate_Buf = new Array(Chart_Buf_Size).fill(0);
//*================================================================================================*//

// ========================= Ngưỡng nhiệt độ và thời gian =========================
const TEMP_MIN_THRESOLD    = 25;
const TEMP_MAX_THRESOLD    = 100;
const TIME_MAX_HOUR        = 2;
const TIME_MAX_MINUTE      = 59;
const TIME_MAX_SECOND      = 59;
const CYCLES_MAX_THRESOLD  = 100;

// ========================= Quản lý bước nhiệt =========================
const TEMP_TIME_SETPOINT_NUM = 30;
const STEP_HOLD_START        = 2;
const PCR_LOOP               = 4;
const STEP_PCR               = 4;
const STEP_HOLD_END          = 4;
const STEP_HOLD_MIN          = 1;
// ========================= Nhiệt độ nắp =========================
const LID_TEMP_MIN = 50;
const LID_TEMP_MAX = 105;
const LID_THRESOLD = [30, 40, 50];

const SystemState = {
    System_Stop: 0,
    System_Start: 1,
    System_Pause: 2,
    System_Auto: 3
};

// public/PCR/shared/Data_config.js
const savedSystem = localStorage.getItem("PCR_System_Config");

window.System = savedSystem ? JSON.parse(savedSystem) : {
    Tab_Prev: "",
    Option_Prev: "new" 
};

// Tự động lưu cấu hình khi tắt/F5 trang
window.addEventListener("beforeunload", () => 
{
    localStorage.setItem("PCR_System_Config", JSON.stringify(window.System));
});



// public/pcr-app/shared/Data_config.js

// ===== 1. Cấu hình ngưỡng giới hạn (Thresholds) =====
window.TEMP_MIN_THRESOLD  = 25;
window.TEMP_MAX_THRESOLD  = 100;
window.CYCLES_MAX_THRESOLD = 100;

window.TIME_MAX_HOUR      =  2;
window.TIME_MAX_MINUTE    = 59;
window.TIME_MAX_SECOND    = 59;

// ===== 2. Khai báo các biến cấu hình số lượng (Nếu chưa có thì lấy mặc định) =====
window.STEP_HOLD_START = window.STEP_HOLD_START || 1;
window.PCR_LOOP        = window.PCR_LOOP        || 1;
window.STEP_PCR        = window.STEP_PCR        || 3;
window.STEP_HOLD_END   = window.STEP_HOLD_END   || 1;


//======================= Các thông số chính để Render Protocol ===============================//
window.PROTOCOL_NAME    = window.PROTOCOL_NAME || "Untitled";
window.TEMP_TIME_SETPOINT_NUM = window.TEMP_TIME_SETPOINT_NUM || 30;

window.BLOCK_SETPOINT = window.BLOCK_SETPOINT || [new Array(window.BLOCK_SETPOINT).fill(25)] // Mặc định 25°C
window.TIME_SETPOINT  = window.TIME_SETPOINT  || [new Array(window.TIME_SETPOINT).fill(0)]
window.LID_SETPOINT     = 80; // Nhiệt độ nắp
window.LIQUID_SETPOINT  = 30; // Dung dịch
window.HOLD_START_CNT   = window.HOLD_START_CNT  || 1;
window.PCR_LOOP_CNT     = window.PCR_LOOP_CNT    || 1;
window.STEP_PCR_CNT     = window.STEP_PCR_CNT    || [3]; // Mảng chứa số step trong mỗi loop
window.CYCLES_SETPOINT  = window.CYCLES_SETPOINT || [30]; // Mảng chứa số cycle của mỗi loop
//============================================================================================//

// ===== 4. Khai báo mảng chứa các đối tượng quản lý giao diện đệm =====
window.STEP_HOLD_START_BUF  = new Array(window.STEP_HOLD_START).fill(null);
window.PCR_LOOP_BUF         = Array.from({ length: window.PCR_LOOP }, () => new Array(2).fill(null));
window.STEP_PCR_BUF         = Array.from({ length: window.PCR_LOOP }, () => new Array(window.STEP_PCR).fill(null));
window.STEP_HOLD_END_BUF    = new Array(window.STEP_HOLD_END).fill(null);

window.PANEL_STEP_RUNNING   = new Array(window.TEMP_TIME_SETPOINT_NUM).fill(null);
window.LABEL_TIME_RUNNING   = new Array(window.TEMP_TIME_SETPOINT_NUM).fill(null);
window.LABEL_CYCLES_RUNNING = new Array(window.PCR_LOOP).fill(null);
window.INPUT_CYCLES_RUNNING = new Array(window.PCR_LOOP).fill(null);

// ===== 5. Khai báo các đối tượng UI điều khiển trực tiếp =====
window.ui_LidTemp         = null;
window.ui_Liquid          = null;
window.ui_BtnStart        = null;
window.ui_BtnEdit         = null;
window.ui_BtnSave         = null;
window.ui_BtnSaveAs       = null;
window.ui_TimeProgram     = null;
window.ui_BtnBack         = null;
window.ui_BtnOpen         = null;
window.ui_BtnDelete       = null;

window.ui_LBNameProtocol  = null;
window.ui_savedList       = null;
window.ui_PnlSaved        = null;
window.ui_LBSavedTitle    = null;
window.ui_PnlPreview      = null;
window.ui_LBPreviewTitle  = null;
window.ui_LBPreview       = null;

// ===== 6. Biến trạng thái xử lý sự kiện tĩnh =====
window.Position_Click     = null;
window.Tab_prev           = "pcr_menu";
window.PASS_ADMIN         = window.PASS_ADMIN || "1234"; // Mật khẩu quản trị mặc định


window.COLORS = window.COLORS || {
  // ===== TEXT =====
  MENU_TITLE: "#2B2F36",          // xám đậm (giống Saved protocol)

  // ===== BACKGROUND =====
  PCR_Tile_Info: "#8a99a7",       // nền header (xám trắng)
  PCR_Tile_Step: "#c5ccd4",       // header step (xám xanh rất nhẹ)
  PCR_Step: "#FAFBFC",            // nền bảng (trắng xám)

  // ===== STEP CELL =====
  PCR_Step_Cell: "#FFFFFF",       // cell trắng
  PCR_Step_Border: "#2B2F36",     // border xám nhẹ (giống table list)

  // ===== LINE =====
  PCR_Line: "#ff0000",            // xám xanh trung tính (không xanh lab nữa)

  // ===== ACCENT =====
  PCR_Accent: "#6B7280",           // highlight nhẹ (hover / selection)
  PCR_BG: "#eff8ff",            // xám xanh trung tính (không xanh lab nữa)
};

window.FONT = window.FONT || {
  DATA:  "16px", // màu nền top container
  TITLE: "18px", // màu nền top container
};