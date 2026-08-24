const fs   = require("fs");
const path = require("path");

// ======================================================
// FILE CURRENT RUN
// ======================================================
const CURRENT_RUN_FILE = path.join(__dirname,"current_run.json");
const DEFAULT_PROTOCOL_FILE = path.join(__dirname, "..", "..", "..", "PCR", "Config", "default_protocol.json"); 
// ======================================================
// RAM - MIRROR JSON 100%
// ======================================================
let Current_Run = {
    PagePath_Status: "",
    Tab_Status:      "",
    Option_Status:   "",

    System_State: 0,
    Show_UI_Block: 0,
    Show_UI_Lid: 0,
    PROTOCOL_NAME: "",
    Date_Saved: "",
    Time_Saved: "",

    Date_Run: "",
    Time_Run_Start: "",
    Time_Run_Stop: "",
    Time_Run_Total: "",
    Time_Estimate: "",
    Run_Start_Timestamp: 0,

    Block: [],
    Time: [],

    Lid: 0,
    Liquid: 0,

    Hold_Start: 0,
    PCR_Loop: 0,
    Hold_End: 0,

    Step_PCR: [],
    Cycles_PCR: [],

    Notifications: [],

    Target_Temperature_Array: [],
    Measured_Temperature_Array: [],


    Runtime_State: {
        Step_Setpoint: 0,
        Step_Cnt: 0,

        Hold_Start_Cnt: 0,

        PCR_Loop_Cnt: 0,
        PCR_Loop_Index: 0,

        Step_PCR_Cnt: [],
        Cycles_PCR_Cnt: [],

        Hold_End_Cnt: 0,

        Time_Run_Start: 0,
        Time_Run_Cnt: 0,
        Time_Run_Done: 0
    }
};

// LOAD JSON → RAM
function LoadRuntime()
{
    try
    {
        if (!fs.existsSync(CURRENT_RUN_FILE))
            return;

        const data = JSON.parse( fs.readFileSync(CURRENT_RUN_FILE, "utf8"));

        Current_Run = {
            ...Current_Run,
            ...data,

            Runtime_State: {
                ...Current_Run.Runtime_State,
                ...(data.Runtime_State || {})
            }
        };
    }
    catch (err)
    {
        console.error("[Runtime Load Error]", err);
    }
}

//UPDATE MODBUS → RAM (PHẦN QUAN TRỌNG)

function UpdateRuntime(modbus)
{
    const r = Current_Run.Runtime_State;

    if (modbus.Step_Setpoint  !== undefined) r.Step_Setpoint  = modbus.Step_Setpoint;
    if (modbus.Step_Cnt       !== undefined) r.Step_Cnt       = modbus.Step_Cnt;

    if (modbus.Hold_Start_Cnt !== undefined) r.Hold_Start_Cnt = modbus.Hold_Start_Cnt;

    if (modbus.PCR_Loop_Cnt   !== undefined) r.PCR_Loop_Cnt   = modbus.PCR_Loop_Cnt;
    if (modbus.PCR_Loop_Index !== undefined) r.PCR_Loop_Index = modbus.PCR_Loop_Index;

    if (Array.isArray(modbus.Step_PCR_Cnt))   r.Step_PCR_Cnt   = modbus.Step_PCR_Cnt;
    if (Array.isArray(modbus.Cycles_PCR_Cnt)) r.Cycles_PCR_Cnt = modbus.Cycles_PCR_Cnt;

    if (modbus.Hold_End_Cnt   !== undefined) r.Hold_End_Cnt   = modbus.Hold_End_Cnt;

    if (modbus.Time_Run_Start !== undefined) r.Time_Run_Start = modbus.Time_Run_Start;
    if (modbus.Time_Run_Cnt   !== undefined) {
        r.Time_Run_Cnt = modbus.Time_Run_Cnt;
        // Time estimate là giá trị Time_Run_Cnt nhận được lần đầu tiên khi bắt đầu chạy
        if (Current_Run.System_State === 1 && !Current_Run.Time_Estimate && modbus.Time_Run_Cnt > 0) {
            const h = Math.floor(modbus.Time_Run_Cnt / 3600);
            const m = Math.floor((modbus.Time_Run_Cnt % 3600) / 60);
            const s = modbus.Time_Run_Cnt % 60;
            Current_Run.Time_Estimate = [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
        }
    }
    if (modbus.Time_Run_Done  !== undefined) r.Time_Run_Done  = modbus.Time_Run_Done;
}

function GetRuntime()
{
    return Current_Run;
}

function SaveRuntime() // Hàm lưu dữ liệu hiện tại
{
    fs.writeFileSync(CURRENT_RUN_FILE,JSON.stringify(Current_Run, null, 2));
}

function LoadDefaultProtocol()
{
    try
    {
        if (!fs.existsSync(DEFAULT_PROTOCOL_FILE))
        {
            console.error("[Runtime] Default protocol not found");
            return;
        }
        const data = JSON.parse(fs.readFileSync(DEFAULT_PROTOCOL_FILE, "utf8"));
        // ==================================================
        // 🔥 MAP 1:1 từ default_protocol.json
        // ==================================================
        Current_Run = {
            ...Current_Run,

            PROTOCOL_NAME: data.PROTOCOL_NAME || "none",

            Block: data.Block || [],
            Time: data.Time || [],

            Lid: data.Lid || 0,
            Liquid: data.Liquid || 0,

            Hold_Start: data.Hold_Start || 0,
            PCR_Loop: data.PCR_Loop || 0,
            Hold_End: data.Hold_End || 0,

            Step_PCR: data.Step_PCR || [],
            Cycles_PCR: data.Cycles_PCR || [],

            // ==================================================
            // 🔥 RESET RUN STATUS
            // ==================================================
            Run_Status: "NEW",

            Date_Saved: "",
            Time_Saved: "",

            Date_Run: "",
            Time_Run_Start: "",
            Time_Run_Stop: "",
            Time_Run_Total: "",
            Time_Estimate: "",
            Run_Start_Timestamp: 0,

            Notifications: [],
            Target_Temperature_Array: [],
            Measured_Temperature_Array: [],

            // ==================================================
            // 🔥 RESET RUNTIME STATE (MODBUS)
            // ==================================================
            Runtime_State: {
                Step_Setpoint: 0,
                Step_Cnt: 0,

                Hold_Start_Cnt: 0,

                PCR_Loop_Cnt: 0,
                PCR_Loop_Index: 0,

                Step_PCR_Cnt: new Array(data.PCR_Loop || 0).fill(0),
                Cycles_PCR_Cnt: new Array(data.PCR_Loop || 0).fill(0),

                Hold_End_Cnt: 0,

                Time_Run_Start: 0,
                Time_Run_Cnt: 0,
                Time_Run_Done: 0
            }
        };

        // console.log(Current_Run);
        // console.log("[Runtime] Default protocol loaded:", data.PROTOCOL_NAME);
    }
    catch (err)
    {
        console.error("[Runtime LoadDefaultProtocol Error]", err);
    }
}

function SetRuntime(data)
{
    Current_Run = {
        ...Current_Run,
        ...data,

        Runtime_State:
        {
            ...Current_Run.Runtime_State,
            ...(data.Runtime_State || {})
        }
    };
}

// Auto-load persisted state when module is first required
LoadRuntime();

module.exports = {
    LoadRuntime,
    UpdateRuntime,
    SetRuntime,
    GetRuntime,
    SaveRuntime,
    LoadDefaultProtocol,
};