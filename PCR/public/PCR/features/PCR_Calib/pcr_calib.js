// =====================================================================
// PCR Calibration page
// =====================================================================

const SENSORS      = 5;
const SENSOR_NAMES = ['Pel1', 'Pel2', 'Pel3', 'Heat', 'Heatsink'];

// ── Build sensor rows ──
['temp-hi', 'temp-lo'].forEach((gridId, idx) => {
    const grid   = document.getElementById(`grid-${gridId}`);
    const prefix = idx === 0 ? 'Temp_Hi_Measure' : 'Temp_Lo_Measure';
    SENSOR_NAMES.forEach((name, i) => {
        const row = document.createElement('div');
        row.className = 'param-row';
        row.innerHTML = `
            <label class="param-label">${name}</label>
            <input class="param-input" type="number" step="0.1"
                   id="${prefix}_${i}" placeholder="0.0">`;
        grid.appendChild(row);
    });
});

// ── System config state ──
let _selectedDevice = 16;

function setDeviceType(val) {
    _selectedDevice = Number(val);
    document.querySelectorAll('.dev-type-btn').forEach(b => {
        b.classList.toggle('active', Number(b.dataset.val) === _selectedDevice);
    });
}
document.querySelectorAll('.dev-type-btn').forEach(b => {
    b.addEventListener('click', () => setDeviceType(b.dataset.val));
});
setDeviceType(16);

function _setToggle(id, valId, checked) {
    const cb  = document.getElementById(id);
    const lbl = document.getElementById(valId);
    if (!cb || !lbl) return;
    cb.checked = checked;
    lbl.textContent = checked ? 'ON' : 'OFF';
    lbl.classList.toggle('on', checked);
}

['sys-debug-log', 'sys-simulate'].forEach(id => {
    const valId = id + '-val';
    document.getElementById(id)?.addEventListener('change', function () {
        const lbl = document.getElementById(valId);
        if (!lbl) return;
        lbl.textContent = this.checked ? 'ON' : 'OFF';
        lbl.classList.toggle('on', this.checked);
    });
});

function populateSystemInputs(sys) {
    if (!sys) return;
    setDeviceType(sys.Device ?? 16);
    _setToggle('sys-debug-log', 'sys-debug-log-val', !!(sys.Debug_LOG));
    _setToggle('sys-simulate',  'sys-simulate-val',  !!(sys.Simulate));
}


// ── Role toggle ──
let currentRole = 'staff';

function setRole(role) {
    currentRole = role;
    document.getElementById('role-staff').classList.toggle('active',    role === 'staff');
    document.getElementById('role-customer').classList.toggle('active', role === 'customer');
}

document.getElementById('role-staff').addEventListener('click',    () => setRole('staff'));
document.getElementById('role-customer').addEventListener('click', () => setRole('customer'));

// ── Server selection ──
const SERVER_KEYS = ['PCR', 'VE100', 'SPOTCHECK'];
let currentServers = ['PCR'];

function setServers(list) {
    currentServers = Array.isArray(list) && list.length ? [...list] : ['PCR'];
    SERVER_KEYS.forEach(key => {
        const el = document.getElementById(`srv-${key}`);
        if (el) el.classList.toggle('active', currentServers.includes(key));
    });
}

SERVER_KEYS.forEach(key => {
    const el = document.getElementById(`srv-${key}`);
    if (!el) return;
    el.addEventListener('click', () => {
        if (currentServers.includes(key)) {
            if (currentServers.length === 1) return; // phải giữ ít nhất 1 server
            currentServers = currentServers.filter(k => k !== key);
        } else {
            currentServers = [...currentServers, key];
        }
        setServers(currentServers);
    });
});

// ── Loading overlay ──
const loadingEl = document.getElementById('calib-loading');
function hideLoading() {
    loadingEl.classList.add('hidden');
    setTimeout(() => { loadingEl.style.display = 'none'; }, 420);
}
// Safety fallback: hide after 6 s even if no data arrives
setTimeout(hideLoading, 6000);

// ── Navigation ──
document.getElementById('btn-back').addEventListener('click', () => {
    if (typeof goToPage === 'function') {
        goToPage("PCR/features/PCR_Base/pcr_base.html", "base", "none");
    } else {
        window.location.replace("/PCR/features/PCR_Base/pcr_base.html");
    }
});

