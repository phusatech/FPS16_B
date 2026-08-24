// Khởi tạo đối tượng kết nối Socket.io real-time trực tiếp với máy tính nhúng (Trình duyệt tự hiểu)
import { API } from "../../core/api.js";
import { subscribe } from "../../core/socket_client.js";

window.API   = API;

// ================= STATE =================
let historyTree = {};
let currentFilter = '';
let currentDetailData = null;

let selectedFile = {
    dateFolder: null,
    fileName: null
};

// ================= REVEAL (wait for header before showing content) =================
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

// ================= INIT =================
document.addEventListener('DOMContentLoaded', init);

function init() {
    loadHeader();

    registerSocket();
    registerUI();

    window.API.send("history:get_tree");
}

// ================= SOCKET =================
function registerSocket() {

    subscribe("history:tree_result", res => {
        const container = document.getElementById('pcr-history-list-preview');

        if (!res.success) {
            container.innerHTML = `<p class="empty-message">No history logs found.</p>`;
            return;
        }

        historyTree = res.tree;
        renderTree();
    });

    subscribe("history:detail_result", res => {
        const preview = document.getElementById('history-detail-preview');

        if (!res.success) {
            preview.innerHTML = `<p class="empty-message">Failed to read the log file.</p>`;
            currentDetailData = null;
            return;
        }

        currentDetailData = res.data;
        renderDetail(res.data);
    });

    subscribe("history:view_detail_result", res => {
        if (res.success) {
            alert("view_detail protocol triggered successfully!");
            window.location.href = "/";
        } else {
            alert("view_detail failed: " + res.message);
        }
    });

    subscribe("history:download_html_result", res => {
        if (!res.success) {
            console.error("HTML download failed:", res.message);
            alert("Failed to download HTML report: " + (res.message || "Unknown error"));
            return;
        }

        // Create blob from HTML content and trigger download
        const htmlBlob = new Blob([res.content], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);

        const htmlLink = document.createElement('a');
        htmlLink.href = htmlUrl;
        htmlLink.download = res.fileName;
        document.body.appendChild(htmlLink);
        htmlLink.click();
        document.body.removeChild(htmlLink);
        URL.revokeObjectURL(htmlUrl);
    });
}

