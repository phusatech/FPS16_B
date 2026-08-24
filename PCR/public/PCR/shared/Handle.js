
async function Click_Btn_Back(func) {
   console.log(func);
    if (func === "new")
    {
        goToPage("PCR/features/PCR_Base/pcr_base.html", "base","new");
    }
    else if (func === "saved")
    {
        goToPage("PCR/features/PCR_Saved/pcr_saved.html","saved","none");
    }
    else if (func === "history" || func === "view")
    {
        goToPage( "PCR/features/PCR_History/pcr_history.html","history","none");
    }
}

async function Click_Btn_Start(Btn_Name) // Người dùng nhấn nút Start
{
    if(Btn_Name == "START") //Khi nhấn 
    {
      const confirmed = await Show_Notification("Have you put the sample in yet?", "Start_Confirm"); // Hỏi
      if (!confirmed) 
        return;
      
        // Đóng gói dữ liệu gửi xuống server
        const protocolConfig = {
            PROTOCOL_NAME:      window.PROTOCOL_NAME   || "",
            ProConf_Block:      window.BLOCK_SETPOINT, 
            ProConf_Time:       window.TIME_SETPOINT, 
            ProConf_Lid:        window.LID_SETPOINT    ||  60, // float    
            ProConf_Liquid:     window.LIQUID_SETPOINT ||  40, // u8       
            ProConf_Hold_Start: window.HOLD_START_CNT  ||   1, // u8
            ProConf_PCR_Loop:   window.PCR_LOOP_CNT    ||   1, // u8
            ProConf_Hold_End:   window.HOLD_END_CNT    ||   1, // u8          
            ProConf_Step_PCR:   window.STEP_PCR_CNT    || [ 2, 2, 2, 2],    
            ProConf_Cycles_PCR: window.CYCLES_SETPOINT || [30, 30, 30, 30] 
        };

        if (window.API && typeof window.API.send === "function")
        {
            if (typeof window.On_System_Run_Start === "function")
                window.On_System_Run_Start();

            window.API.send("system_run", protocolConfig);
        }
   }
   
    else if( Btn_Name == "STOP")
    {
      const confirmed = await Show_Notification("The system will stop!", "Yes_No"); // Hỏi
      if (!confirmed) 
        return;

       window.API.send("system_stop");
    }
}

