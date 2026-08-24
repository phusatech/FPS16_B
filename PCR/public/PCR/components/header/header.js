function _injectNavbarStyles() {
  if (document.getElementById("_navbar-injected-css")) return;
  const s = document.createElement("style");
  s.id = "_navbar-injected-css";
  s.textContent = `
.navbar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;position:sticky;top:0;z-index:1000;background:linear-gradient(145deg,#0a1a2f 0%,#07101f 100%);color:#e0f2fe;border-bottom:1px solid rgba(34,211,238,0.25);box-shadow:0 8px 22px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.04)}
.navbar-left{display:flex;align-items:center;gap:10px}
.navbar-right{display:flex;align-items:center;gap:8px}
.navbar-title{font-size:20px;font-weight:700;color:#e0f2fe;user-select:none;-webkit-user-select:none}
  `;
  document.head.appendChild(s);
}

function loadHeader() {
  _injectNavbarStyles();
  fetch("../../components/header/header.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("afterbegin", html);
      const title = document.getElementById("deviceTitle");
      if (title) { title.textContent = ""; title.style.opacity = "0"; }
      // Measure navbar height once after insertion and expose as CSS variable
      const navEl = document.querySelector(".navbar");
      const navH  = navEl ? navEl.offsetHeight : 49;
      document.documentElement.style.setProperty("--navbar-h", navH + "px");
      initHeaderLogic();
      document.dispatchEvent(new Event("headerLoaded"));
      _startTitleWatch();
    });
}

function _buildTitleText(info) {
  const parts = [];
  if (info.host_name)   parts.push(info.host_name);
  if (info.seri_number) parts.push("PCR " + info.seri_number);
  return parts.join(" - ") || "FPS-PCR";
}

function _revealTitle(text) {
  const el = document.getElementById("deviceTitle");
  if (!el || el.style.opacity === "1") return;
  el.textContent = text;
  el.style.transition = "opacity 0.35s";
  el.style.opacity = "1";
}

// ── Error Banner ─────────────────────────────────────────────────────────────
// Trạng thái lỗi dùng chung — cập nhật từ hardware flags + power loss
let _errState = { sensor: 0, power: 0, timeout: 0, memory: 0, power_loss: 0 };

function _ensureErrorBannerStyle() {
  if (document.getElementById("_err-banner-css")) return;
  const s = document.createElement("style");
  s.id = "_err-banner-css";
  s.textContent = `
#device-error-banner{
  display:none;
  position:fixed;
  top:0; left:50%;
  transform:translateX(-50%);
  z-index:9998;
  background:#991b1b;
  color:#fef2f2;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:13px;font-weight:700;
  padding:7px 16px;
  align-items:center;gap:8px;
  border-radius:0 0 10px 10px;
  max-width:96vw;
  flex-wrap:wrap;
  animation:_errGlow 1s ease-in-out infinite;
}
@keyframes _errGlow{
  0%,100%{box-shadow:0 0 6px 1px rgba(239,68,68,0.5)}
  50%    {box-shadow:0 0 18px 4px rgba(239,68,68,0.95)}
}
#device-error-banner .err-icon{font-size:15px;flex-shrink:0}
`;
  document.head.appendChild(s);
}

function _refreshErrorBanner() {
  const s = _errState;
  const hasFlagErr = s.sensor || s.power || s.timeout || s.memory || s.power_loss;

  if (!hasFlagErr) {
    const b = document.getElementById("device-error-banner");
    if (b) b.style.display = "none";
    return;
  }

  _ensureErrorBannerStyle();
  let banner = document.getElementById("device-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "device-error-banner";
    document.body.appendChild(banner);
  }

  const flagParts = [];
  if (s.sensor)     flagParts.push("Sensor Error");
  if (s.power)      flagParts.push("Power Error");
  if (s.timeout)    flagParts.push("Timeout Error");
  if (s.memory)     flagParts.push("Memory Error");
  if (s.power_loss) flagParts.push("Power Loss");

  banner.innerHTML = `<span class="err-icon">⚠</span><span class="err-text">${flagParts.join(" &amp; ")}</span>`;
  banner.style.display = "flex";
}

