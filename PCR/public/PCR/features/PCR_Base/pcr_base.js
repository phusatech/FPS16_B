function OpenTab(func)
{
    if (func === "NEW")
    {
      goToPage("PCR/features/PCR_Session_Info/pcr_session_info.html" , "session_info", "new");
    }
    else if (func === "SAVED")
    {
      goToPage("PCR/features/PCR_Saved/pcr_saved.html", "saved", "new");
    }
    else if (func === "HISTORY")
    {
      goToPage("PCR/features/PCR_History/pcr_history.html", "history", "new");
    }
    else if (func === "ADMIN")
    {
      goToPage("PCR/features/PCR_Admin/pcr_admin.html", "admin", "new");
    }
    else if (func === "RUN_REVIEW")
    {
      goToPage("PCR/features/PCR_Run_Review/pcr_run_review.html", "run_review", "none");
    }
}

// ── Two-condition reveal: need BOTH header loaded AND role known ──
let _headerReady  = false;
let _roleReady    = false;
let _revealed     = false;

function _tryReveal() {
  if (_headerReady && _roleReady && !_revealed) {
    _revealed = true;
    const main    = document.getElementById('pcr-main');
    const overlay = document.getElementById('base-loading');
    if (main)    main.style.visibility = '';
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
  }
}

// Fallback: reveal unconditionally after 3s
function _forceReveal() {
  _headerReady = true;
  _roleReady   = true;
  _tryReveal();
}

function applyRole(role) {
  try { sessionStorage.setItem('device_role', role); } catch (_) {}
  const hiddenForCustomer = ['btn-saved', 'btn-analysis'];
  hiddenForCustomer.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = role === 'customer' ? 'none' : '';
  });
  _roleReady = true;
  _tryReveal();
}

function Render_PCR_Base()
{
  loadHeader();

  // Condition 1: header HTML injected
  document.addEventListener("headerLoaded", () => {
    initHeaderLogic();
    _headerReady = true;
    _tryReveal();
  });

  // Condition 2: role known — check cache first for instant result
  try {
    const cached = sessionStorage.getItem('device_role');
    if (cached) applyRole(cached);
  } catch (_) {}

  // Always sync role from server (authoritative, updates cache)
  const waitForAPI = setInterval(() => {
    if (!window.API) return;
    clearInterval(waitForAPI);
    window.API.subscribe('device_info', (info) => {
      if (info && info.role) applyRole(info.role);
    });
    window.API.subscribe('calib:device_result', (info) => {
      if (info && info.role) applyRole(info.role);
    });
    window.API.send('calib:device_read', {});
  }, 50);
}

Render_PCR_Base();

// Safety timeout — never let UI stay hidden
setTimeout(_forceReveal, 3000);