async function Click_Btn_Edit(Btn_Name)
{
    if (Btn_Name == "PAUSE")
    {
        const confirmed = await Show_Notification("The system will pause!", "Yes_No");
        if (!confirmed) return;

        if (window.API && typeof window.API.send === "function")
            window.API.send("system_pause");
    }
    else if (Btn_Name == "RESUME")
    {
        const confirmed = await Show_Notification("The system will resume!", "Yes_No");
        if (!confirmed) return;

        if (window.API && typeof window.API.send === "function")
            window.API.send("system_resume");
    }
    else if( Btn_Name === "EDIT")
    {
      showProgram({
          title: "Edit PCR Program",
          data: 
          {
              HOLD_START_CNT:  HOLD_START_CNT,
              PCR_LOOP_CNT:    PCR_LOOP_CNT,
              STEP_PCR_CNT:    STEP_PCR_CNT,
              HOLD_END_CNT:    HOLD_END_CNT,
              CYCLES_PCR_CNT:  CYCLES_SETPOINT
          },
          onSave: (newData) => // khi nhấn lưu
          {
              //============== Phần Hold Start=========================
              Hold_Start_Diff = newData.HOLD_START_CNT - HOLD_START_CNT; //cái mới trừ cái cũ
              if(Hold_Start_Diff > 0) 
              {
                Modify_Step("insert", HOLD_START_CNT, Hold_Start_Diff);
              }
              else if(Hold_Start_Diff < 0)
              {
                Modify_Step("delete", newData.HOLD_START_CNT, Hold_Start_Diff * -1); // Xóa xóa bắt đầu từ vị trí mới
              }

              HOLD_START_CNT = newData.HOLD_START_CNT; // Cập nhật lại đúng số
              //============== Phần Hold Start=========================
              
              
              //============== Phần PCR ==========================
              let oldPCR_LOOP_CNT = PCR_LOOP_CNT;

              if (newData.PCR_LOOP_CNT > oldPCR_LOOP_CNT) 
              {
                  // Tổng step của các stage cũ
                  let Step_PCR_Total = STEP_PCR_CNT.slice(0, oldPCR_LOOP_CNT).reduce((a,b)=>a+b,0);
                  for (let i = oldPCR_LOOP_CNT; i < newData.PCR_LOOP_CNT; i++) 
                  {
                      let steps = newData.STEP_PCR_CNT[i] || 2;                
                      newData.CYCLES_PCR_CNT[i] = 30;
                      Modify_Step("insert", HOLD_START_CNT + Step_PCR_Total, steps);
                      Step_PCR_Total += steps;
                  }
              } 
              else if (newData.PCR_LOOP_CNT < oldPCR_LOOP_CNT) 
              {
                  // Xóa step của các stage bị loại bỏ
                  let startIndex = HOLD_START_CNT + STEP_PCR_CNT.slice(0, newData.PCR_LOOP_CNT).reduce((a,b)=>a+b,0);
                  let stepsToDelete = STEP_PCR_CNT.slice(newData.PCR_LOOP_CNT, oldPCR_LOOP_CNT).reduce((a,b)=>a+b,0);
                  Modify_Step("delete", startIndex, stepsToDelete);
              }
              //============== Cập nhật mảng STEP_PCR_CNT ==================


              //============== Update STEP_PCR_CNT từng PCR loop ==================              
              let stepOffset = 0;

              for (let i = 0; i < PCR_LOOP_CNT; i++)
              {
                  let oldStep = STEP_PCR_CNT[i];
                  let newStep = newData.STEP_PCR_CNT[i];
                  let diff    = newStep - oldStep;

                  let baseIndex = HOLD_START_CNT + stepOffset;
                  // console.log("Loop", i, "BaseIndex:", baseIndex);

                  if (diff > 0)
                  {
                      // thêm step vào cuối loop cũ
                      Modify_Step("insert", baseIndex + oldStep, diff);
                      //console.log("Thêm step", baseIndex + oldStep);
                  }
                  else if (diff < 0)
                  {
                      // xóa step từ cuối loop cũ
                      Modify_Step("delete", baseIndex + newStep, -diff);
                  }

                  stepOffset += newStep;
              }
              STEP_PCR_CNT = [...newData.STEP_PCR_CNT];

              //console.log(Temp_Time_Setpoint);
              //==================================================================

              //============== Phần Hold End ==========================
              let Hold_End_Diff = newData.HOLD_END_CNT - HOLD_END_CNT;
              if (Hold_End_Diff > 0) 
              {
                  Modify_Step("insert", HOLD_START_CNT + STEP_PCR_CNT.reduce((a,b)=>a+b,0) + HOLD_END_CNT, Hold_End_Diff);
              } 
              else if (Hold_End_Diff < 0) 
              {
                  Modify_Step("delete", HOLD_START_CNT + STEP_PCR_CNT.reduce((a,b)=>a+b,0) + newData.HOLD_END_CNT, -Hold_End_Diff);
              }
              HOLD_END_CNT = newData.HOLD_END_CNT;

              //============== Phần PCR ===========================

              // Cập nhật lại các biến toàn cục
              HOLD_START_CNT = newData.HOLD_START_CNT;
              PCR_LOOP_CNT   = newData.PCR_LOOP_CNT;
              STEP_PCR_CNT   = newData.STEP_PCR_CNT;
              HOLD_END_CNT   = newData.HOLD_END_CNT;
              Render_PCR_Program(); // Render lại giao diện Program
              _save_protocol_draft();
          }
      });
    }
}

//                   vị trí chức năng thêm hoặc xóa
function Modify_Step(mode, index, count = 1, temp = 60, time = 60) {
  if (mode === "insert") {
    BLOCK_SETPOINT.splice(index, 0, ...Array(count).fill(temp));  
    TIME_SETPOINT.splice(index, 0, ...Array(count).fill(time));
  }
  else if (mode === "delete") {
    BLOCK_SETPOINT.splice(index, count);
    TIME_SETPOINT.splice(index, count);
  }
}

// Debounced: gửi thông số đang chỉnh lên server để F5 không mất dữ liệu
let _draftTimer = null;
function _save_protocol_draft() {
    clearTimeout(_draftTimer);
    _draftTimer = setTimeout(() => {
        if (!window.API || typeof window.API.send !== "function") return;
        window.API.send("protocol:update_draft", {
            Block:        window.BLOCK_SETPOINT,
            Time:         window.TIME_SETPOINT,
            Lid:          window.LID_SETPOINT,
            Liquid:       window.LIQUID_SETPOINT,
            Hold_Start:   window.HOLD_START_CNT,
            PCR_Loop:     window.PCR_LOOP_CNT,
            Hold_End:     window.HOLD_END_CNT,
            Step_PCR:     window.STEP_PCR_CNT,
            Cycles_PCR:   window.CYCLES_SETPOINT,
        });
    }, 500);
}