// ================= RENDER TREE =================
function renderTree() {
    const container = document.getElementById('pcr-history-list-preview');
    container.innerHTML = '';

    Object.keys(historyTree)
        .sort((a, b) => b.localeCompare(a))
        .forEach(date => {

        const folderBox = document.createElement('div');
        folderBox.className = 'folder-box';

        const header = document.createElement('div');
        header.className = 'folder-box-header';

        const fileListBox = document.createElement('div');
        fileListBox.className = 'file-list-box hidden';

        header.innerHTML = `
            <div class="folder-title-left">
                <i class="fa-solid fa-folder"></i>
                <span class="folder-name">${date}</span>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
        `;

        header.addEventListener('click', () => {

            const allBoxes = document.querySelectorAll('.file-list-box');

            const shouldOpen = fileListBox.classList.contains('hidden');

            allBoxes.forEach(box => box.classList.add('hidden'));

            if (shouldOpen) {
                fileListBox.classList.remove('hidden');
            }
        });

        // Thay đổi vòng lặp này
        const sortedItems = [...historyTree[date]].sort((a, b) => {
            const ta = (typeof a === 'object' ? a.time : '') || '';
            const tb = (typeof b === 'object' ? b.time : '') || '';
            return tb.localeCompare(ta);
        });
        sortedItems.forEach(item => {
            // TRÍCH XUẤT TÊN FILE TỪ OBJECT
            const name = typeof item === 'object' ? item.name : item;
            const time = item.time || ""; 

            const fileItem = document.createElement('div');
            fileItem.className = 'file-item-card';

            fileItem.dataset.date = date;
            fileItem.dataset.file = name; // Sử dụng biến name đã trích xuất

            // BÂY GIỜ BẠN CÓ THỂ GỌI REPLACE TRÊN BIẾN name
            fileItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>
                        <i class="fa-regular fa-file-code"></i>
                        ${name.replace(/\.json$/i, '')}
                    </span>
                    <span style="font-size: 0.8rem; color: #888;">${time}</span>
                </div>
            `;

            fileItem.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.file-item-card')
                    .forEach(el => el.classList.remove('active'));
                fileItem.classList.add('active');

                selectedFile = {
                    dateFolder: date,
                    fileName: name // Sử dụng biến name
                };

                document.getElementById('history-detail-preview').innerHTML =
                    `<p class="loading">Loading details...</p>`;

                window.API.send("history:get_detail", selectedFile);
            });

            fileListBox.appendChild(fileItem);
        });
                folderBox.appendChild(header);
                folderBox.appendChild(fileListBox);

                container.appendChild(folderBox);
            });

            applyFilter();
        }

// ================= FILTER (FIXED ROOT CAUSE BUG) =================
function applyFilter() {
    const keyword = currentFilter.trim().toLowerCase();
    const folders = document.querySelectorAll('.folder-box');

    // ================= RESET STATE =================
    if (keyword === '') {

        folders.forEach(folder => {

            folder.style.display = '';

            const box = folder.querySelector('.file-list-box');
            if (box) box.classList.add('hidden');

            // 🔥 FIX: restore ALL file items (quan trọng)
            folder.querySelectorAll('.file-item-card')
                .forEach(file => {
                    file.style.display = '';
                });
        });

        return;
    }

    // ================= FILTER MODE =================
    folders.forEach(folder => {

        let hasMatch = false;

        const date = folder.querySelector('.folder-name').innerText;
        const files = folder.querySelectorAll('.file-item-card');

        files.forEach(file => {

            const fileName = file.dataset.file.toLowerCase();

            const match =
                date.toLowerCase().includes(keyword) ||
                fileName.includes(keyword);

            file.style.display = match ? '' : 'none';

            if (match) hasMatch = true;
        });

        folder.style.display = hasMatch ? '' : 'none';

        if (hasMatch) {
            folder.querySelector('.file-list-box')
                .classList.remove('hidden');
        }
    });
}

// ================= DETAIL =================
function renderDetail(data) {

    const preview = document.getElementById('history-detail-preview');

    const hasError = data.Notifications?.length > 0;

    preview.innerHTML = `
        <div class="preview-card">

            <div class="preview-row">
                <strong>Protocol Name:</strong>
                <span>${data.PROTOCOL_NAME}</span>
            </div>

            <div class="preview-row">
                <strong>Date Run:</strong>
                <span>${data.Date_Run}</span>
            </div>

            <div class="preview-row">
                <strong>Duration:</strong>
                <span>${data.Time_Run_Start} → ${data.Time_Run_Stop}</span>
            </div>

            <div class="preview-row">
                <strong>Total Run Time:</strong>
                <span>${data.Time_Run_Total}</span>
            </div>

            <div class="preview-row">
                <strong>Time Estimate:</strong>
                <span>${data.Time_Estimate || '-'}</span>
            </div>

            <div class="preview-row">
                <strong>Lid Temp / Vol:</strong>
                <span>${data.Lid}°C / ${data.Liquid}µL</span>
            </div>

            <div class="preview-row">
                <strong>Status:</strong>
                <span class="status-badge ${hasError ? 'status-error' : 'status-success'}">
                    ${hasError ? 'Error' : 'Completed'}
                </span>
            </div>

            <div class="preview-row">
                <strong>Chart Data Points:</strong>
                <span>${data.Measured_Temperature_Array?.length || 0} pts</span>
            </div>

        </div>
    `;

    document.getElementById('download-btn').disabled = false;
    document.getElementById('view_detail-btn').disabled = false;
    document.getElementById('run-btn').disabled = false;
}

// ================= UI EVENTS =================
function registerUI() {

    document.getElementById('history-filter').addEventListener('input', (e) => {
        currentFilter = e.target.value;
        applyFilter();
    });

    document.getElementById('clear-filter-btn').addEventListener('click', () => {

        currentFilter = '';
        document.getElementById('history-filter').value = '';

        // Reset file đang chọn
        selectedFile = {
            dateFolder: null,
            fileName: null
        };
        currentDetailData = null;

        // Xóa highlight file đang chọn
        document.querySelectorAll('.file-item-card')
            .forEach(el => el.classList.remove('active'));

        // Xóa preview
        document.getElementById('history-detail-preview').innerHTML =
            '<p class="empty-message">Please select a log file from the history list to preview.</p>';

        // Disable button
        document.getElementById('download-btn').disabled = true;
        document.getElementById('view_detail-btn').disabled = true;
        document.getElementById('run-btn').disabled = true;

        applyFilter();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        goToPage("PCR/features/PCR_Base/pcr_base.html", "base", "none");
    });

    document.getElementById('download-btn').addEventListener('click', () => {
        if (!currentDetailData || !selectedFile.fileName) return;

        const htmlFileName = selectedFile.fileName.replace(/\.json$/i, '.html');
        const downloadUrl = `/api/history/download?dateFolder=${encodeURIComponent(selectedFile.dateFolder)}&fileName=${encodeURIComponent(htmlFileName)}`;

        // Tương thích 100% trên mọi thiết bị (Laptop, PC, iOS Safari, Android, Chrome, Firefox)
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = htmlFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
        }, 300);
    });

    document.getElementById('view_detail-btn').addEventListener('click', () => {
        if (!selectedFile.fileName) return;

        console.log(selectedFile.dateFolder);
        console.log(selectedFile.fileName);

        window.API.send( "history:view_detail_trigger",
        {
            dateFolder: selectedFile.dateFolder,
            fileName: selectedFile.fileName
        });
    });

    document.getElementById('run-btn').addEventListener('click', () => {
        if (!selectedFile.fileName) return;

        console.log(selectedFile.dateFolder);
        console.log(selectedFile.fileName);

        window.API.send( "history:run_trigger",
        {
            dateFolder: selectedFile.dateFolder,
            fileName: selectedFile.fileName
        });
    });

}



subscribe("history:run_success", () =>
{
    goToPage("PCR/features/PCR_New/pcr_new.html","history","new" );
});

subscribe("history:run_error", (response) =>
{
    showNotification( response?.message ||"Failed to load protocol", "error");
});



subscribe("history:view_detail_trigger_success", () =>
{
    goToPage("PCR/features/PCR_New/pcr_new.html","history","view");
});

subscribe("history:view_detail_trigger_error", (response) =>
{
    showNotification( response?.message ||"Failed to load protocol", "error");
});