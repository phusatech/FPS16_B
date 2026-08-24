const APP_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/*================================== Các panel đối tượng =================================*/
function Render_PCR_Program() {
  const TITLE_PERCENT  = 23;
  const HEADER_PERCENT = 15;
  const STEP_SHOW      = 4; // số bước hiển thị
  let stepIndex = 0;
  let prevTemp = 25;


  const container = document.getElementById("pcr-new-list");
  
  container.innerHTML = ""; // reset container
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.padding = "0";
  container.style.margin  = "0";
  container.style.overflowX = "hidden"; 
  // container.style.width = "100%"; 
  // container.style.height = "100%"; 
  container.style.backgroundColor = window.COLORS.PCR_Step;

/*======================================================================================== */

  // Tính tổng số step để tính % bảng
  let STEP_PCR_TOTAL = 0;
  for (let i = 0; i < window.PCR_LOOP_CNT; i++) 
  { STEP_PCR_TOTAL += window.STEP_PCR_CNT[i]; }
  let STEP_TOTAL = window.HOLD_START_CNT + STEP_PCR_TOTAL + window.HOLD_END_CNT;


    // --- wrapper để scroll ngang ---
  const wrapper = document.createElement("div");
  wrapper.style.width = "100%";
  wrapper.style.height = (100- TITLE_PERCENT) + "%";
  wrapper.style.overflowX = "auto";   // bật scroll ngang
  wrapper.style.WebkitOverflowScrolling = "touch"; // cuộn mượt trên iOS
  wrapper.style.overflowY = "hidden";
  //wrapper.style.border = "1px solid #000"; // chỉ để nhìn rõ

  // tạo table
  const table = document.createElement("table");
  table.style.width = ((100/STEP_SHOW)*STEP_TOTAL) + "%";
  
  table.style.height = "100%";
  table.style.borderCollapse = "collapse"; 
  table.style.tableLayout = "fixed";       
  table.className = "pcr-table";

  const headerRow = document.createElement("tr");   // hàng header
  const bodyRow = document.createElement("tr");  // hàng body

  function createStepBox(title, widthPercent, subSteps = 1, cycleValue = null, index = 0) 
  {
    // --- header cell ---
    const th = document.createElement("th");
    th.style.height = HEADER_PERCENT + "%";
    th.style.width = widthPercent + "%";
    // th.style.border = "1px solid #000";
    // th.style.backgroundColor = window.COLORS.PCR_Tile_Step;

    th.style.border = `1px solid ${window.COLORS.PCR_Step_Border}`;
    th.style.backgroundColor = window.COLORS.PCR_Tile_Step;
    th.style.color = window.COLORS.MENU_TITLE;

    th.style.fontWeight = "normal";   // 👈 chữ không đậm
    th.colSpan = subSteps; // gộp theo số substep

    if (title === "PCR Stage" && cycleValue !== null) 
    {
      // tạo container cho text + input
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.justifyContent = "center";
      div.style.alignItems = "center";
      div.style.gap = "4px";

      const label = document.createElement("span");
      label.textContent = "PCR Stage   cycles ";
      label.style.fontSize = window.FONT.DATA;
      window.LABEL_CYCLES_RUNNING[index] = label;

      const cycles = document.createElement("input");
      cycles.type = "text";
      cycles.inputMode = "numeric";
      cycles.value = cycleValue;
      cycles.style.width = "40px";
      cycles.style.height = "15px";
      cycles.style.textAlign = "center";
      cycles.style.border = "1px solid #000";
      cycles.style.borderRadius = "4px";
      cycles.style.width = "5ch";
      cycles.maxLength = 3; // Tối đa 3 số
      cycles.style.fontFamily = APP_FONT;
      cycles.style.fontSize = "14px";
      cycles.id = `Cycles_${index}`;
      window.INPUT_CYCLES_RUNNING[index] = cycles;

      div.appendChild(label);
      div.appendChild(cycles);
      th.appendChild(div);

      cycles.addEventListener("input", () => {
        cycles.value = cycles.value.replace(/[^0-9]/g, ""); // chỉ số 
      });

      cycles.addEventListener("change", () => 
      {
        let Cycles_Val = parseFloat(cycles.value);
        if (isNaN(Cycles_Val) || Cycles_Val < 0) Cycles_Val = 0;  // Kiểm tra giá trị hợp lệ
        if (Cycles_Val > window.CYCLES_MAX_THRESOLD) Cycles_Val = window.CYCLES_MAX_THRESOLD;
        
        window.CYCLES_SETPOINT[index] = Cycles_Val;
        cycles.value = Cycles_Val;
        if (typeof _save_protocol_draft === "function") _save_protocol_draft();
      });

    } 
    else 
    {
      th.textContent = title;
    }

    headerRow.appendChild(th);

    // --- body cells ---
    for (let j = 0; j < subSteps; j++) 
    {
      const td = document.createElement("td");
      td.style.height = (100 - TITLE_PERCENT) + "%";
      // td.style.border = "1px solid #000";
      td.style.border = `1px solid ${window.COLORS.PCR_Step_Border}`;
      td.style.backgroundColor = window.COLORS.PCR_Step_Cell;

      td.style.verticalAlign = "middle";
      td.style.textAlign = "center";

      const curTemp = window.BLOCK_SETPOINT[stepIndex] || 25;
      const curTime = window.TIME_SETPOINT[stepIndex] || 0;

      // gọi hàm vẽ input/line vào td
      Create_Input_Line(td, stepIndex);
      window.prevTemp = curTemp;
      stepIndex++;

      bodyRow.appendChild(td);
    }
  }


  // Tạo top Title
  const topTable = create_Title(PROTOCOL_NAME, LID_SETPOINT, LIQUID_SETPOINT, TITLE_PERCENT);

  // --- 1. HOLD_START ---
  for (let i = 0; i < window.HOLD_START_CNT; i++) {
    createStepBox("Hold Stage", (100 / STEP_SHOW));
  }

  
  // --- 2. PCR_LOOP ---
  for (let i = 0; i < window.PCR_LOOP_CNT; i++) 
  {
    const widthPercent = (100 / STEP_SHOW) * (window.STEP_PCR_CNT[i] || 1);
    const subSteps = window.STEP_PCR_CNT[i] || 1;
    const cycleValue = window.CYCLES_SETPOINT[i] || 0;
    createStepBox("PCR Stage", widthPercent, subSteps, cycleValue, i);
  }

  // --- 3. HOLD_END ---
  for (let i = 0; i < window.HOLD_END_CNT; i++) {
    createStepBox("Hold Stage", (100 / STEP_SHOW));
  }

  // ghép header + body vào table
  table.appendChild(headerRow);
  table.appendChild(bodyRow);
  wrapper.appendChild(table);

  container.appendChild(topTable);
  container.appendChild(wrapper);
}

