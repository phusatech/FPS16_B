// Khởi tạo đối tượng kết nối Socket.io real-time trực tiếp với máy tính nhúng (Trình duyệt tự hiểu)
// const socket = io();
import { API } from "../../core/api.js";
import { subscribe } from "../../core/socket_client.js";

window.API   = API;

let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const main = document.getElementById('pcr-main');
    const ov   = document.getElementById('page-loading');
    if (main) main.style.visibility = '';
    if (ov) { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
document.addEventListener('headerLoaded', _reveal, { once: true });
setTimeout(_reveal, 3000);

// Biến toàn cục lưu trữ trạng thái hàng nào trong danh sách đang được người dùng bấm mở rộng
let activeRowIdentifier = null; 
let allProtocolsData = []; // Biến lưu toàn bộ dữ liệu từ server

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo Header hệ thống nếu có hàm toàn cục
    if (typeof loadHeader === 'function') loadHeader();
    
    // Phát tín hiệu yêu cầu Server quét cây thư mục Protocols/YYYY.MM.DD/ để lấy danh sách
     window.API.send("protocols:get_list");

    // Sự kiện khi thay đổi ngày trong dropdown
    document.getElementById('date-filter-select').addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        const filtered = selectedDate === 'all' 
            ? allProtocolsData 
            : allProtocolsData.filter(p => p.Date_Saved === selectedDate);
        renderRegistry(filtered);
    });

    subscribe("protocols:list_result", (response) => {
        if (response.success) {
            allProtocolsData = response.protocols;
            updateDateFilterDropdown(allProtocolsData); // Cập nhật danh sách ngày
            renderRegistry(allProtocolsData); // Render toàn bộ ban đầu
        }
    });

    // Hàm render danh sách đã lọc
function renderRegistry(protocols) {
    const stackContainer = document.getElementById('protocol-registry-stack');
    stackContainer.innerHTML = '';

    if (!protocols || protocols.length === 0) {
        stackContainer.innerHTML = `<div class="ux-loading"><p>No protocols found.</p></div>`;
        return;
    }

    protocols.forEach(proto => {
        const row = document.createElement('div');
        const uniqueId = `${proto.dateFolder.replace(/\./g, '_')}_${proto.fileName.replace(/\./g, '_')}`;
        
        row.className = `registry-row ${activeRowIdentifier === uniqueId ? 'is-expanded' : ''}`;
        row.setAttribute('data-name', proto.PROTOCOL_NAME);

        row.innerHTML = `
            <div class="row-master-trigger">
                <div class="meta-zone">
                    <h3>${proto.PROTOCOL_NAME}</h3>
                    <span><i class="fa-regular fa-clock"></i> ${proto.Date_Saved} ${proto.Time_Saved}</span>
                    <div class="quick-chips">
                        <div class="chip-item">Lid: ${proto.Lid}°C</div>
                        <div class="chip-item">Vol: ${proto.Liquid}µL</div>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-down trigger-arrow"></i>
            </div>
            <div class="row-detail-drawer" id="drawer-${uniqueId}">
                <div class="drawer-inner">
                    <div id="stages-container-${uniqueId}"></div>
                    <div class="drawer-action-row">
                        <button class="action-horizontal-btn btn-horizontal-delete" onclick="executeDeleteClick('${proto.dateFolder}', '${proto.fileName}', '${proto.PROTOCOL_NAME}', event)">Delete</button>
                        <button class="action-horizontal-btn btn-horizontal-open" onclick="executeOpenClick('${proto.dateFolder}', '${proto.fileName}', event)">Open</button>
                    </div>
                </div>
            </div>
        `;

        row.querySelector('.row-master-trigger').addEventListener('click', () => {
            if (row.classList.contains('is-expanded')) {
                row.classList.remove('is-expanded');
                activeRowIdentifier = null;
            } else {
                document.querySelectorAll('.registry-row.is-expanded').forEach(el => el.classList.remove('is-expanded'));
                row.classList.add('is-expanded');
                activeRowIdentifier = uniqueId;
                buildSemanticStages(proto, uniqueId);
            }
        });

        stackContainer.appendChild(row);
    });
}

    // Lắng nghe tín hiệu xóa thành công để hiển thị thông báo phản hồi nhanh
    subscribe("protocols:delete_result", (response) => {
        if (response.success) {
            if (typeof showNotification === 'function') {
                showNotification("Protocol deleted successfully", "success");
            } else {
                alert("Protocol deleted successfully");
            }
        } else {
            alert(`Delete failed: ${response.message}`);
        }
    });

    // Lắng nghe tín hiệu kích hoạt lệnh chạy hệ thống thành công để chuyển hướng trang màn hình
    subscribe("protocols:run_trigger_result", (response) => {
        if (response.success) {
            if (typeof goToPage === 'function') {
                // Chuyển hướng màn hình điện thoại về trang giám sát đồ thị real-time
                goToPage("PCR/features/PCR_Run/pcr_run.html", "none", "run");
            } else {
                alert("Protocol loaded! System is now running...");
            }
        } else {
            alert(`Execution failed: ${response.message}`);
        }
    });

    // ======================================================
    // OPEN PROTOCOL RESULT
    // ======================================================
    subscribe("protocols:open_success", (data) =>
    {
        goToPage("PCR/features/PCR_New/pcr_new.html","saved", "new");
    });

    subscribe("protocols:open_error", (response) =>
    {
        alert( response?.message || "Unable to open protocol");
    });

        // Hàm cập nhật các lựa chọn ngày vào Dropdown
    function updateDateFilterDropdown(protocols) {
        const select = document.getElementById('date-filter-select');
        const uniqueDates = [...new Set(protocols.map(p => p.Date_Saved))];
        
        // Giữ lại option mặc định
        select.innerHTML = '<option value="all">All Dates</option>';
        uniqueDates.forEach(date => {
            const opt = document.createElement('option');
            opt.value = date;
            opt.textContent = date;
            select.appendChild(opt);
        });
    }

    // Xử lý bộ lọc tìm kiếm cấu hình theo ký tự nhập vào từ bàn phím điện thoại
    const filterInput = document.getElementById('protocol-filter');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            const allRows = document.querySelectorAll('.registry-row');
            
            allRows.forEach(row => {
                const nameText = row.getAttribute('data-name').toLowerCase();
                if (nameText.includes(searchTerm)) {
                    row.style.display = 'block';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Sự kiện nút điều hướng quay lại đặt trên góc trên cùng bên trái giao diện
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (typeof goToPage === 'function') {
                goToPage("PCR/features/PCR_Base/pcr_base.html", "base", "none");
            } else {
                alert("Navigating back to main dashboard...");
            }
        });
    }
});