// async function Click_Btn_Open(index, tab ,option) 
// {
//   const info = Info_Saved[index];
//   const setpoint = Setpoint_Saved[index];
//   const name = Extract_Name_From_Info(info);

//   if(tab === "history")
//   {  
//     System.History_Position = index; 
//     localStorage.setItem("History_Position", System.History_Position);
//   }
//   else
//   {
//     System.History_Position = 100; 
//     localStorage.setItem("History_Position", System.History_Position);
//   }

//   Create_Data_Saved_Protocol(info, setpoint, name); // Tạo data theo weblocal
//   DATA_TX_LENGHT = Pack_Protocol(DATA_TX);
//   Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVED_UI, DATA_TX, DATA_TX_LENGHT, "Web_PCR");   
//   goToPage("PCR/PCR_New/pcr_new.html", tab, option);
// }

// async function Click_Btn_Delete(index) 
// {
//   let name = null;
//   name = Extract_Name_From_Info(Info_Saved[index]);

//   if(name != null)
//   {
//     PROTOCOL_NAME = name; 
//     DATA_TX_LENGHT = Pack_Protocol(DATA_TX);
//     Pack_Data(DEVICE.PCR_ID, PCR_REG.DELETE_PROTOCOL, DATA_TX, DATA_TX_LENGHT, "Web_PCR");  
//     loading = await Show_Notification("Loading...", "Loading"); 
//   }
// }

function BuildProtocolData(protocolName)
{
    // Ngày lưu = thời điểm hiện tại
    const _now = new Date();
    const _dd  = String(_now.getDate()).padStart(2, "0");
    const _mm  = String(_now.getMonth() + 1).padStart(2, "0");
    const _dateSaved = `${_dd}/${_mm}/${_now.getFullYear()}`;

    // Lid và Liquid lấy từ UI input trực tiếp, fallback sang window
    const _lidEl = document.getElementById("LidTemp");
    const _liqEl = document.getElementById("Liquid");
    const _lid   = _lidEl ? (parseFloat(_lidEl.value)  || 0) : (window.LID_SETPOINT    || 0);
    const _liq   = _liqEl ? (parseFloat(_liqEl.value)  || 0) : (window.LIQUID_SETPOINT || 0);

    // Step_PCR và Cycles_PCR luôn đủ PCR_LOOP (4) phần tử
    const PCR_LOOP_MAX = 4;
    const _stepPCR   = Array.from({ length: PCR_LOOP_MAX }, (_, i) => window.STEP_PCR_CNT?.[i]    ?? 2);
    const _cyclesPCR = Array.from({ length: PCR_LOOP_MAX }, (_, i) => window.CYCLES_SETPOINT?.[i] ?? 30);

    return {
        PROTOCOL_NAME:  protocolName,
        Date_Saved:     _dateSaved,
        Block:          [...(window.BLOCK_SETPOINT || [])],
        Time:           [...(window.TIME_SETPOINT  || [])],
        Lid:            _lid,
        Liquid:         _liq,
        Hold_Start:     window.HOLD_START_CNT  || 0,
        PCR_Loop:       window.PCR_LOOP_CNT    || 0,
        Hold_End:       window.HOLD_END_CNT    || 0,
        Step_PCR:       _stepPCR,
        Cycles_PCR:     _cyclesPCR
    };
}

async function Click_Btn_Save(name_protocol)
{
    if (name_protocol === "none")
    {
        // Save As: nhập tên mới từ người dùng (để trống → server tự sinh tên)
        const name = await Show_Notification("Enter protocol name:", "Save_Protocol");
        if (name === null) return; // null = bấm Cancel

        const saveData = BuildProtocolData(name); // name có thể là ""
        window._pendingSaveAs = saveData;
        window.API.send("protocol:save_as", saveData);
    }
    else
    {
        // Save: ghi đè protocol hiện tại
        const confirmed = await Show_Notification("Save and overwrite current protocol?", "Yes_No");
        if (!confirmed) return;

        const saveData = BuildProtocolData(name_protocol);
        window.API.send("protocol:save", saveData);
    }
}