function Create_Input_Line(body, stepIndex) 
{
  const prevTemp = window.BLOCK_SETPOINT[stepIndex - 1] || 25;
  const curTemp  = window.BLOCK_SETPOINT[stepIndex] || 25;
  const curTime  = window.TIME_SETPOINT[stepIndex] || 0;


  const TEMP_MIN = -5;
  const TEMP_MAX = 120;
  const LINE_X1 = 0.15;
  const TEMP_TIME_OFSET = 3;

  function mapTempToY(temp, bodyHeight) {
    const topPercent = 0;
    const bottomPercent = 1;
    const ratio = (TEMP_MAX - temp) / (TEMP_MAX - TEMP_MIN);
    return ratio * (bottomPercent - topPercent) * bodyHeight + topPercent * bodyHeight;
  }

  function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
  }


  body.innerHTML = "";
  body.style.position = "relative";
  body.style.width = "100%";
  body.style.height = "100%";

  const bodyWidth = body.clientWidth;
  const bodyHeight = body.clientHeight;

  /*==============================Lưu vào mảng với vị trí tương ứng=============================================*/ 
  window.PANEL_STEP_RUNNING[stepIndex] = body;
  

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  body.appendChild(svg);

  const x0 = 0;
  const x1 = bodyWidth * LINE_X1;
  const x2 = bodyWidth;

  const y0 = mapTempToY(prevTemp, bodyHeight);
  const y1 = mapTempToY(curTemp, bodyHeight);
  const y2 = y1;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", `${x0},${y0} ${x1},${y1} ${x2},${y2}`);
  // line.setAttribute("stroke", "red");
  line.setAttribute("stroke", window.COLORS.PCR_Line);
  line.setAttribute("stroke-width", "3");
  line.setAttribute("fill", "none");
  svg.appendChild(line);

  // --- Temp container ---
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "50%";
  tempContainer.style.transform = "translate(-35%, -100%)"; // căn giữa trên line
  tempContainer.style.display = "flex";
  tempContainer.style.alignItems = "center";
  tempContainer.style.gap = "2px"; // khoảng cách nhỏ giữa input và label

  const tempInput = document.createElement("input");
  tempInput.type = "text";
  tempInput.inputMode = "numeric";
  tempInput.value = curTemp;
  tempInput.placeholder = "Temp";
  tempInput.style.width = "3ch"; // 8 ký tự
  tempInput.style.textAlign = "center";
  // tempInput.style.border = "1px solid #000";

  tempInput.style.border = `1px solid ${window.COLORS.PCR_Step_Border}`;

  tempInput.style.borderRadius = "5px";
  tempInput.maxLength = 3;
  tempInput.id = `Step_Temp_${stepIndex}`;
  tempInput.style.fontFamily = APP_FONT;
  tempInput.style.fontSize = "14px";

  const tempLabel = document.createElement("span");
  tempLabel.textContent = "°C";

  tempContainer.appendChild(tempInput);
  tempContainer.appendChild(tempLabel);
  body.appendChild(tempContainer);


  // --- Time input (luôn dưới line) ---
  const timeInput = document.createElement("input");
  timeInput.type = "text";
  timeInput.inputMode = "numeric";
  timeInput.value = formatTime(curTime);
  timeInput.placeholder = "HH:MM:SS";
  timeInput.style.textAlign = "center";
  timeInput.style.position = "absolute";
  timeInput.style.left = "50%";
  timeInput.style.width = "8ch"; // 8 ký tự
  // timeInput.style.border = "1px solid #000";
  timeInput.style.border = `1px solid ${window.COLORS.PCR_Step_Border}`;
  timeInput.style.borderRadius = "5px"; 
  timeInput.style.transform = "translate(-50%, 0)"; // luôn dưới line
  timeInput.maxLength = 8;
  timeInput.id = `Step_Time_${stepIndex}`; 
  timeInput.style.fontFamily = APP_FONT;
  timeInput.style.fontSize = "14px";
  body.appendChild(timeInput);

    /*==============================Lưu vào mảng với vị trí tương ứng=============================================*/ 
  window.LABEL_TIME_RUNNING[stepIndex] = timeInput;

  // --- Cập nhật vị trí ban đầu ---
  tempInput.style.top = `${y1}px`;
  timeInput.style.top = `${y1}px`;

  function UpdateLine() 
  {
      const w = body.clientWidth;
      const h = body.clientHeight;
      const newX1 = w * LINE_X1;
      const newX2 = w;
      const newY0 = mapTempToY(prevTemp, h);
      const newY1 = mapTempToY(parseFloat(tempInput.value) || curTemp, h);
      const newY2 = newY1;

      line.setAttribute("points", `${0},${newY0} ${newX1},${newY1} ${newX2},${newY2}`);
      tempContainer.style.top = `${newY1 - TEMP_TIME_OFSET}px`;
      timeInput.style.top     = `${newY1 + TEMP_TIME_OFSET}px`;
  }

  tempInput.addEventListener("input", () => {
      tempInput.value = tempInput.value.replace(/[^0-9]/g, ""); // chỉ số 
  });

  tempInput.addEventListener("change", () => 
  {
    let newTemp = parseFloat(tempInput.value);
    if (isNaN(newTemp) || newTemp < TEMP_MIN_THRESOLD) newTemp = TEMP_MIN_THRESOLD;  // Kiểm tra giá trị hợp lệ
    if (newTemp > TEMP_MAX_THRESOLD) newTemp = TEMP_MAX_THRESOLD;
    window.BLOCK_SETPOINT[stepIndex] = newTemp;
    tempInput.value = newTemp;     // Cập nhật input hiển thị (đảm bảo không vượt quá giới hạn)
    Redraw_All_Step_Line();
    if (typeof _save_protocol_draft === "function") _save_protocol_draft();
  });

  timeInput.addEventListener("keydown", (e) => {
      const pos = timeInput.selectionStart;

      const start = timeInput.selectionStart; 
      const end = timeInput.selectionEnd;

      // Nếu chọn nhiều kí tự
      if (end - start > 0 && (e.key === "Backspace" || e.key === "Delete")) 
      {
          e.preventDefault();
          let valArr = timeInput.value.split("");
          for (let i = start; i < end; i++) 
          {
            if (valArr[i] !== ":") valArr[i] = "0"; // thay số bằng 0, giữ ":"
          }
          timeInput.value = valArr.join("");
          timeInput.setSelectionRange(start, start);
          return;
      }

      // Phím cho phép: mũi tên, tab, delete, backspace
      const allowedKeys = ["ArrowLeft","ArrowRight","Tab","Delete","Backspace"];
      if (allowedKeys.includes(e.key)) 
      {
          const val = timeInput.value;
          if (e.key === "Backspace" && val[pos - 1] === ":") 
          {
              e.preventDefault();
              return;
          }
          if (e.key === "Delete" && val[pos] === ":") 
          {
              e.preventDefault();
              return;
          }
          return;
      }
    
      // Chỉ cho phép số 0-9
      if (!/[0-9]/.test(e.key)) 
      {
          e.preventDefault();
          return;
      }

      // Tự động nhảy qua dấu :
      if (pos === 2 || pos === 5) 
      {
          timeInput.setSelectionRange(pos + 1, pos + 1);
      }
  });
  
  timeInput.addEventListener("input", () => {
      timeInput.value = timeInput.value.replace(/[^0-9:]/g, "");
  });

  timeInput.addEventListener("blur", () => {
      // let [h, m, s] = timeInput.value.split(":").map(v => parseInt(v) || 0);
      let parts = timeInput.value.split(":");
      let h = parseInt(parts[0]) || 0;
      let m = parseInt(parts[1]) || 0;
      let s = parseInt(parts[2]) || 0;

      if (h < 0) h = 0; if (h > TIME_MAX_HOUR)   h = TIME_MAX_HOUR;
      if (m < 0) m = 0; if (m > TIME_MAX_MINUTE) m = TIME_MAX_MINUTE;
      if (s < 0) s = 0; if (s > TIME_MAX_SECOND) s = TIME_MAX_SECOND;

      timeInput.value = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
      window.TIME_SETPOINT[stepIndex] = h*3600 + m*60 + s;
      if (typeof _save_protocol_draft === "function") _save_protocol_draft();
  });

  const resizeObserver = new ResizeObserver(UpdateLine);
  resizeObserver.observe(body);

  if (window.visualViewport) 
  {
    window.visualViewport.addEventListener('resize', UpdateLine);
  }
}