// ================= HÀM DỰNG GIAO DIỆN PHẲNG SINGLE-TAB CHO MOBILE =================
function renderGroupedRegistryStack(protocols) {
    const stackContainer = document.getElementById('protocol-registry-stack');
    if (!stackContainer) return;
    
    stackContainer.innerHTML = '';

    if (!protocols || protocols.length === 0) {
        stackContainer.innerHTML = `<div class="ux-loading"><p>No saved protocols found inside storage.</p></div>`;
        return;
    }

    protocols.forEach(proto => {
        const row = document.createElement('div');
        
        // Tạo chuỗi định danh an toàn để đặt ID cho các thẻ HTML từ tên file và thư mục ngày tháng
        const uniqueId = `${proto.dateFolder.replace(/\./g, '_')}_${proto.fileName.replace(/\./g, '_')}`;
        
        // Lưu giữ dữ liệu tên để phục vụ bộ lọc tìm kiếm nhanh
        row.className = `registry-row ${activeRowIdentifier === uniqueId ? 'is-expanded' : ''}`;
        row.setAttribute('data-name', proto.PROTOCOL_NAME);

        row.innerHTML = `
            <div class="row-master-trigger">
                <div class="meta-zone">
                    <h3>${proto.PROTOCOL_NAME}</h3>
                    <span><i class="fa-regular fa-clock"></i> ${proto.Date_Saved} ${proto.Time_Saved}</span>
                    <div class="quick-chips">
                        <div class="chip-item">Lid: ${proto.Lid}°C</div>
                        <div class="chip-item">Vol: ${proto.Liquid}µL</div>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-down trigger-arrow"></i>
            </div>
            
            <div class="row-detail-drawer" id="drawer-${uniqueId}">
                <div class="drawer-inner">
                    
                    <div id="stages-container-${uniqueId}" style="display:flex; flex-direction:column; gap:10px;"></div>

                    <div class="drawer-action-row">
                        <button class="action-horizontal-btn btn-horizontal-delete" 
                                onclick="executeDeleteClick('${proto.dateFolder}', '${proto.fileName}', '${proto.PROTOCOL_NAME}', event)">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                        <button class="action-horizontal-btn btn-horizontal-open" 
                                onclick="executeOpenClick('${proto.dateFolder}', '${proto.fileName}', event)">
                            <i class="fa-solid fa-folder-open"></i> Open
                        </button>
                    </div>

                </div>
            </div>
        `;

        // Đăng ký tương tác đóng/mở mượt mà cho khối Accordion di động
        row.querySelector('.row-master-trigger').addEventListener('click', () => {
            if (row.classList.contains('is-expanded')) {
                row.classList.remove('is-expanded');
                activeRowIdentifier = null;
            } else {
                document.querySelectorAll('.registry-row.is-expanded').forEach(el => el.classList.remove('is-expanded'));
                
                row.classList.add('is-expanded');
                activeRowIdentifier = uniqueId;

                // Thực hiện giải thuật bóc tách mảng Block/Time thành các Stage trực quan
                buildSemanticStages(proto, uniqueId);
            }
        });

        stackContainer.appendChild(row);
    });
}
// ================= GIẢI THUẬT GOM NHÓM STEP THEO HỆ SỐ PCR_LOOP VÀ HOLD_END =================
function buildSemanticStages(proto, uniqueId) {
    const container = document.getElementById(`stages-container-${uniqueId}`);
    if (!container) return;

    let html = '';
    let currentStepIndex = 0;

    // 1. Giai đoạn Khởi động (Hold Start) - Chỉ lấy số bước theo thông số Hold_Start
    const holdStartCount = Number(proto.Hold_Start) || 0;
    if (holdStartCount > 0) {
        html += generateStageMarkup("Initial Holding Stage", null, currentStepIndex, holdStartCount, proto);
        currentStepIndex += holdStartCount;
    }

    // 2. Giai đoạn Chu kỳ nhân bản chính (PCR Vòng lặp) - Giới hạn nghiêm ngặt theo PCR_Loop
    const activeLoops = Number(proto.PCR_Loop) || 0;
    if (activeLoops > 0 && proto.Step_PCR && proto.Step_PCR.length > 0) {
        for (let loopIdx = 0; loopIdx < activeLoops; loopIdx++) {
            // Phòng trường hợp mảng Step_PCR bị khai báo thiếu so với hệ số PCR_Loop
            if (proto.Step_PCR[loopIdx] === undefined) break;

            const stepsInLoop = proto.Step_PCR[loopIdx];
            const cycles = proto.Cycles_PCR ? (proto.Cycles_PCR[loopIdx] || 1) : 1;
            
            html += generateStageMarkup(`Amplification Phase ${loopIdx + 1}`, cycles, currentStepIndex, stepsInLoop, proto);
            currentStepIndex += stepsInLoop;
        }
    }

    // 3. Giai đoạn Giữ nhiệt cuối (Hold End) - Chỉ lấy số bước theo thông số Hold_End tương ứng
    const holdEndCount = Number(proto.Hold_End) || 0;
    if (holdEndCount > 0 && currentStepIndex < proto.Block.length) {
        html += generateStageMarkup("Final Holding Stage", null, currentStepIndex, holdEndCount, proto);
    }

    container.innerHTML = html;
}