function _showErrorBanner(errSensor, errPower, errTimeout, errMemory) {
  _errState.sensor  = errSensor  || 0;
  _errState.power   = errPower   || 0;
  _errState.timeout = errTimeout || 0;
  _errState.memory  = errMemory  || 0;
  _refreshErrorBanner();
}

function _hideErrorBanner() {
  _errState.sensor  = 0;
  _errState.power   = 0;
  _errState.timeout = 0;
  _errState.memory  = 0;
  // power_loss không reset ở đây — chỉ clear khi user bấm X trên modal
  _refreshErrorBanner();
}

function _startTitleWatch() {
  const deadline = Date.now() + 3500;
  const poll = setInterval(() => {
    if (!window.API) {
      if (Date.now() > deadline) { clearInterval(poll); _revealTitle("FPS-PCR"); }
      return;
    }
    clearInterval(poll);
    window.API.subscribe("device_info", info => _revealTitle(_buildTitleText(info)));
    window.API.subscribe("calib:device_result", info => _revealTitle(_buildTitleText(info)));
    window.API.subscribe("device:error", ({ hasError, Error_Sensor, Error_Power, Error_Timeout, Error_Memory }) => {
      if (hasError) _showErrorBanner(Error_Sensor, Error_Power, Error_Timeout, Error_Memory);
      else          _hideErrorBanner();
    });

    // Power loss → hiện banner + panel chính giữa màn hình
    window.API.subscribe("device:power_loss_alert", ({ message }) => {
      _errState.power_loss = 1;
      _refreshErrorBanner();
      Show_Notification(
        message || "The system was running when power was cut. It has been automatically resumed.",
        "Power_Loss_Alert"
      ).then(() => {
        // Banner vẫn giữ "Power Loss" sau khi user bấm X — chỉ ghi nhận đã đọc
        if (window.API) window.API.send("device:ack_power_loss");
      });
    });

    window.API.send("device:get_error_state");   // lấy trạng thái flag lỗi ngay sau khi subscribe
    window.API.send("device:get_power_loss");    // kiểm tra có mất nguồn trước đó không
    window.API.send("calib:device_read", {});
    setTimeout(() => _revealTitle("FPS-PCR"), 3000);
  }, 50);
}

function initHeaderLogic() {
  const buttons = document.querySelectorAll("#sideMenu button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-page");
      goToPage(page);
    });
  });

  const title = document.getElementById("deviceTitle");
  let holdTimer = null;

  function startHold(e) {
    e.preventDefault();
    holdTimer = setTimeout(() => {
      showPasswordModal();
    }, 5000);
  }

  function cancelHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  title.addEventListener("pointerdown", startHold, { passive: false });
  title.addEventListener("pointerup",   cancelHold);
  title.addEventListener("pointerleave", cancelHold);
  title.addEventListener("touchstart",  (e) => e.preventDefault(), { passive: false });
  title.addEventListener("contextmenu", (e) => e.preventDefault());
}