function Redraw_All_Step_Line() // Vẽ lại tất cả các đường nhiệt độ
{
  for (let i = 0; i < PANEL_STEP_RUNNING.length; i++)
  {
    if (PANEL_STEP_RUNNING[i])
    {
      Redraw_Step_Line(i);
    }
  }
}

function Redraw_Step_Line(stepIndex) // vẽ lại đường nhiệt độ
{
  const TITLE_PERCENT  = 20;
  const td = PANEL_STEP_RUNNING[stepIndex];
  if (!td) return;

  // reset td
  td.innerHTML = "";
  td.style.height = (100 - TITLE_PERCENT) + "%";
  td.style.border = "1px solid #000";
  td.style.verticalAlign = "middle";
  td.style.textAlign = "center";

  // lấy dữ liệu hiện tại
  const curTemp = window.BLOCK_SETPOINT[stepIndex] || 25;
  const curTime = window.TIME_SETPOINT[stepIndex] || 0;

  // vẽ lại input + line
  Create_Input_Line(td, stepIndex);
}

function create_Title(PROTOCOL_NAME, LID_SETPOINT, LIQUID_SETPOINT, TITLE_PERCENT = 20) {
    // --- Tạo table trong topContainer ---
    const topTable = document.createElement("table");
    topTable.style.width = "100%";
    topTable.style.height = TITLE_PERCENT + "%";  // chiếm toàn bộ topContainer
    topTable.style.borderCollapse = "collapse";
    topTable.style.tableLayout = "fixed";
    // topTable.style.backgroundColor = COLORS.PCR_Tile_Info;
    topTable.style.backgroundColor = window.COLORS.PCR_Tile_Info;
    topTable.style.color = window.COLORS.MENU_TITLE;

    topTable.style.borderRight = "1px solid #000";
    topTable.style.borderLeft = "1px solid #000";
    topTable.style.borderTop = "1px solid #000";

    // --- Hàng 1: Protocol Name ---
    const row1 = document.createElement("div");
    row1.style.flex = "1"; // chiếm 50% topContainer
    row1.style.height = "50%";
    row1.style.display = "flex";
    row1.style.alignItems = "center";
    row1.style.justifyContent = "center";

    ui_LBNameProtocol = document.createElement("span");
    ui_LBNameProtocol.textContent = `Protocol Name: ${PROTOCOL_NAME}`;
    ui_LBNameProtocol.id = `Protocol_Name`;
    ui_LBNameProtocol.style.fontSize = FONT.DATA;
    row1.appendChild(ui_LBNameProtocol);

    // --- Hàng 2: LidTemp + PCR Volume ---
    const row2 = document.createElement("div");
    row2.style.flex = "1"; // chiếm 50% topContainer
    row2.style.height = "50%";
    row2.style.display = "flex"; // 2 ô ngang
    row2.style.borderTop = "1px solid #000";

    // Ô trái: LidTemp
    const leftCell = document.createElement("div");
    leftCell.style.flex = "1"; // chiếm 50% row2
    leftCell.style.display = "flex";
    leftCell.style.alignItems = "center";
    leftCell.style.justifyContent = "center";
    leftCell.style.gap = "4px"; // khoảng cách 4px giữa các phần tử

    const labelLid = document.createElement("span");
    labelLid.textContent = "Lid Temp: ";
    labelLid.style.fontSize = FONT.DATA;

    ui_LidTemp = document.createElement("input");
    ui_LidTemp.type = "text";
    ui_LidTemp.inputMode="numeric";
    ui_LidTemp.value = `${LID_SETPOINT}`;
    // ui_LidTemp.style.width = "50px";
    ui_LidTemp.style.width = "5ch"; // 8 ký tự
    ui_LidTemp.style.textAlign = "center";
    ui_LidTemp.style.borderRadius = "5px";
    ui_LidTemp.style.borderRight = "1px solid #000";
    ui_LidTemp.maxLength = 3;
    ui_LidTemp.id = `LidTemp`;
    ui_LidTemp.style.fontFamily = APP_FONT;
    ui_LidTemp.style.fontSize = "14px";
    ui_LidTemp.style.height = "15px";
    const unitLid = document.createElement("span");
    unitLid.textContent = " °C";
    unitLid.style.fontSize = FONT.DATA;

    leftCell.appendChild(labelLid);
    leftCell.appendChild(ui_LidTemp);
    leftCell.appendChild(unitLid);

    // Ô phải: PCR Volume
    const rightCell = document.createElement("div");
    rightCell.style.flex = "1"; // chiếm 50% row2
    rightCell.style.display = "flex";
    rightCell.style.alignItems = "center";
    rightCell.style.justifyContent = "center";
    rightCell.style.gap = "4px"; // khoảng cách 4px giữa các phần tử

    const labelVol = document.createElement("span");
    labelVol.textContent = "PCR Volume: ";
    labelVol.style.fontSize = FONT.DATA;

    ui_Liquid = document.createElement("input");
    ui_Liquid.type = "text";
    ui_Liquid.inputMode="numeric";
    ui_Liquid.value = `${LIQUID_SETPOINT}`;
    // ui_Liquid.style.width = "50px";
    ui_Liquid.style.width = "5ch"; // 8 ký tự
    ui_Liquid.style.textAlign = "center";
    ui_Liquid.style.borderRadius = "5px";
    ui_Liquid.style.borderRight = "1px solid #000";
    ui_Liquid.maxLength = 3;
    ui_Liquid.id = `Liquid`;
    ui_Liquid.style.fontFamily = APP_FONT;
    ui_Liquid.style.fontSize = "14px";
    ui_Liquid.style.height = "15px";
    const unitLiq = document.createElement("span");
    unitLiq.textContent = "ul";
    unitLiq.style.fontSize = FONT.DATA;

    rightCell.appendChild(labelVol);
    rightCell.appendChild(ui_Liquid);
    rightCell.appendChild(unitLiq);

    // Thêm ô vào row2
    row2.appendChild(leftCell);
    row2.appendChild(rightCell);

    // Thêm 2 hàng vào topContainer
    topTable.appendChild(row1);
    topTable.appendChild(row2);

    ui_LidTemp.addEventListener("input", () => {
      ui_LidTemp.value = ui_LidTemp.value.replace(/[^0-9]/g, ""); // chỉ số 
    });

    ui_LidTemp.addEventListener("change", () => 
    {
      let newLid = parseFloat(ui_LidTemp.value);
      if (isNaN(newLid) || newLid < LID_TEMP_MIN) newLid = LID_TEMP_MIN;  // Kiểm tra giá trị hợp lệ
      if (newLid > LID_TEMP_MAX) newLid = LID_TEMP_MAX;

      LID_SETPOINT = newLid;
      window.LID_SETPOINT = newLid;
      ui_LidTemp.value = newLid;
      if (typeof _save_protocol_draft === "function") _save_protocol_draft();
    });


    ui_Liquid.addEventListener("input", () => {
      ui_Liquid.value = ui_Liquid.value.replace(/[^0-9]/g, ""); // chỉ số
    });

    ui_Liquid.addEventListener("change", () =>
    {
      let val = parseFloat(ui_Liquid.value);
      if (!LID_THRESOLD.includes(val))  // Kiểm tra xem giá trị có nằm trong mảng không
      {  val = 30;  } // Nếu không, chọn mặc định
      LIQUID_SETPOINT = val;
      window.LIQUID_SETPOINT = val;
      ui_Liquid.value = val;
      if (typeof _save_protocol_draft === "function") _save_protocol_draft();
    });



    return topTable;
}