// ================= HÀM XUẤT MÃ HTML CHO TỪNG GIAI ĐOẠN PHÂN ĐOẠN =================
function generateStageMarkup(stageName, cycles, startIdx, count, proto) {
    let nodesHtml = '';
    
    for (let i = 0; i < count; i++) {
        const idx = startIdx + i;
        if (idx >= proto.Block.length) break;
        
        const temp = proto.Block[idx];
        const time = proto.Time[idx];
        const isHot = temp >= 72; // Nhiệt độ biến tính lớn báo đỏ, nhiệt độ thấp báo xanh

        nodesHtml += `
            <div class="mini-node ${isHot ? 'hot-node' : 'cool-node'}">
                <div class="n-temp">${temp}°C</div>
                <div class="n-time">${time}s</div>
            </div>
        `;
    }

    const badgeHtml = cycles ? `<span>x${cycles} Cycles</span>` : '';

    return `
        <div class="stage-group-box">
            <div class="stage-title">${stageName} ${badgeHtml}</div>
            <div class="stage-nodes-flow">
                ${nodesHtml}
            </div>
        </div>
    `;
}

// ================= XỬ LÝ SỰ KIỆN KHI ẤN NÚT DELETE (NẰM NGANG) =================
window.executeDeleteClick = (dateFolder, fileName, protocolName, event) => {
    event.stopPropagation(); 
    
    if (confirm(`Are you sure you want to permanently delete "${protocolName}"?`)) {
         window.API.send("protocols:delete", { 
            dateFolder: dateFolder, 
            fileName: fileName 
        });
    }
};

// ================= XỬ LÝ SỰ KIỆN KHI ẤN NÚT OPEN (NẰM NGANG) =================
window.executeOpenClick = (dateFolder, fileName, event) => {
    event.stopPropagation(); 
    
     window.API.send("protocols:open_trigger", { 
        dateFolder: dateFolder, 
        fileName: fileName 
    });
};