// =====================================================================
// PASSWORD MODAL — injected once, reused on every call
// =====================================================================
function showPasswordModal() {
  let modal = document.getElementById("calib-pw-modal");

  if (!modal) {
    // Inject styles
    const style = document.createElement("style");
    style.textContent = `
      #calib-pw-modal {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(2, 4, 10, 0.80);
        backdrop-filter: blur(10px);
      }
      .cpw-card {
        background: radial-gradient(circle at 50% 20%, #0f1a2f 0%, #070b14 80%, #02040a 100%);
        border: 1px solid rgba(148,163,184,0.18);
        border-radius: 18px;
        box-shadow:
          0 30px 70px rgba(0,0,0,0.85),
          inset 0 1px 0 rgba(255,255,255,0.06);
        padding: 34px 28px 28px;
        width: min(340px, 88vw);
        display: flex; flex-direction: column; gap: 18px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .cpw-title {
        font-size: 13px; font-weight: 700;
        color: #94a3b8;
        text-align: center;
        letter-spacing: 1.6px;
        text-transform: uppercase;
      }
      .cpw-input {
        padding: 13px 14px;
        border-radius: 10px;
        border: 1px solid rgba(148,163,184,0.15);
        background: rgba(0,0,0,0.45);
        color: #f1f5f9;
        font-size: 28px;
        letter-spacing: 0;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
        text-align: center;
        width: 100%;
        box-sizing: border-box;
      }
      .cpw-input:focus { border-color: rgba(148,163,184,0.4); }
      .cpw-error {
        font-size: 12px; color: #f87171;
        text-align: center; min-height: 16px;
        letter-spacing: 0.3px;
        margin-top: -6px;
      }
      .cpw-actions { display: flex; gap: 10px; }
      .cpw-cancel {
        flex: 1; padding: 13px;
        border-radius: 10px;
        border: 1px solid rgba(148,163,184,0.13);
        background: rgba(255,255,255,0.05);
        color: #64748b;
        font-size: 13px; font-weight: 700;
        font-family: inherit; cursor: pointer;
        transition: all 0.2s; letter-spacing: 0.3px;
      }
      .cpw-cancel:hover { background: rgba(255,255,255,0.09); color: #94a3b8; }
      .cpw-ok {
        flex: 1.6; padding: 13px;
        border-radius: 10px;
        background: linear-gradient(
          145deg,
          #f8fafc 0%, #e2e8f0 20%, #94a3b8 55%, #cbd5e1 80%, #f1f5f9 100%
        );
        border: 1px solid rgba(148,163,184,0.35);
        color: #0f172a;
        font-size: 14px; font-weight: 700;
        font-family: inherit; cursor: pointer;
        letter-spacing: 0.5px;
        box-shadow:
          inset 0 1px 2px rgba(255,255,255,0.7),
          inset -1px -1px 4px rgba(0,0,0,0.15),
          0 8px 22px rgba(0,0,0,0.45);
        transition: all 0.22s;
      }
      .cpw-ok:hover { filter: brightness(1.08); transform: translateY(-1px); }
      .cpw-ok:active { transform: scale(0.98); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
    `;
    document.head.appendChild(style);

    // Create modal element
    modal = document.createElement("div");
    modal.id = "calib-pw-modal";
    modal.innerHTML = `
      <div class="cpw-card">
        <div class="cpw-title">Calibration Access</div>
        <input type="password" id="cpw-input" class="cpw-input"
               placeholder="••••" maxlength="20"
               autocomplete="off">
        <div class="cpw-error" id="cpw-error"></div>
        <div class="cpw-actions">
          <button class="cpw-btn cpw-cancel" id="cpw-cancel">Cancel</button>
          <button class="cpw-btn cpw-ok"     id="cpw-ok">Enter</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("cpw-cancel").addEventListener("click", closeModal);
    document.getElementById("cpw-ok").addEventListener("click", checkPassword);
    document.getElementById("cpw-input").addEventListener("keydown", e => {
      if (e.key === "Enter") checkPassword();
      if (e.key === "Escape") closeModal();
    });

    // Click outside card to dismiss
    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });
  }

  modal.style.display = "flex";
  const inp = document.getElementById("cpw-input");
  inp.value = "";
  document.getElementById("cpw-error").textContent = "";
  setTimeout(() => inp.focus(), 80);
}

function closeModal() {
  const modal = document.getElementById("calib-pw-modal");
  if (modal) modal.style.display = "none";
}

function checkPassword() {
  const inp = document.getElementById("cpw-input");
  const err = document.getElementById("cpw-error");
  if (inp.value === "1235") {
    closeModal();
    if (typeof goToPage === "function") {
      goToPage("PCR/features/PCR_Calib/pcr_calib.html", "calib", "none");
    } else {
      window.location.replace("/PCR/features/PCR_Calib/pcr_calib.html");
    }
  } else {
    err.textContent = "Incorrect password";
    inp.value = "";
    inp.focus();
    inp.style.borderColor = "rgba(239,68,68,0.7)";
    setTimeout(() => { inp.style.borderColor = ""; }, 800);
  }
}