//====================================================================================//
function Render_Chart_Temp() {
    const container = document.getElementById("Temp-Chart");
    if (!container) return;
    const SAMPLE_PERIOD = 0.5; // seconds per sample (0.5s/mẫu), must match Update_UI.js

    if (window.TempChartRoot) {
        window.TempChartRoot.dispose();
    }

    const root = am5.Root.new(container, {
        useSafeResolution: false
    });

    // Tắt logo
    if (root._logo) {
      root._logo.dispose();
    }

    window.TempChartRoot = root;

    // ================= FONT =================
    root.setThemes([am5themes_Animated.new(root)]);
    root.container.setAll({
        width: am5.percent(100),
        height: am5.percent(100),
        fontFamily: APP_FONT,
        fontSize: 16
    });

    // ================= CHART =================
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            width: am5.percent(100),
            height: am5.percent(100),
            paddingTop:    16,
            paddingBottom: 4,
            paddingLeft:   2,
            paddingRight:  6,
            panX: true,
            panY: false,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true
        })
    );

    // ================= X AXIS =================
    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: Chart_Buf_Size - 1,
            strictMinMax: true,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 80
            })
        })
    );

    xAxis.get("renderer").labels.template.setAll({
        fontFamily: APP_FONT,
        fontSize: 12,
        paddingTop: 3
    });

    xAxis.get("renderer").labels.template.adapters.add("text", (text, target) => {
        const v = target.dataItem?.get("value");
        if (v == null) return text;
        const relSec = (v - (window.Chart_T ?? (Chart_Buf_Size - 1))) * SAMPLE_PERIOD;
        return formatTimeByScale(relSec, xAxis, true);
    });


    // ================= Y AXIS =================
    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 100,
            strictMinMax: true,
            maxPrecision: 0,
            extraTooltipPrecision: 0,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 15
            })
        })
    );

    yAxis.set("gridCount", 11);

    yAxis.get("renderer").labels.template.setAll({
        fontFamily: APP_FONT,
        fontSize: 12,
        paddingRight: 4
    });

    yAxis.get("renderer").labels.template.adapters.add("text", (text, target) => {
        const v = target.dataItem?.get("value");
        return v != null ? v + " °C" : text;
    });

    // ================= SERIES =================
    const series = chart.series.push(
        am5xy.LineSeries.new(root, {
            xAxis,
            yAxis,
            valueXField: "x",
            valueYField: "sample",
            stroke: am5.color(0xff0000),
            tooltip: am5.Tooltip.new(root, {
                //labelText: "{valueY.formatNumber('#.0')} °C\n{valueX.formatNumber('0')} s",
                getFillFromSprite: false,   
                getStrokeFromSprite: false,
                autoTextColor: false       
            })
        })
    );

    const estimateSeries = chart.series.push(
          am5xy.LineSeries.new(root, {
              xAxis,
              yAxis,
              valueXField: "x",
              valueYField: "estimate", // khác field
              stroke: am5.color(0x0000ff), // màu xanh cho dễ phân biệt
              tooltip: am5.Tooltip.new(root, {
                //labelText: "{valueY.formatNumber('#.0')} °C\n{valueX.formatNumber('0')} s",
                getFillFromSprite: false,   
                getStrokeFromSprite: false,
                autoTextColor: false       
            })
        })
      );
      window.Temp_Estimate_Series = estimateSeries;

    const Tooltip = series.get("tooltip");
    Tooltip.label.adapters.add("text", (text, target) => {
        const dataItem = target.dataItem;
        if (!dataItem) return text;

        const y = dataItem.get("valueY");
        const x = dataItem.get("valueX");

        const relSec = (x - (window.Chart_T ?? (Chart_Buf_Size - 1))) * SAMPLE_PERIOD;
        return `${y.toFixed(1)} °C\n${formatTimeByScale(relSec, xAxis)}`;
    });

    series.set("fill", am5.color(0xff0000)); // màu nền phủ

    window.Temp_Series = series;
    window.Temp_XAxis = xAxis;

    series.strokes.template.set("strokeWidth", 2);
    series.fills.template.setAll({
        visible: true,
        fillOpacity: 0.3,
     });


    estimateSeries.strokes.template.set("strokeWidth", 2);
    estimateSeries.fills.template.setAll({
        visible: true,
        fillOpacity: 0.3,
     });

    const tooltip = series.get("tooltip");
    tooltip.set("background", am5.RoundedRectangle.new(root, {
        fill: am5.color(0xD1D1D1),   // nền xám
        fillOpacity: 0.9,
        strokeOpacity: 0,
        cornerRadiusTL: 5,
        cornerRadiusTR: 5,
        cornerRadiusBL: 5,
        cornerRadiusBR: 5,
        
    }));

    tooltip.label.setAll({
        fill: am5.color(0x000000),   // chữ đen
        fontFamily: APP_FONT,
        fontSize: 14
    });

  window.Temp_Buf = new Array(Chart_Buf_Size).fill(0);
  window.Chart_Estimate_Buf = new Array(Chart_Buf_Size).fill(0);
  window.Chart_T = Chart_Buf_Size - 1;

  const initialData = window.Temp_Buf.map((v, i) => ({
      x: i,
      sample: v,
      estimate: 0
  }));

  series.data.setAll(initialData);
  estimateSeries.data.setAll(initialData);

  // Tắt animation khi push/remove dữ liệu để chart không tự zoom/scroll
  series.set("interpolationDuration", 0);
  estimateSeries.set("interpolationDuration", 0);

    // ================= TAP HIỂN THỊ NHIỆT ĐỘ =================

    const cursor = chart.set("cursor",
        am5xy.XYCursor.new(root, {
            behavior: "none",
            xAxis: xAxis
        })
    );

    cursor.lineY.set("visible", false);
    cursor.lineX.set("visible", true);

    const valueLabel = am5.Label.new(root, {
        text: "",
        visible: false,
    });


    chart.plotContainer.children.push(valueLabel);

    // Khi chạm / di chuyển trong chart
    cursor.events.on("cursorpositionchanged", () => {
        const positionX = cursor.getPrivate("positionX");
        if (positionX == null) return;

        const xValue = xAxis.positionToValue(positionX);
        const dataItem = series.getDataItemByX(xValue);
        if (!dataItem) return;

        const yValue = dataItem.get("valueY");

        valueLabel.setAll({
            text: yValue.toFixed(1) + " °C",
            x: cursor.get("point").x,
            y: cursor.get("point").y - 30,
            visible: true
        });
    });

    // Khi mất focus / nhả tay
    cursor.events.on("cursorhidden", () => {
        valueLabel.set("visible", false);
    });

    cursor.lineX.setAll({
        strokeWidth: 3,          
        stroke: am5.color(0x4D4D4D),  
        strokeOpacity: 0.8
    });

  //=================PHẦN ZOOM IN ZOOM OUT===============
  chart.zoomOutButton.set("forceHidden", true);
  xAxis.set("start", 0.92); // Hiện phần cuối chart ngay lập tức, không animate
  // ================= ANIMATION =================
  chart.appear(600, 100);