// ── Modal notification ──
function showStatus(msg, type) {
    const prev = document.getElementById('calib-modal');
    if (prev) prev.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'calib-modal';
    overlay.className = 'calib-modal-overlay';

    overlay.innerHTML = `
        <div class="calib-modal-panel ${type}">
            <div class="calib-modal-icon">${type === 'ok' ? '✓' : '✕'}</div>
            <div class="calib-modal-msg">${msg}</div>
            <button class="calib-modal-btn">OK</button>
        </div>`;

    document.body.appendChild(overlay);

    function dismiss() {
        overlay.classList.add('hiding');
        setTimeout(() => overlay.remove(), 300);
    }

    overlay.querySelector('.calib-modal-btn').addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
    overlay._t = setTimeout(dismiss, 4000);
}

// ── Helpers ──
function getFloat(id) {
    const v = parseFloat(document.getElementById(id)?.value);
    return isNaN(v) ? null : v;
}
function getInt(id) {
    const v = parseInt(document.getElementById(id)?.value, 10);
    return isNaN(v) ? null : v;
}
function getSensorArray(prefix) {
    return SENSOR_NAMES.map((_, i) => {
        const v = parseFloat(document.getElementById(`${prefix}_${i}`)?.value);
        return isNaN(v) ? 0 : v;
    });
}
function setVal(id, val) {
    const el = document.getElementById(id);
    if (!el || val == null) return;
    if (el.step === '0.1') {
        el.value = (Math.round(Number(val) * 10) / 10).toFixed(1);
    } else if (el.type === 'text') {
        el.value = val;
    } else {
        el.value = Math.round(Number(val));
    }
}
function setSensorArray(prefix, arr) {
    (arr || []).forEach((v, i) => setVal(`${prefix}_${i}`, v));
}

// ── Populate calib inputs ──
function populateInputs(calib) {
    if (!calib) return;
    setVal('HeatSink_Threshold',              calib.HeatSink_Threshold);
    setVal('Block_Threshold',                 calib.Block_Threshold);
    setVal('Fan_Speed_Hi_Threshold',          calib.Fan_Speed_Hi_Threshold);
    setVal('Fan_Speed_Med_Threshold',         calib.Fan_Speed_Med_Threshold);
    setVal('Fan_Speed_Lo_Threshold',          calib.Fan_Speed_Lo_Threshold);
    setVal('Fan_Cool_Down_Time',              calib.Fan_Cool_Down_Time);
    setVal('Heating_Speed',                   calib.Heating_Speed);
    setVal('Cooling_Speed',                   calib.Cooling_Speed);
    setSensorArray('Temp_Hi_Measure',         calib.Temp_Hi_Measure);
    setSensorArray('Temp_Lo_Measure',         calib.Temp_Lo_Measure);
    setVal('Heating_Val',                     calib.Heating_Val);
    setVal('Cooling_Val',                     calib.Cooling_Val);
    setVal('Hold_Time_Adjust_Factor_Normal',  calib.Hold_Time_Adjust_Factor_Normal);
    setVal('Hold_Time_Adjust_Factor_First',   calib.Hold_Time_Adjust_Factor_First);
    setVal('Lid_Control_Max_Val',             calib.Lid_Control_Max_Val);
    setVal('Block_Control_Max_Val',           calib.Block_Control_Max_Val);
    setVal('Control_Timeout',                 calib.Control_Timeout);
}

// ── Input guards (real-time) ──
function _flashField(el) {
    el.classList.remove('input-err');
    void el.offsetWidth;                  // force reflow để restart animation
    el.classList.add('input-err');
    el.addEventListener('animationend', () => el.classList.remove('input-err'), { once: true });
}

// Số nguyên: chặn hoàn toàn phím . và , ngay khi nhấn
function _attachIntegerGuard(el) {
    el.addEventListener('keydown', (e) => {
        if (e.key === '.' || e.key === ',' || e.key === 'Decimal') {
            e.preventDefault();
            _flashField(el);
        }
    });
    el.addEventListener('paste', (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        if (/[.,]/.test(text)) { e.preventDefault(); _flashField(el); }
    });
}

// Số lẻ: chỉ cho phép tối đa 1 chữ số sau dấu thập phân
function _attachFloatGuard(el) {
    el.addEventListener('input', () => {
        const raw = el.value;
        if (!raw) return;
        const dot = raw.indexOf('.');
        if (dot !== -1 && raw.length - dot - 1 > 1) {
            const v = parseFloat(raw);
            if (!isNaN(v)) el.value = (Math.round(v * 10) / 10).toFixed(1);
            _flashField(el);
        }
    });
    el.addEventListener('paste', (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const clean = text.replace(',', '.');
        const dot = clean.indexOf('.');
        if (dot !== -1 && clean.length - dot - 1 > 1) {
            e.preventDefault();
            const v = parseFloat(clean);
            if (!isNaN(v)) el.value = (Math.round(v * 10) / 10).toFixed(1);
            _flashField(el);
        }
    });
}

