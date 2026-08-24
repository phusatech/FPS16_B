// =====================================================================
// PCR Update Protocol
// =====================================================================

loadHeader();

// ── Reveal ───────────────────────────────────────────────────────────
let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const main = document.getElementById('pcr-main');
    const ov   = document.getElementById('page-loading');
    if (main) main.style.visibility = '';
    if (ov)   { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
document.addEventListener('headerLoaded', () => { _reveal(); initHeaderLogic(); }, { once: true });
setTimeout(_reveal, 3000);

// ── DOM refs ──────────────────────────────────────────────────────────
const headingSub  = document.getElementById('up-heading-sub');
const currentName = document.getElementById('up-current-name');
const stLoading   = document.getElementById('st-loading');
const stError     = document.getElementById('st-error');
const stEmpty     = document.getElementById('st-empty');
const stList      = document.getElementById('st-list');
const listEl      = document.getElementById('up-list');
const errMsg      = document.getElementById('st-error-msg');

const btnBack    = document.getElementById('btn-back');
const btnUpdate  = document.getElementById('btn-update');
const btnRetry   = document.getElementById('btn-retry');

const modal      = document.getElementById('up-modal');
const modalPanel = document.getElementById('up-modal-panel');
const modalIcon  = document.getElementById('up-modal-icon');
const modalTitle = document.getElementById('up-modal-title');
const modalSub   = document.getElementById('up-modal-sub');
const modalOk    = document.getElementById('up-modal-ok');

// ── State ─────────────────────────────────────────────────────────────
let selectedFile         = null;
let _currentProtocolName = null; // name from default_protocol.json

// ── GitHub list cache (session-scoped — scans GitHub once per session) ─
const CACHE_KEY = 'up_proto_list';
function _getCached()  { try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch { return null; } }
function _setCache(f)  { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(f)); } catch {} }
function _clearCache() { try { sessionStorage.removeItem(CACHE_KEY); }               catch {} }

// ── Navigation ────────────────────────────────────────────────────────
function goBack() {
    if (typeof goToPage === 'function') {
        goToPage("PCR/features/PCR_Admin/pcr_admin.html", "none", "admin");
    } else {
        window.location.replace("/PCR/features/PCR_Admin/pcr_admin.html");
    }
}
btnBack.addEventListener('click', goBack);

// ── Show state ────────────────────────────────────────────────────────
function showState(name, subtitle) {
    stLoading.style.display = name === 'loading' ? 'flex' : 'none';
    stError.style.display   = name === 'error'   ? 'flex' : 'none';
    stEmpty.style.display   = name === 'empty'   ? 'flex' : 'none';
    stList.style.display    = name === 'list'     ? 'block': 'none';

    headingSub.textContent  = subtitle || '';
    btnUpdate.style.display = name === 'list' ? '' : 'none';
}