const container_object = document.getElementById("pcr-chart");
container_object.style.position = "relative";

// xóa control cũ nếu có
const oldControl = container.querySelector(".chart-control");
if (oldControl) oldControl.remove();

const controlDiv = document.createElement("div");
controlDiv.className = "chart-control";

controlDiv.style.position = "absolute";
controlDiv.style.right  = "5px";
controlDiv.style.top = "5px";
controlDiv.style.background = "rgba(255, 255, 255, 0.3)";
controlDiv.style.border = "1px solid rgba(0,0,0,0.6)";
controlDiv.style.backdropFilter = "blur(4px)";   
controlDiv.style.padding = "6px 10px";
controlDiv.style.borderRadius = "6px";
controlDiv.style.fontFamily = APP_FONT;
controlDiv.style.fontSize = "14px";
controlDiv.style.zIndex = "100";


controlDiv.style.display = "flex";
controlDiv.style.flexDirection = "column"; 
controlDiv.style.alignItems = "flex-start"; 
controlDiv.style.gap = "5px";

// ===== SYSTEM =====
const sysLabel = document.createElement("label");
sysLabel.style.cursor = "pointer";

const sysCheckbox = document.createElement("input");
sysCheckbox.type = "checkbox";
sysCheckbox.checked = true;

const sysIcon = document.createElement("span");
sysIcon.innerHTML = " ● ";
sysIcon.style.color = "red";