// Gắn guard vào toàn bộ input theo thuộc tính step
function _attachAllGuards() {
    document.querySelectorAll('.param-input[step="1"]').forEach(_attachIntegerGuard);
    document.querySelectorAll('.param-input[step="0.1"]').forEach(_attachFloatGuard);
}

// ── Validation helpers ──
// Float: cho phép tối đa 1 chữ số thập phân (vd: 3.5 OK, 3.55 KHÔNG OK)
function _requireFloat(id, label, min, max, errors) {
    const raw = (document.getElementById(id)?.value ?? '').trim();
    if (!raw) { errors.push(`${label}: trống`); return null; }
    if (!/^-?\d+\.?\d?$/.test(raw)) { errors.push(`${label}: tối đa 1 chữ số thập phân`); return null; }
    const v = parseFloat(raw);
    if (min != null && v < min) { errors.push(`${label}: min ${min}`); return null; }
    if (max != null && v > max) { errors.push(`${label}: max ${max}`); return null; }
    return v;
}
// Integer: chỉ được nhập số nguyên, không có dấu thập phân
function _requireInt(id, label, min, max, errors) {
    const raw = (document.getElementById(id)?.value ?? '').trim();
    if (!raw) { errors.push(`${label}: trống`); return null; }
    if (!/^-?\d+$/.test(raw)) { errors.push(`${label}: chỉ nhập số nguyên`); return null; }
    const v = parseInt(raw, 10);
    if (min != null && v < min) { errors.push(`${label}: min ${min}`); return null; }
    if (max != null && v > max) { errors.push(`${label}: max ${max}`); return null; }
    return v;
}