// ── Format date ───────────────────────────────────────────────────────
function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}  ${hh}:${min}`;
}

// ── Render file list ──────────────────────────────────────────────────
function renderList(files) {
    listEl.innerHTML   = '';
    selectedFile       = null;
    btnUpdate.disabled = true;

    files.forEach(f => {
        const name      = f.name.replace(/\.json$/i, '');
        const isCurrent = _currentProtocolName &&
            name.trim().toLowerCase() === _currentProtocolName.trim().toLowerCase();

        const card = document.createElement('div');
        card.className = 'up-file-card' + (isCurrent ? ' up-file-current' : '');
        card.innerHTML = `
            <div class="up-radio"><div class="up-radio-dot"></div></div>
            <div class="up-file-info">
                <div class="up-file-name">${name}</div>
                <div class="up-file-date">Last updated: ${fmtDate(f.updated_at)}</div>
                ${isCurrent ? '<div class="up-file-tag-current">No new update available</div>' : ''}
            </div>`;

        if (!isCurrent) {
            card.addEventListener('click', () => {
                document.querySelectorAll('.up-file-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedFile = f;
                btnUpdate.disabled = false;
            });
        }
        listEl.appendChild(card);
    });
}

// ── Fetch list (cached — only scans GitHub once per session) ──────────
function fetchList() {
    selectedFile       = null;
    btnUpdate.disabled = true;

    const cached = _getCached();
    if (cached) {
        const n = cached.length;
        if (n === 0) { showState('empty', 'No protocols available'); return; }
        renderList(cached);
        showState('list', `${n} protocol${n !== 1 ? 's' : ''} found — select one to install`);
        return;
    }

    showState('loading', 'Checking for available protocols...');
    window.API.send('protocol:github_fetch_list');
}

// ── Modal ─────────────────────────────────────────────────────────────
function showModal(state, title, sub) {
    modal.style.display    = 'flex';
    modalPanel.className   = 'up-modal-panel ' + state;
    modalTitle.textContent = title;
    modalSub.textContent   = sub || '';
    modalOk.style.display  = 'none';

    if (state === 'loading') {
        modalIcon.innerHTML = '<div class="up-spinner up-spinner-sm"></div>';
    } else if (state === 'success') {
        modalIcon.innerHTML = '<div class="up-modal-done ok">✓</div>';
        modalOk.style.display = 'inline-block';
    } else if (state === 'error') {
        modalIcon.innerHTML = '<div class="up-modal-done err">✕</div>';
        modalOk.style.display = 'inline-block';
    }
}

modalOk.addEventListener('click', () => {
    modal.style.display = 'none';
});

// ── Start — wait for window.API (set by socket_client.js module) ──────
const _waitAPI = setInterval(() => {
    if (!window.API) return;
    clearInterval(_waitAPI);

    // Current protocol name — also re-render list if already visible
    window.API.subscribe('protocol:current_result', ({ name }) => {
        currentName.textContent  = name || '—';
        _currentProtocolName     = name || null;
        const cached = _getCached();
        if (cached && stList.style.display !== 'none') renderList(cached);
    });

    // GitHub list result
    window.API.subscribe('protocol:github_list_result', (res) => {
        if (!res.success) {
            errMsg.textContent = res.message || 'Connection failed';
            showState('error', 'Could not load protocol list');
            return;
        }
        const files = res.files || [];
        _setCache(files);
        const n = files.length;
        if (n === 0) { showState('empty', 'No protocols available at this time'); return; }
        renderList(files);
        showState('list', `${n} protocol${n !== 1 ? 's' : ''} found — select one to install`);
    });

    // Update progress
    window.API.subscribe('protocol:github_update_progress', ({ step }) => {
        if (step === 'installing') {
            modalTitle.textContent = 'Installing...';
            modalSub.textContent   = 'Saving as default protocol';
        }
    });

    // Update result
    window.API.subscribe('protocol:github_update_result', (res) => {
        if (res.success) {
            const name = res.name.replace(/\.json$/i, '');
            // Cập nhật current name ngay, re-render list cached — không cần re-fetch GitHub
            _currentProtocolName = name;
            currentName.textContent = name;
            const cached = _getCached();
            if (cached) renderList(cached);
            showModal('success', 'Updated successfully', `"${name}" is now the default protocol`);
        } else {
            showModal('error', 'Update Failed', res.message || 'Previous protocol was restored');
            btnUpdate.disabled = false;
        }
    });

    // Retry — force a fresh GitHub scan
    btnRetry.addEventListener('click', () => { _clearCache(); fetchList(); });

    // Update button
    btnUpdate.addEventListener('click', () => {
        if (!selectedFile) return;
        btnUpdate.disabled = true;
        const name = selectedFile.name.replace(/\.json$/i, '');
        showModal('loading', 'Downloading...', name);
        window.API.send('protocol:github_update', {
            name:         selectedFile.name,
            download_url: selectedFile.download_url
        });
    });

    // Request current protocol name and initial list
    window.API.send('protocol:get_current');
    fetchList();
}, 50);