sysLabel.appendChild(sysCheckbox);
sysLabel.appendChild(sysIcon);
sysLabel.appendChild(document.createTextNode("Sample"));

// ===== ESTIMATE =====
const estLabel = document.createElement("label");
estLabel.style.cursor = "pointer";

const estCheckbox = document.createElement("input");
estCheckbox.type = "checkbox";
estCheckbox.checked = true;

const estIcon = document.createElement("span");
estIcon.innerHTML = " ● ";
estIcon.style.color = "blue";

estLabel.appendChild(estCheckbox);
estLabel.appendChild(estIcon);
estLabel.appendChild(document.createTextNode("Estimate"));

// ===== ADD =====
controlDiv.appendChild(sysLabel);
controlDiv.appendChild(estLabel);

container.appendChild(controlDiv);

// ===== EVENT =====
sysCheckbox.addEventListener("change", () => {
    sysCheckbox.checked ? series.show() : series.hide();
});

estCheckbox.addEventListener("change", () => {
    estCheckbox.checked ? estimateSeries.show() : estimateSeries.hide();
});


  // ================== NÚT ZOOM IN/OUT NGOÀI CHART ==================
  // ================== NÚT ZOOM IN/OUT NGOÀI CHART ==================
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");

  const ZOOM_STEP = 0.25; // 25% biểu đồ mỗi lần zoom

  zoomInBtn.addEventListener("click", () => {
      const start = xAxis.get("start") ?? 0;
      const end = xAxis.get("end") ?? 1;
      const range = end - start;

      // thu hẹp 10% giữ trung tâm
      let newStart = start + ZOOM_STEP * range / 2;
      let newEnd   = end - ZOOM_STEP * range / 2;

      // hạn chế quá zoom
      if (newEnd - newStart < 0.001) { 
          const mid = (start + end) / 2;
          newStart = mid - 0.001;
          newEnd = mid + 0.001;
      }

      xAxis.animate({ key: "start", to: newStart, duration: 300, easing: am5.ease.out(am5.ease.cubic) });
      xAxis.animate({ key: "end",   to: newEnd,   duration: 300, easing: am5.ease.out(am5.ease.cubic) });
  });

  zoomOutBtn.addEventListener("click", () => {
      const start = xAxis.get("start") ?? 0;
      const end = xAxis.get("end") ?? 1;
      const range = end - start;

      // mở rộng 10% giữ trung tâm
      let newStart = start - ZOOM_STEP * range / 2;
      let newEnd   = end + ZOOM_STEP * range / 2;

      // hạn chế vượt ra ngoài 0→1
      if (newStart < 0) newStart = 0;
      if (newEnd > 1)   newEnd = 1;

      xAxis.animate({ key: "start", to: newStart, duration: 300, easing: am5.ease.out(am5.ease.cubic) });
      xAxis.animate({ key: "end",   to: newEnd,   duration: 300, easing: am5.ease.out(am5.ease.cubic) });
  });


    function formatTimeByScale(xValue, xAxis, isAxis = false) {
        if (Math.abs(xValue) < 0.05) {
            return isAxis ? "Now" : "Now";
        }

        const rangeSamples = Math.abs(
            xAxis.getPrivate("selectionMax") -
            xAxis.getPrivate("selectionMin")
        );
        const rangeSec = rangeSamples * SAMPLE_PERIOD;

        const abs = Math.abs(xValue);
        const sign = xValue < 0 ? "-" : "";

        if (rangeSec <= 120) {
            return `${sign}${abs.toFixed(1)} s`;
        }
        else if (rangeSec <= 3600) {
            return `${sign}${(abs / 60).toFixed(1)} m`;
        }
        else {
            return `${sign}${(abs / 3600).toFixed(1)} h`;
        }
    }
}
//====================================================================================//
function Render_Tool(Panel_ID, option = "new") {
    const container = document.getElementById(Panel_ID)

    container.innerHTML = "";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.gap = "5px"; // khoảng cách giữa 2 hàng
    container.style.backgroundColor = window.COLORS.PCR_BG;

    // const Two_Row = ["new", "saved", "history", "temp_calib"].includes(option); // Nếu 1 trong 5 thì tạo chiều cao 20% còn nếu là admin thì chiều cao 10%
    
    const Two_Row = ["new", "saved", "history"].includes(option); // Nếu 1 trong 5 thì tạo chiều cao 20% còn nếu là admin thì chiều cao 10%
    container.style.height = Two_Row ? "20%" : "10%";

    
    if (Two_Row) 
    {
      // --- Hàng 1: START / EDIT / SAVE + thời gian ---
      const topRow = document.createElement("div");
      Object.assign(topRow.style, 
      {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "50%", // 10% tổng màn hình nếu container 20%
          gap: "2%",
          paddingLeft: "2%",   // <-- camelCase
          paddingRight: "2%",  // <-- camelCase
          boxSizing: "border-box",
          backgroundColor: window.COLORS.PCR_BG
      });

      if (option === "new") 
      {
        // Nút START
        ui_BtnStart = document.createElement("button");
        ui_BtnStart.className = "ctrl-btn";
        ui_BtnStart.innerHTML = `<img src="../../assets/PCR_START_TOOL.png" style="width:16px; height:16px;"> START`;

        ui_BtnStart.addEventListener("click", function() 
        {
          const btnName = this.innerText.trim(); // Lấy tên nút khi click
          Click_Btn_Start(btnName);                  // Truyền tên vào hàm
        });
        topRow.appendChild(ui_BtnStart);

        // Nút EDIT
        ui_BtnEdit = document.createElement("button");
        ui_BtnEdit.className = "ctrl-btn";
        ui_BtnEdit.innerHTML = `<img src="../../assets/PCR_EDIT_TOOL.png" style="width:16px; height:16px;"> EDIT`;
        ui_BtnEdit.addEventListener("click", function() 
        {
          const btnName = this.innerText.trim(); // Lấy tên nút khi click
          Click_Btn_Edit(btnName);                  // Truyền tên vào hàm
        });

        topRow.appendChild(ui_BtnEdit);

        // Nút SAVE
        ui_BtnSave = document.createElement("button");
        ui_BtnSave.className = "ctrl-btn";
        ui_BtnSave.innerHTML = `<img src="../../assets/PCR_SAVE_TOOL.png" style="width:16px; height:16px;"> SAVE`;
        ui_BtnSave.addEventListener("click", function() 
        {
          const name_protocol = Extract_Name_From_Protocol(ui_LBNameProtocol);// Lấy tên nút khi click
        //   console.log(name_protocol);
          Click_Btn_Save(name_protocol);                  // Truyền tên vào hàm
        });
        topRow.appendChild(ui_BtnSave);

        // Nút SAVE AS
        ui_BtnSaveAs = document.createElement("button");
        ui_BtnSaveAs.className = "ctrl-btn";
        ui_BtnSaveAs.innerHTML = `<img src="../../assets/PCR_SAVE_TOOL.png" style="width:16px; height:16px;"> SAVE AS`;
        ui_BtnSaveAs.addEventListener("click", function() 
        {
          //const name_protocol = Extract_Name_From_Protocol(ui_LBNameProtocol);// Lấy tên nút khi click
          // console.log(name_protocol);
          Click_Btn_Save("none");                  // Truyền tên vào hàm
        });
        topRow.appendChild(ui_BtnSaveAs);
      }
      else if (option === "saved") 
      {
        // Nút Open
        ui_BtnOpen = document.createElement("button");
        ui_BtnOpen.className = "ctrl-btn";
        ui_BtnOpen.innerHTML = `<img src="../../assets/PCR_OPEN_TOOL.png" style="width:16px; height:16px;"> OPEN`;
        ui_BtnOpen.addEventListener("click", () => {
          if(Position_Click != null)
          {
            Tab_prev = ui_LBSavedTitle.textContent;
            Click_Btn_Open(Position_Click , option , "new"); // click open thì hiện new binhg thường
          }
        });
        topRow.appendChild(ui_BtnOpen);
        // Nút Delete
        ui_BtnDelete = document.createElement("button");
        ui_BtnDelete.className = "ctrl-btn";
        ui_BtnDelete.innerHTML = `<img src="../../assets/PCR_DELETE_TOOL.png" style="width:16px; height:16px; "> DELETE`;
        ui_BtnDelete.addEventListener("click", function() 
        {
          if(Position_Click != null)
          {
            Click_Btn_Delete(Position_Click);               
          }
        });
        
        topRow.appendChild(ui_BtnDelete);
      }
      else if (option === "history") 
      {
        // Nút Open
        ui_BtnOpen = document.createElement("button");
        ui_BtnOpen.className = "ctrl-btn";
        ui_BtnOpen.innerHTML = `<img src="../../assets/PCR_OPEN_TOOL.png" style="width:16px; height:16px;"> OPEN`;
        ui_BtnOpen.addEventListener("click", () => {
          if(Position_Click != null)
          {
            Tab_prev = ui_LBSavedTitle.textContent;
            Click_Btn_Open(Position_Click, option, "view");
          }
        });
        topRow.appendChild(ui_BtnOpen);
      }
      container.appendChild(topRow);
    }
  
    // --- Hàng 2: BACK + TIME RUN (nếu option === "new") ---
const bottomRow = document.createElement("div");
Object.assign(bottomRow.style, 
{
    display: "flex",
    justifyContent: "center",
    width: "100%",
    height: Two_Row ? "50%" : "100%",
    backgroundColor: window.COLORS.PCR_BG,
});


if (option === "new") // nếu là new thì render Time run
{
    bottomRow.style.flexDirection = "row";

    // ---- Cột trái: BACK ----
    const backBox = document.createElement("div");
    Object.assign(backBox.style, {
        width: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        background: window.COLORS.PCR_BG,
        paddingLeft: "2%",   // <-- camelCase
        paddingRight: "1%",  // <-- camelCase
    });
    ui_BtnBack = document.createElement("button");
    ui_BtnBack.className = "back-btn";
    ui_BtnBack.innerHTML = `<img src="../../assets/PCR_BACK_TOOL.png" style="width:16px; height:16px;"> BACK`; 
    ui_BtnBack.addEventListener("click", function()  
    { 
       //console.timeLog(window.System.Tab_Status);
      Click_Btn_Back(window.System.Tab_Status); 
    });

    backBox.appendChild(ui_BtnBack);

    // ---- Cột phải: TIME RUN ----
    const timeBox = document.createElement("div");
    Object.assign(timeBox.style, {
        width: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        fontSize: "20px",
        backgroundColor: window.COLORS.PCR_BG,
        paddingLeft: "1%",   // <-- camelCase
        paddingRight: "2%",  // <-- camelCase
    });
        
    const timeDisplay = document.createElement("div");
    timeDisplay.className = "time-display"; 

    ui_TimeProgram = document.createElement("span");
    ui_TimeProgram.id = "time";
    ui_TimeProgram.textContent = "00 : 00 : 00";
    timeDisplay.appendChild(ui_TimeProgram);
    timeBox.appendChild(timeDisplay);

    bottomRow.appendChild(backBox);
    bottomRow.appendChild(timeBox);
}
else if (option === "view") // nếu là new thì render Time run
{
    bottomRow.style.flexDirection = "row";

    // ---- Cột trái: BACK ----
    const backBox = document.createElement("div");
    Object.assign(backBox.style, {
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "top",
        background: window.COLORS.PCR_BG,
        paddingLeft: "2%",   // <-- camelCase
        paddingRight: "1%",  // <-- camelCase
    });
    ui_BtnBack = document.createElement("button");
    ui_BtnBack.className = "back-btn";
    ui_BtnBack.innerHTML = `<img src="../../assets/PCR_BACK_TOOL.png" style="width:16px; height:16px;"> BACK`; 
    ui_BtnBack.addEventListener("click", function()  
    { 
        Click_Btn_Back(option, System.Tab_Prev); 
    });

    backBox.appendChild(ui_BtnBack);

    // // ---- Cột phải: TIME RUN ----
    // const timeBox = document.createElement("div");
    // Object.assign(timeBox.style, {
    //     width: "50%",
    //     display: "flex",
    //     justifyContent: "center",
    //     alignItems: "top",
    //     fontSize: "20px",
    //     backgroundColor: window.COLORS.PCR_BG,
    //     paddingLeft: "1%",   // <-- camelCase
    //     paddingRight: "2%",  // <-- camelCase
    // });
        
    // const timeDisplay = document.createElement("div");
    // timeDisplay.className = "time-display"; 

    // ui_TimeProgram = document.createElement("span");
    // ui_TimeProgram.id = "time";
    // ui_TimeProgram.textContent = "00 : 00 : 00";
    // timeDisplay.appendChild(ui_TimeProgram);
    // timeBox.appendChild(timeDisplay);

    bottomRow.appendChild(backBox);
    // bottomRow.appendChild(timeBox);
}
else
{
    // ===== CÁC OPTION KHÁC: chỉ có BACK =====
    bottomRow.style.justifyContent = "center";

    ui_BtnBack = document.createElement("button");
    ui_BtnBack.className = "back-btn";
    ui_BtnBack.innerHTML = `<img src="../../assets/PCR_BACK_TOOL.png" style="width:16px; height:16px;"> BACK`; 
    ui_BtnBack.addEventListener("click", function()  
    { 
        Click_Btn_Back(option, System.Tab_Prev); 
    });

    bottomRow.appendChild(ui_BtnBack);
}

    container.appendChild(bottomRow);
}






window.Render_PCR_Program   = Render_PCR_Program;
window.Render_Chart_Temp    = Render_Chart_Temp;
window.Render_Tool          = Render_Tool;