function validateAndCollect() {
    const errors = [];

    // ── HeatSink & Block Threshold ──
    const HeatSink_Threshold = _requireFloat('HeatSink_Threshold', 'HeatSink Threshold', 0, 150, errors);
    const Block_Threshold    = _requireFloat('Block_Threshold',    'Block Threshold',    0, 150, errors);

    // ── Fan Speed ──
    const Fan_Speed_Hi  = _requireInt('Fan_Speed_Hi_Threshold',  'Fan Speed Hi',  0, 100, errors);
    const Fan_Speed_Med = _requireInt('Fan_Speed_Med_Threshold', 'Fan Speed Med', 0, 100, errors);
    const Fan_Speed_Lo  = _requireInt('Fan_Speed_Lo_Threshold',  'Fan Speed Lo',  0, 100, errors);
    const Fan_Cool_Down = _requireInt('Fan_Cool_Down_Time',      'Fan Cool Down', 0, 255, errors);
    if (Fan_Speed_Hi !== null && Fan_Speed_Med !== null && Fan_Speed_Hi <= Fan_Speed_Med)
        errors.push('Fan Speed Hi must be > Med');
    if (Fan_Speed_Med !== null && Fan_Speed_Lo !== null && Fan_Speed_Med <= Fan_Speed_Lo)
        errors.push('Fan Speed Med must be > Lo');

    // ── Speed ──
    const Heating_Speed = _requireFloat('Heating_Speed', 'Heating Speed', 0.01, null, errors);
    const Cooling_Speed = _requireFloat('Cooling_Speed', 'Cooling Speed', 0.01, null, errors);

    // ── Temp Hi / Lo Measure (5 sensors each) ──
    const Temp_Hi_Measure = [];
    const Temp_Lo_Measure = [];
    for (let i = 0; i < SENSORS; i++) {
        const hi = _requireFloat(`Temp_Hi_Measure_${i}`, `Temp Hi [${SENSOR_NAMES[i]}]`, null, null, errors);
        const lo = _requireFloat(`Temp_Lo_Measure_${i}`, `Temp Lo [${SENSOR_NAMES[i]}]`, null, null, errors);
        Temp_Hi_Measure.push(hi ?? 0);
        Temp_Lo_Measure.push(lo ?? 0);
    }

    // ── Control Values ──
    const Heating_Val    = _requireFloat('Heating_Val',                    'Heating Val',   null, null, errors);
    const Cooling_Val    = _requireFloat('Cooling_Val',                    'Cooling Val',   null, null, errors);
    const Factor_Normal  = _requireFloat('Hold_Time_Adjust_Factor_Normal', 'Factor Normal', 0.01, null, errors);
    const Factor_First   = _requireFloat('Hold_Time_Adjust_Factor_First',  'Factor First',  0.01, null, errors);

    // ── Limits & Timeout ──
    const Lid_Max      = _requireInt('Lid_Control_Max_Val',   'Lid Max Val',   0, 100, errors);
    const Block_Max    = _requireInt('Block_Control_Max_Val', 'Block Max Val', 0, 100, errors);
    const Ctrl_Timeout = _requireInt('Control_Timeout',       'Ctrl Timeout',  1, 255, errors);

    if (errors.length > 0) {
        const preview = errors.slice(0, 3).join(' | ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : '');
        return { error: preview };
    }

    return {
        HeatSink_Threshold,
        Block_Threshold,
        Fan_Speed_Hi_Threshold:         Fan_Speed_Hi,
        Fan_Speed_Med_Threshold:        Fan_Speed_Med,
        Fan_Speed_Lo_Threshold:         Fan_Speed_Lo,
        Fan_Cool_Down_Time:             Fan_Cool_Down,
        Heating_Speed,
        Cooling_Speed,
        Temp_Hi_Measure,
        Temp_Lo_Measure,
        Heating_Val,
        Cooling_Val,
        Hold_Time_Adjust_Factor_Normal: Factor_Normal,
        Hold_Time_Adjust_Factor_First:  Factor_First,
        Lid_Control_Max_Val:            Lid_Max,
        Block_Control_Max_Val:          Block_Max,
        Control_Timeout:                Ctrl_Timeout,
        // ── System config (bundled with calib write) ──
        Debug_LOG: document.getElementById('sys-debug-log')?.checked ? 1 : 0,
        Simulate:  document.getElementById('sys-simulate')?.checked  ? 1 : 0,
        Device:    _selectedDevice,
    };
}

// ── Apply Calibration ──
document.getElementById('btn-apply').addEventListener('click', () => {
    if (!window.API) { showStatus('Socket not connected', 'err'); return; }

    const result = validateAndCollect();
    if (result.error) {
        showStatus('Invalid input — ' + result.error, 'err');
        return;
    }

    const btn = document.getElementById('btn-apply');
    btn.disabled    = true;
    btn.textContent = 'Applying...';
    window.API.send('calib:write', result);
});

// ── Save Device Info ──
document.getElementById('btn-save-device').addEventListener('click', () => {
    if (!window.API) { showStatus('Socket not connected', 'err'); return; }
    const btn = document.getElementById('btn-save-device');
    btn.disabled    = true;
    btn.textContent = 'Saving...';
    window.API.send('calib:device_save', {
        host_name:   document.getElementById('dev-host_name').value.trim(),
        seri_number: document.getElementById('dev-seri_number').value.trim(),
        role:        currentRole,
        servers:     currentServers
    });
});

// ── Wait for socket, then subscribe & request data ──
const waitForAPI = setInterval(() => {
    if (!window.API) return;
    clearInterval(waitForAPI);

    // Calib data
    window.API.subscribe('calib:read_result', (data) => {
        populateInputs(data);
        hideLoading();
    });

    window.API.subscribe('calib:write_result', (res) => {
        const btn = document.getElementById('btn-apply');
        btn.disabled    = false;
        btn.textContent = '✓ Apply Calibration';
        showStatus(res.success ? 'Calibration applied successfully ✓' : (res.message || 'Failed'), res.success ? 'ok' : 'err');
    });

    // Device info
    window.API.subscribe('calib:device_result', (info) => {
        setVal('dev-host_name',   info.host_name);
        setVal('dev-seri_number', info.seri_number);
        if (info.role)    setRole(info.role);
        if (info.servers) setServers(info.servers);
    });

    window.API.subscribe('calib:device_save_result', (res) => {
        const btn = document.getElementById('btn-save-device');
        btn.disabled    = false;
        btn.textContent = 'Save';
        showStatus(res.success ? 'Device info saved ✓' : (res.message || 'Save failed'), res.success ? 'ok' : 'err');
    });

    // System config (read on load to populate toggles/device selector)
    window.API.subscribe('calib:system_result', (sys) => {
        populateSystemInputs(sys);
    });

    // Request data
    window.API.send('calib:read',        {});
    window.API.send('calib:device_read', {});
    window.API.send('calib:system_read', {});
}, 50);

// Gắn guard sau khi toàn bộ DOM đã render (sensor rows đã được tạo ở trên)
_attachAllGuards();
