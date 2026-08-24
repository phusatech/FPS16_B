let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const main = document.getElementById('pcr-main');
    const ov   = document.getElementById('page-loading');
    if (main) main.style.visibility = '';
    if (ov) { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
setTimeout(_reveal, 3000);

function Render_PCR_Admin() {
    loadHeader();

    document.addEventListener("headerLoaded", () => {
        _reveal();
        initHeaderLogic();
    });

    // 3. Khởi tạo sự kiện cho các nút sau khi DOM đã sẵn sàng
    // Sử dụng DOMContentLoaded để đảm bảo các nút đã xuất hiện
    document.addEventListener("DOMContentLoaded", () => {
        setupNavigation();
    });
}

function setupNavigation() {
    const wifiBtn = document.querySelector('[data-option="wifi_config"]');
    const updateBtn = document.querySelector('[data-option="update_protocol"]');
    const backBtn = document.getElementById("btn-back");

    wifiBtn?.addEventListener("click", () => {
        if (typeof goToPage === 'function') {
            goToPage("PCR/features/PCR_Wifi_Config/pcr_wifi_config.html", "none", "wifi_config");
        }
    });

    updateBtn?.addEventListener("click", () => {
        if (typeof goToPage === 'function') {
            goToPage("PCR/features/PCR_Update_Protocol/pcr_update_protocol.html", "none", "update_protocol");
        }
    });

    backBtn?.addEventListener("click", () => {
        // Kiểm tra hàm goToPage có tồn tại không trước khi gọi
        if (typeof goToPage === 'function') {
            goToPage("PCR/features/PCR_Base/pcr_base.html", "none", "base");
        } else {
            window.history.back();
        }
    });
}

// Chạy khởi tạo
Render_PCR_Admin();