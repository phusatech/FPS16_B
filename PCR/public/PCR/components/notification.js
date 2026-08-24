window.loading = null;
window.loading_Start = 0;

/*==================== Tạo loading=================================*/
function Hide_Loading()
{
  if(loading != null) // Nếu trước đó hiện loading
  {
    const elapsed = Date.now() - loading_Start;
    const waitTime = Math.max(0, 1000 - elapsed); // Timeout sau 2s
    
    setTimeout(() => 
    {
      if (loading) 
      {
        loading.close();
        loading = null;
      }
    }, waitTime);
  }
}

async function Show_Loading()
{
  loading_Start = Date.now(); 
  loading = await Show_Notification("Loading...", "Loading");
}


/*==================== Tạo notificacation==================================*/
function Show_Notification(message, type = "Yes_No") {
  return new Promise((resolve) => {

        // --- Xóa overlay cũ nếu có ---
    const Old_Overlay = document.getElementById("notification-overlay");
    if (Old_Overlay) Old_Overlay.remove(); // Xóa nó 

    // --- Overlay ---
    const overlay = document.createElement("div");
    overlay.id = "notification-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    });

    // --- Box (dark base) ---
    const box = document.createElement("div");
    const _darkBox = {
      background: "radial-gradient(circle at 50% 15%, #0f1e35 0%, #070e1c 75%, #020408 100%)",
      border: "1px solid rgba(34,211,238,0.18)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
      borderRadius: "18px",
      padding: "28px 28px 24px",
      textAlign: "center",
      minWidth: "270px",
      maxWidth: "88vw",
      color: "#e0f2fe",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      boxSizing: "border-box",
    };
    const _darkTxt  = `font-size:15px;font-weight:600;color:#e0f2fe;font-family:inherit;margin:0 0 20px;line-height:1.5;`;
    const _btnGhost = `flex:1;padding:12px;border-radius:10px;border:1px solid rgba(148,163,184,0.15);background:rgba(255,255,255,0.05);color:#94a3b8;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.3px;`;
    const _btnCyan  = `flex:1;padding:12px;border-radius:10px;background:linear-gradient(135deg,#06b6d4 0%,#0284c7 100%);border:1px solid rgba(6,182,212,0.35);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.3px;box-shadow:0 4px 18px rgba(6,182,212,0.3);`;

    // --- Nội dung ---
    let contentHTML = "";

    const buttonStyle = `padding:8px;border:none;border-radius:8px;color:#fff;cursor:pointer;font-family:'Noto Serif',serif;font-size:18px;flex:1;`;

    if (type === "Yes_No") {
      Object.assign(box.style, _darkBox);
      contentHTML = `
        <p style="${_darkTxt}">${message}</p>
        <div style="display:flex;gap:10px;width:100%;">
          <button id="notify-no"  style="${_btnGhost}">No</button>
          <button id="notify-yes" style="${_btnCyan}">Yes</button>
        </div>
      `;
    }
    else if (type === "Cancel") {
      Object.assign(box.style, _darkBox);
      contentHTML = `
        <p style="${_darkTxt}">${message}</p>
        <button id="notify-cancel"
          style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(148,163,184,0.15);background:rgba(255,255,255,0.05);color:#94a3b8;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
          OK
        </button>
      `;
    } 
    else if (type === "Loading") {
      contentHTML = `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div class="spinner" style="
            width:40px;
            height:40px;
            border:4px solid #ddd;
            border-top:4px solid #007bff;
            border-radius:50%;
            animation: spin 1s linear infinite;
            margin-bottom:12px;
          "></div>
          <p style="font-size:18px; font-family:'Noto Serif', serif; margin:0;">${message}</p>
        </div>
      `;

      // CSS animation chỉ thêm 1 lần
      if (!document.getElementById("spinner-style")) {
        const style = document.createElement("style");
        style.id = "spinner-style";
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } 

    else if (type === "Save_Protocol") {
  Object.assign(box.style, _darkBox);
  contentHTML = `
    <p style="${_darkTxt}">${message}</p>
    <input id="protocol-name" type="text" placeholder="Protocol name…"
      style="width:100%;padding:11px 14px;border:1px solid rgba(148,163,184,0.2);border-radius:10px;
             background:rgba(0,0,0,0.4);color:#f1f5f9;font-size:15px;font-family:inherit;
             outline:none;margin-bottom:18px;box-sizing:border-box;"
      maxlength="27"
      oninput="limitUTF8Bytes(this, 27)"
      autocomplete="off"
      autocapitalize="words"
      />
    <div style="display:flex;gap:10px;width:100%;">
      <button id="notify-cancel" style="${_btnGhost}">Cancel</button>
      <button id="notify-save"   style="${_btnCyan}">Save</button>
    </div>
  `;

  box.innerHTML = contentHTML;
  overlay.appendChild(box);        // append box vào overlay
  document.body.appendChild(overlay); // append overlay vào DOM

  const input = document.getElementById("protocol-name"); // bây giờ chắc chắn không null

  // 🔹 Bật nhận dạng giọng nói nếu trình duyệt hỗ trợ
  if (input && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) 
  {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // hoặc 'vi-VN' nếu muốn tiếng Việt
    recognition.continuous = false;
    recognition.interimResults = false;

    // Khi input được focus, bật mic
    input.addEventListener('focus', () => recognition.start());

    recognition.onresult = (event) => 
    {
      const transcript = event.results[0][0].transcript;
      input.value = transcript; // tự động điền văn bản
    };

    recognition.onerror = (event) => 
    {
      console.warn("Speech recognition error:", event.error);
    };
  }

  // 🔹 Sự kiện Save / Cancel
  document.getElementById("notify-save").onclick = async () => 
  {
    const name = input.value.trim();
    document.body.removeChild(overlay);
    resolve(null);

    if (name) {
      PROTOCOL_NAME = name; // Lấy tên protocol
      DATA_TX_LENGHT = Pack_Save_Protocol(DATA_TX,save_new);
      Pack_Data(DEVICE.PCR_ID, PCR_REG.SAVE_PROTOCOL_EEPROM, DATA_TX, DATA_TX_LENGHT, "Web_PCR"); 
    }
  };

  document.getElementById("notify-cancel").onclick = () => 
  {
    document.body.removeChild(overlay);
    resolve(null);
  };
}


    else if (type === "Start_Confirm") {
      Object.assign(box.style, _darkBox);
      contentHTML = `
        <div style="text-align:center;margin-bottom:10px;">
          <img src="/PCR/assets/PCR_CHEMICAL_EQUIPMENT.png"
               style="width:36px;height:36px;object-fit:contain;display:inline-block;opacity:0.9;">
        </div>
        <p style="font-size:17px;font-weight:600;color:#e0f2fe;font-family:inherit;
                  margin:0 0 20px;line-height:1.45;text-align:center;">${message}</p>
        <div style="display:flex;gap:10px;width:100%;">
          <button id="notify-no"  style="${_btnGhost}">No</button>
          <button id="notify-yes" style="${_btnCyan}">Yes</button>
        </div>
      `;
    }

    else if (type === "Power_Loss_Alert") {
      const _pwrLines = message.split("\n").map(l => l.trim()).filter(Boolean);
      Object.assign(box.style, {
        background: "#0f1e35",
        border: "none",
        borderLeft: "4px solid #f59e0b",
        boxShadow: "0 20px 50px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
        borderRadius: "14px",
        padding: "18px 20px 18px 20px",
        minWidth: "290px",
        maxWidth: "88vw",
        color: "#e0f2fe",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        boxSizing: "border-box",
        position: "relative",
        textAlign: "left",
      });
      contentHTML = `
        <button id="notify-ack"
          style="position:absolute;top:10px;right:12px;background:none;border:none;
                 color:rgba(148,163,184,0.4);font-size:17px;font-weight:700;
                 cursor:pointer;line-height:1;padding:4px 7px;border-radius:5px;font-family:inherit;"
          onmouseover="this.style.color='#94a3b8'" onmouseout="this.style.color='rgba(148,163,184,0.4)'">✕</button>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:16px;line-height:1;">⚠</span>
          <span style="font-size:12px;font-weight:700;color:#f59e0b;letter-spacing:1px;text-transform:uppercase;">Power Loss Warning</span>
        </div>
        ${_pwrLines.map((line, idx) => {
          let col = '#cbd5e1';
          let fw  = '400';
          let fs  = '12px';
          if (idx === 0) { col = '#cbd5e1'; fw = '500'; fs = '13px'; }
          else if (idx === 1) { col = '#38bdf8'; fw = '500'; }
          else if (line.toLowerCase().includes('outage') || line.toLowerCase().includes('duration')) { col = '#fbbf24'; fw = '600'; }
          else { col = '#94a3b8'; }
          return `<p style="font-size:${fs};font-weight:${fw};color:${col};font-family:inherit;margin:0 0 ${idx === _pwrLines.length - 1 ? '0' : '6px'} 0;line-height:1.5;">${line}</p>`;
        }).join("")}
      `;
    }

    else if (type === "Date_Time") {
      contentHTML = `
        <p style="font-size:18px; font-family:'Noto Serif', serif; margin-bottom:10px;">${message}</p>
        <input id="datetime-input" type="text" placeholder="DD:MM:YYYY  HH:MM:SS"
          style="width:90%; padding:6px; border:1px solid #ccc; border-radius:6px;
                 margin-bottom:15px; font-size:18px; font-family:'Noto Serif', serif; outline:none; text-align:center;" 
                 maxlength="20" />
        <div style="display:flex; gap:10px; width:90%; margin:0 auto;">
          <button id="notify-ok" style="${buttonStyle}; background:#28a745;">OK</button>
          <button id="notify-cancel" style="${buttonStyle}; background:#dc3545;">Cancel</button>
        </div>
      `;
    }

    box.innerHTML = contentHTML;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // --- Sự kiện ---
    if (type === "Yes_No") {
      document.getElementById("notify-yes").onclick = () => { document.body.removeChild(overlay); resolve(true); };
      document.getElementById("notify-no").onclick = () => { document.body.removeChild(overlay); resolve(false); };
    } 
    
    else if (type === "Cancel") {
      document.getElementById("notify-cancel").onclick = () => { document.body.removeChild(overlay); resolve(); };
    } 
    
    else if (type === "Loading") {
      resolve({
        close: () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
      });
    } 
    
    else if (type === "Save_Protocol")
    {
        document.getElementById("notify-save").onclick = async () =>
        {
            const name = document.getElementById("protocol-name").value.trim();
            document.body.removeChild(overlay);
            resolve(name);
        };

        document.getElementById("notify-cancel").onclick = () =>
        {
            document.body.removeChild(overlay);
            resolve(null);
        };
    }

    else if (type === "Date_Time") {
      const input = document.getElementById("datetime-input");
      input.inputMode = "numeric";  
      
      // 🔹 Tự động định dạng khi nhập
      input.addEventListener("input", (e) => 
      {
        let val = e.target.value.replace(/\D/g, ""); // chỉ lấy số
        let out = "";

        // Chèn dấu / : và khoảng trắng tự động theo vị trí
        if (val.length > 0) out += val.substring(0, 2);
        if (val.length > 2) out += "/" + val.substring(2, 4);
        if (val.length > 4) out += "/" + val.substring(4, 8);
        if (val.length > 8) out += "  " + val.substring(8, 10);
        if (val.length > 10) out += ":" + val.substring(10, 12);
        if (val.length > 12) out += ":" + val.substring(12, 14);

        e.target.value = out;
      });

      // 🔹 Khi nhấn OK
      document.getElementById("notify-ok").onclick = () => 
      {
        const val = input.value.trim();
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s{2}(\d{2}):(\d{2}):(\d{2})$/;

        if (!regex.test(val)) {
          alert("⚠️ Invalid input format!\nCorrect format: DD/MM/YYYY  HH:MM:SS");
          return;
        }

        const [, d, m, y, h, min, s] = val.match(regex);

        // Kiểm tra giới hạn hợp lệ
        const day = +d, month = +m, year = +y, hour = +h, minute = +min, second = +s;
        const valid =
          day >= 1 && day <= 31 &&
          month >= 1 && month <= 12 &&
          year >= 2000 && year <= 2100 &&
          hour >= 0 && hour <= 23 &&
          minute >= 0 && minute <= 59 &&
          second >= 0 && second <= 59;

        if (!valid) 
        {
          alert("⚠️ Invalid value!\nPlease check date or time range.");
          return;
        }

        document.body.removeChild(overlay);
        resolve({ day, month, year, hour, minute, second });
      };

      // 🔹 Khi nhấn Cancel
      document.getElementById("notify-cancel").onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
    }

    else if (type === "Start_Confirm") {
      document.getElementById("notify-yes").onclick = () => { document.body.removeChild(overlay); resolve(true); };
      document.getElementById("notify-no").onclick  = () => { document.body.removeChild(overlay); resolve(false); };
    }

    else if (type === "Power_Loss_Alert") {
      document.getElementById("notify-ack").onclick = () => { document.body.removeChild(overlay); resolve(); };
    }
  });
}

function Show_Keyboard_Input({title = "Enter password",type = "number", maxLength = 4 }) {
  return new Promise((resolve) => {

    // --- Xóa overlay cũ ---
    const old = document.getElementById("keyboard-overlay");
    if (old) old.remove();

    // --- Overlay ---
    const overlay = document.createElement("div");
    overlay.id = "keyboard-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    });

    // --- Box ---
    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff",
      padding: "20px",
      borderRadius: "12px",
      minWidth: "260px",
      textAlign: "center",
      boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
    });

    box.innerHTML = `
      <p style="font-size:18px; margin-bottom:10px;">${title}</p>
      <input id="keyboard-input"
        type="${type}"
        maxlength="${maxLength}"
        style="width:90%; padding:8px; border-radius:8px; font-size:18px; text-align:center;"
        autocomplete="off"
      >
      <p id="keyboard-error"
         style="color:red; display:none; margin-top:6px;">
         Wrong password
      </p>
      <div style="display:flex; gap:10px; margin-top:15px;">
        <button id="keyboard-ok"
          style="flex:1; padding:8px; background:#28a745; color:#fff; border:none; border-radius:8px;">
          OK
        </button>
        <button id="keyboard-cancel"
          style="flex:1; padding:8px; background:#dc3545; color:#fff; border:none; border-radius:8px;">
          Cancel
        </button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const input = document.getElementById("keyboard-input");
    const error = document.getElementById("keyboard-error");

    input.focus();

    // --- OK ---
    document.getElementById("keyboard-ok").onclick = () => {
      const val = input.value.trim();
      document.body.removeChild(overlay);
      resolve(val);
    };

    // --- Cancel ---
    document.getElementById("keyboard-cancel").onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
  });
}

async function Require_Admin_Password(onSuccess) {
  const val = await Show_Keyboard_Input({ title: "Enter password", type: "password", maxLength: 4 });

  if (val === null) return;

  if (val === PASS_ADMIN) 
  {
    onSuccess();
  } 
  else 
  {
    Show_Notification("Wrong password", "Cancel");
  }
}

// Phơi bày ra toàn cục hệ thống
window.Hide_Loading = Hide_Loading;
window.Show_Loading = Show_Loading;
window.Show_Notification = Show_Notification;
window.Show_Keyboard_Input = Show_Keyboard_Input;
window.Require_Admin_Password = Require_Admin_Password;