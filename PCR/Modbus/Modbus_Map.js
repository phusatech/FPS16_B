const
{
    TEMP_TIME_SETPOINT_NUM,
    PCR_LOOP,
    TEMP_SENSOR
} = require('./Modbus_Constants');

module.exports =
{
    input:
    {
        Show_UI_Block: { address: 1, type: "float", length: 1 },
        Show_UI_Lid:   { address: 3, type: "float", length: 1 },

        Measure_Heatsink: { address: 5, type: "float", length: 1 },
        Measure_Lid:      { address: 7, type: "float", length: 1 },
        Measure_Pel1:     { address: 9, type: "float", length: 1 },
        Measure_Pel2:     { address: 11, type: "float", length: 1 },
        Measure_Pel3:     { address: 13, type: "float", length: 1 },
        Measure_Card1:    { address: 15, type: "float", length: 1 },
        Measure_Card2:    { address: 17, type: "float", length: 1 },
        Measure_Card3:    { address: 19, type: "float", length: 1 },

        Vbuck_Pel1: { address: 21, type: "float", length: 1 },
        Vbuck_Pel2: { address: 23, type: "float", length: 1 },
        Vbuck_Pel3: { address: 25, type: "float", length: 1 },
        Vbuck_Fan:  { address: 27, type: "float", length: 1 },

        Setpoint_Block: { address: 29, type: "float", length: 1 },
        Setpoint_Time:  { address: 31, type: "float", length: 1 },
        Setpoint_Lid:   { address: 33, type: "float", length: 1 },

        Fan_State:     { address: 35, type: "u8", length: 1 },
        Control_State: { address: 36, type: "u8", length: 1 },

        Pro_State_Step_Cnt:      { address: 37, type: "u8", length: 1 },
        Pro_State_Step_Setpoint: { address: 38, type: "u8", length: 1 },

        Pro_State_Hold_Start_Cnt: { address: 39, type: "u8", length: 1 },
        Pro_State_PCR_Loop_Cnt:   { address: 40, type: "u8", length: 1 },

        Pro_State_PCR_Loop_Index: { address: 41, type: "u8", length: 1 },
        Pro_State_Hold_End_Cnt:   { address: 42, type: "u8", length: 1 },

        Pro_State_Time_Run_Cnt:  { address: 43, type: "u16", length: 1 },
        Pro_State_Time_Run_Done: { address: 44, type: "u16", length: 1 },

        Pro_State_Step_PCR_Cnt:   { address: 45, type: "u8", length: PCR_LOOP },
        Pro_State_Cycles_PCR_Cnt: { address: 49, type: "u8", length: PCR_LOOP },

        // Kết quả lưu calib vào flash (30054 = offset 53)
        // 0 = IDLE, 1 = OK, 2 = FAIL — slave cập nhật sau mỗi lần nhận lệnh WRITE_CALIB
        Calib_Save_Status: { address: 53, type: "u8", length: 1 }
    },

    holding:
    {
        // ── Calib block (addresses 1-43, written by WRITE_CALIB command) ──
        // Offset layout matches packAndWriteCalib in Modbus_Package.js
        Calib_HeatSink_Threshold: { address: 1, type: "float", length: 1 },  // [1-2]
        Calib_Block_Threshold:    { address: 3, type: "float", length: 1 },  // [3-4]

        Calib_Fan_Speed_Hi_Threshold:  { address: 5, type: "u8", length: 1 }, // [5]
        Calib_Fan_Speed_Med_Threshold: { address: 6, type: "u8", length: 1 }, // [6]
        Calib_Fan_Speed_Lo_Threshold:  { address: 7, type: "u8", length: 1 }, // [7]
        Calib_Fan_Cool_Down_Time:      { address: 8, type: "u8", length: 1 }, // [8]

        Calib_Temp_Hi_Measure: { address: 9,  type: "float", length: TEMP_SENSOR }, // [9-18]
        Calib_Temp_Lo_Measure: { address: 19, type: "float", length: TEMP_SENSOR }, // [19-28]

        Calib_Heating_Val: { address: 29, type: "float", length: 1 },        // [29-30]
        Calib_Cooling_Val: { address: 31, type: "float", length: 1 },        // [31-32]

        Calib_Hold_Time_Adjust_Factor_Normal: { address: 33, type: "float", length: 1 }, // [33-34]
        Calib_Hold_Time_Adjust_Factor_First:  { address: 35, type: "float", length: 1 }, // [35-36]

        Calib_Lid_Control_Max_Val:   { address: 37, type: "u8", length: 1 }, // [37]
        Calib_Block_Control_Max_Val: { address: 38, type: "u8", length: 1 }, // [38]
        Calib_Control_Timeout:       { address: 39, type: "u8", length: 1 }, // [39]

        Calib_Heating_Speed: { address: 40, type: "float", length: 1 },      // [40-41]
        Calib_Cooling_Speed: { address: 42, type: "float", length: 1 },      // [42-43]

        System_State:     { address: 44, type: "u8", length: 1 },
        System_Debug_LOG: { address: 45, type: "u8", length: 1 },
        System_Simulate:  { address: 46, type: "u8", length: 1 },
        System_Device:    { address: 47, type: "u8", length: 1 },

        ProConf_Block: { address: 48,  type: "float", length: TEMP_TIME_SETPOINT_NUM },
        ProConf_Time:  { address: 108, type: "float", length: TEMP_TIME_SETPOINT_NUM },

        ProConf_Lid: { address: 168, type: "float", length: 1 },

        ProConf_Liquid:     { address: 170, type: "u8", length: 1 },
        ProConf_Hold_Start: { address: 171, type: "u8", length: 1 },
        ProConf_PCR_Loop:   { address: 172, type: "u8", length: 1 },
        ProConf_Hold_End:   { address: 173, type: "u8", length: 1 },

        ProConf_Step_PCR:   { address: 174, type: "u8", length: PCR_LOOP },
        ProConf_Cycles_PCR: { address: 178, type: "u8", length: PCR_LOOP },

        Flag_Error_Timeout: { address: 182, type: "u8", length: 1 },
        Flag_Error_Sensor:  { address: 183, type: "u8", length: 1 },
        Flag_Error_Power:   { address: 184, type: "u8", length: 1 },
        Flag_Error_Memory:  { address: 185, type: "u8", length: 1 }
    }
};