async function Click_Btn_Reload() {
  Pack_Data(DEVICE.PCR_ID, PCR_REG.REQUEST_CALIB_HISTORY, null, 0, "Web_PCR");     // Gửi lệnh yêu cầu đọc lại thông số đã được calib
  Show_Loading();
}

async function Click_Btn_Upload() {
    // Lấy giá trị hiện tại từ các input
    const Heating_Val   = parseFloat(document.getElementById("Heating_Val").value) || 0.0;
    const Cooling_Val   = parseFloat(document.getElementById("Cooling_Val").value) || 0.0;
    const Time_out      = parseFloat(document.getElementById("Time_out_Val").value) || 0.0;

    const Temp_Hi = [
        parseFloat(document.getElementById("Pel1_Hi").value) || 0.0,
        parseFloat(document.getElementById("Pel2_Hi").value) || 0.0,
        parseFloat(document.getElementById("HeatBlock_Hi").value) || 0.0
    ];

    const Temp_Lo = [
        parseFloat(document.getElementById("Pel1_Lo").value) || 0.0,
        parseFloat(document.getElementById("Pel2_Lo").value) || 0.0,
        parseFloat(document.getElementById("HeatBlock_Lo").value) || 0.0
    ];

    const Heating_Speed = parseFloat(document.getElementById("Heating_Speed").value) || 0.0;
    const Cooling_Speed = parseFloat(document.getElementById("Cooling_Speed").value) || 0.0;


    // --- Kiểm tra hợp lệ ---
    if (Heating_Val < 0 || Heating_Val > 10) 
    {
        alert("Heating value must be 0 to 10");
        return;
    }
    if (Cooling_Val < 0 || Cooling_Val > 10) 
    {
        alert("Cooling value must be 0 to 10");
        return;
    }
    if (Time_out < 60 || Time_out > 1000) 
    {
        alert("Time out value must be 60 to 1000");
        return;
    }

    for (let i = 0; i < 3; i++) 
    {
        if (Temp_Hi[i] < 70 || Temp_Hi[i] > 120) 
        {
            alert(`Peltier ${i+1} high temperature must be 70 to 120`);
            return;
        }
        if (Temp_Lo[i] < 30 || Temp_Lo[i] > 70) 
        {
            alert(`Peltier ${i+1} high temperature must be 30 to 70`);
            return;
        }
    }

    if (Heating_Speed <= 0 || Heating_Speed > 20) 
    {
        alert("Heating speed must be 0 to 20 °C/s");
        return;
    }

    if (Cooling_Speed <= 0 || Cooling_Speed > 20) 
    {
        alert("Cooling speed must be 0 to 20 °C/s");
        return;
    }

    // Nếu dữ liệu hợp lệ thì tiến hành kiểm tra có giống dữ liệu đang được lưu không
    const calib = Calib_Val_Saved[0];

    // So sánh tất cả các giá trị
    const currentValues = [Heating_Val, Cooling_Val, Time_out, ...Temp_Hi, ...Temp_Lo, Heating_Speed, Cooling_Speed];
    const EPS = 0.05; // sai số 0.05
    const isSame = currentValues.every((val, idx) => Math.abs(val - calib[idx]) < EPS);


    if (isSame) 
    {
      alert("Data has been saved before!");
      const historyLabel = document.getElementById("system-content");
      historyLabel.textContent  = "-> Data has been saved before!";
    }
    else // Nếu là số mới và dữ liệu hợp lệ thì gửi dữ liệu lưu lại
    {
      alert("Calibration data saved successfully!");
      DATA_TX_LENGHT = Pack_Calib_Val(DATA_TX, Heating_Val, Cooling_Val, Time_out, Temp_Hi, Temp_Lo, Heating_Speed, Cooling_Speed);
      Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_CALIB_VAL, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
    }
}

// async function Click_Btn_Auto() 
// {
//     const confirmed = await Show_Notification(
//         "The system will start automatic heating/cooling speed calibration!",
//         "Yes_No"
//     );

//     if (!confirmed) return;

//     //Gửi lệnh yêu cầu tự động calib tốc độ nhiệt
//     Pack_Data(DEVICE.PCR_ID,PCR_REG.AUTO_CALIB_SPEED, null,  0, "Web_PCR");
//     console.log("Auto calibration command sent.");
// }
