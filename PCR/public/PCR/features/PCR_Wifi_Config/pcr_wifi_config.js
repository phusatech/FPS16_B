const socket = io();

loadHeader();

let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const main = document.getElementById('pcr-main');
    const ov   = document.getElementById('page-loading');
    if (main) main.style.visibility = '';
    if (ov) { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
document.addEventListener('headerLoaded', () => { _reveal(); initHeaderLogic(); }, { once: true });
setTimeout(_reveal, 3000);

// ─── Elements ───────────────────────────────────────────────
const lblStatus   = document.getElementById("wifi-status-label");
const inputSSID   = document.getElementById("wifi-ssid");
const inputPass   = document.getElementById("wifi-password");
const chkShowPass = document.getElementById("showPass");
const wifiList    = document.getElementById("wifi-list");
const btnConnect  = document.getElementById("btnConnect");
const btnBack     = document.getElementById("btn-back");

// ─── State ──────────────────────────────────────────────────
let wifiConnected = false;
let scanInterval  = null;
let isConnecting  = false;

// ─── Helpers ────────────────────────────────────────────────
function getWifiIcon(dBm) {
    let opacity = 1;
    if      (dBm >= 75) opacity = 1;
    else if (dBm >= 50) opacity = 0.7;
    else if (dBm >= 30) opacity = 0.3;
    else                opacity = 0.2;
    return `<img src="../../assets/wifi.png" style="width:18px;height:18px;opacity:${opacity}">`;
}

function showConnectedState(ssid) {
    lblStatus.textContent = `Connected: ${ssid}`;
}

function showDisconnectedState() {
    lblStatus.textContent = "Not connected";
}

// ─── Scan (every 5 s) ───────────────────────────────────────
function startAutoScan() {
    if (scanInterval) return;
    socket.emit("wifi:scan");
    scanInterval = setInterval(() => socket.emit("wifi:scan"), 5000);
}

function stopAutoScan() {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
}

// ─── Navigation ─────────────────────────────────────────────
socket.on("Go_To_Page_Web", (data) => {
    if (!data?.pagePath) return;
    const target = data.pagePath.startsWith("/") ? data.pagePath : `/${data.pagePath}`;
    if (decodeURIComponent(window.location.pathname) !== target) {
        window.location.replace(target);
    }
});

// ─── Socket events ──────────────────────────────────────────
socket.on("disconnect", () => {
    if (isConnecting) {
        Hide_Loading?.();
        isConnecting = false;
        inputSSID.value = "";
        inputPass.value = "";
    }
});

socket.on("connect", () => {
    socket.emit("wifi:get_status");
});

socket.on("wifi:status", (data) => {
    wifiConnected = data.connected;
    if (wifiConnected && data.ssid) showConnectedState(data.ssid);
    else showDisconnectedState();
});

socket.on("wifi:scan_result", (list) => {
    wifiList.innerHTML = "";
    if (!list || list.length === 0) {
        const li = document.createElement("li");
        li.className = "wifi-item wifi-empty";
        li.textContent = "No networks found";
        wifiList.appendChild(li);
        return;
    }
    list.forEach(item => {
        const li = document.createElement("li");
        li.className = "wifi-item";
        li.innerHTML = `
            <span class="wifi-name">${item.ssid}</span>
            <span class="wifi-icon">${getWifiIcon(item.strength)}</span>
        `;
        li.addEventListener("click", () => {
            inputSSID.value = item.ssid;
            inputPass.focus();
        });
        wifiList.appendChild(li);
    });
});

socket.on("wifi:connect_result", (data) => {
    Hide_Loading?.();
    isConnecting = false;
    if (data.success) {
        wifiConnected = true;
        showConnectedState(data.ssid);
        inputSSID.value = "";
        inputPass.value = "";
        Show_Notification("Connected successfully!", "Cancel");
    } else {
        Show_Notification(`Failed: ${data.message || "Unknown error"}`, "Cancel");
    }
});

// ─── DOM ready ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

    // Show / hide password
    chkShowPass.addEventListener("change", () => {
        inputPass.type = chkShowPass.checked ? "text" : "password";
    });

    // Get current status + start scanning immediately
    socket.emit("wifi:get_status");
    startAutoScan();

    // Connect
    btnConnect.addEventListener("click", async () => {
        const ssid     = inputSSID.value.trim();
        const password = inputPass.value.trim();

        if (!ssid) {
            Show_Notification("Please select a network or enter SSID", "Cancel");
            return;
        }

        const confirmed = await Show_Notification(
            `Connect to "${ssid}"?`, "Yes_No"
        ).catch(() => false);
        if (!confirmed) return;

        isConnecting = true;
        stopAutoScan();
        socket.emit("wifi:connect", { ssid, password });
        Show_Loading();
    });

    // Back
    btnBack.addEventListener("click", () => {
        stopAutoScan();
        socket.emit("Save_Page_To_Server", {
            pagePath:     "PCR/features/PCR_Admin/pcr_admin.html",
            tabStatus:    "none",
            optionStatus: "admin"
        });
    });
});
