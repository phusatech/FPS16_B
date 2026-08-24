// =====================================================================
// PCR Run Review — purely client-side JSON analysis
// =====================================================================

loadHeader();

let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const ov = document.getElementById('page-loading');
    if (ov) { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
document.addEventListener('headerLoaded', () => { _reveal(); initHeaderLogic(); }, { once: true });
setTimeout(_reveal, 3000);

let parsedData = null;
let chartRoot  = null;
let seriesRefs = { measured: null, target: null };

// =====================================================================
// DOM
// =====================================================================
const viewImport    = document.getElementById('view-import');
const viewAnalyzing = document.getElementById('view-analyzing');
const viewResult    = document.getElementById('view-result');

const fileInput     = document.getElementById('file-input');
const selectedName  = document.getElementById('selected-name');
const btnSelectFile = document.getElementById('btn-select-file');
const btnApply      = document.getElementById('btn-apply');
const btnBack       = document.getElementById('btn-back');
const btnBackResult = document.getElementById('btn-back-result');
const dropZone      = document.getElementById('drop-zone');

// =====================================================================
// VIEW MANAGEMENT
// =====================================================================
function showView(view) {
    [viewImport, viewAnalyzing, viewResult].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
}

// =====================================================================
// NAVIGATION
// =====================================================================
function goHome() {
    if (typeof goToPage === 'function') {
        goToPage("PCR/features/PCR_Base/pcr_base.html", "base", "none");
    } else {
        window.location.replace("/PCR/features/PCR_Base/pcr_base.html");
    }
}

btnBack.addEventListener('click', goHome);

btnBackResult.addEventListener('click', () => {
    if (chartRoot) { chartRoot.dispose(); chartRoot = null; }
    seriesRefs = { measured: null, target: null };
    showView(viewImport);
});

// =====================================================================
// FILE SELECTION
// =====================================================================
btnSelectFile.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

function parseHtmlReport(htmlContent) {
    // 1. Quét tất cả các match window._INJECTED_PCR_DATA trong file
    const regex = /window\._INJECTED_PCR_DATA\s*=\s*(\{[\s\S]*?\});/g;
    let match;
    const candidates = [];
    while ((match = regex.exec(htmlContent)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            if (parsed && (parsed.PROTOCOL_NAME || parsed.Block)) {
                candidates.push(parsed);
            }
        } catch (e) {}
    }

    // Nếu có nhiều candidate, ưu tiên candidate không phải mẫu template 2026.08.15_Run1_1
    if (candidates.length > 0) {
        const nonDefault = candidates.find(c => c.PROTOCOL_NAME && c.PROTOCOL_NAME !== "2026.08.15_Run1_1");
        return nonDefault || candidates[0];
    }

    // 2. Tìm DEFAULT_PCR_DATA = {...};
    const defaultMatch = htmlContent.match(/(?:const|let|var)?\s*DEFAULT_PCR_DATA\s*=\s*(\{[\s\S]*?\});/);
    if (defaultMatch && defaultMatch[1]) {
        try {
            return JSON.parse(defaultMatch[1]);
        } catch (e) {}
    }

    // 3. Fallback: Parse qua DOMParser và quét toàn bộ thẻ <script>
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const scripts = doc.querySelectorAll('script');
        for (const s of scripts) {
            const text = s.textContent || '';
            const m = text.match(/_INJECTED_PCR_DATA\s*=\s*(\{[\s\S]*?\});/) || text.match(/DEFAULT_PCR_DATA\s*=\s*(\{[\s\S]*?\});/);
            if (m && m[1]) {
                return JSON.parse(m[1]);
            }
        }
    } catch (e) {}

    throw new Error('Could not find valid PCR report data in HTML file');
}

function handleFile(file) {
    parsedData        = null;
    btnApply.disabled = true;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.html') && !lowerName.endsWith('.htm')) {
        selectedName.textContent = 'Please select an HTML report file (.html)';
        selectedName.className   = 'selected-name err';
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const htmlContent = e.target.result;
            const data = parseHtmlReport(htmlContent);
            if (!data || (!data.PROTOCOL_NAME && !data.Block)) {
                throw new Error('Invalid PCR report format');
            }
            parsedData               = data;
            selectedName.textContent = '✓ ' + file.name;
            selectedName.className   = 'selected-name ok';
            btnApply.disabled        = false;
        } catch (err) {
            selectedName.textContent = '✗ ' + (err.message || 'Invalid HTML report format');
            selectedName.className   = 'selected-name err';
        }
    };
    reader.readAsText(file);
}

// =====================================================================
// APPLY
// =====================================================================
btnApply.addEventListener('click', () => {
    if (!parsedData) return;
    showView(viewAnalyzing);
    setTimeout(() => {
        try {
            renderResult(parsedData);
            showView(viewResult);
        } catch (err) {
            console.error('[RunReview] render error:', err);
            showView(viewImport);
            selectedName.textContent = 'Error analysing file';
            selectedName.className   = 'selected-name err';
        }
    }, 900);
});

// =====================================================================
// SERIES TOGGLE
// =====================================================================
document.querySelectorAll('.stg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.stg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (!seriesRefs.measured || !seriesRefs.target) return;
        if (mode === 'both') {
            seriesRefs.measured.show();
            seriesRefs.target.show();
        } else if (mode === 'measured') {
            seriesRefs.measured.show();
            seriesRefs.target.hide();
        } else {
            seriesRefs.measured.hide();
            seriesRefs.target.show();
        }
    });
});

// =====================================================================
// RENDER RESULT
// =====================================================================
function renderResult(data) {
    document.getElementById('result-protocol-name').textContent =
        data.PROTOCOL_NAME || 'Unknown Protocol';

    // Reset toggle to "Both"
    document.querySelectorAll('.stg-btn').forEach(b => b.classList.remove('active'));
    const bothBtn = document.querySelector('.stg-btn[data-mode="both"]');
    if (bothBtn) bothBtn.classList.add('active');

    renderInfo(data);
    renderDiagnostics(data);
    renderStages(data);
    requestAnimationFrame(() => renderChart(data));
}

// ---- INFO ----
function renderInfo(data) {
    const panel = document.getElementById('info-panel');

    function row(label, value) {
        if (!value && value !== 0) return '';
        return `<div class="info-row">
                  <span class="info-label">${label}</span>
                  <span class="info-value">${value}</span>
                </div>`;
    }

    const pts = (data.Measured_Temperature_Array || []).length;
    panel.innerHTML = `
        <div class="panel-title">&#9432; Protocol Information</div>
        ${row('Protocol Name', data.PROTOCOL_NAME)}
        ${row('Date Saved',    data.Date_Saved)}
        ${row('Time Saved',    data.Time_Saved)}
        ${row('Date Run',      data.Date_Run)}
        ${row('Start',         data.Time_Run_Start)}
        ${row('Stop',          data.Time_Run_Stop)}
        ${row('Duration',      data.Time_Run_Total)}
        ${row('Time Estimate', data.Time_Estimate)}
        ${row('Lid Temp',      data.Lid    != null ? data.Lid    + ' °C' : null)}
        ${row('PCR Volume',    data.Liquid != null ? data.Liquid + ' µL' : null)}
        ${row('Data Points',   pts > 0 ? pts + ' samples' : 'No chart data')}
    `;
}

// ---- DIAGNOSTICS (renamed from Notifications) ----
function renderDiagnostics(data) {
    const panel  = document.getElementById('notif-panel');
    const notifs = data.Notifications || [];

    let html = '<div class="panel-title">&#9888; Diagnostics</div>';

    if (notifs.length === 0) {
        html += '<div class="notif-ok">&#10003; No errors detected</div>';
    } else {
        notifs.forEach(n => {
            html += `<div class="notif-item">
                        <span class="notif-code">${n.Error_Code || 'ERR'}</span>
                        <span class="notif-msg">${n.Message    || 'No details'}</span>
                     </div>`;
        });
    }

    panel.innerHTML = html;
}

// ---- STAGES ----
function renderStages(data) {
    const panel = document.getElementById('stages-panel');
    panel.innerHTML = '<div class="panel-title">&#9654; Protocol Stages</div>';

    const stagesDiv = document.createElement('div');
    stagesDiv.className = 'stages-flow';

    const blocks = data.Block || [];
    const times  = data.Time  || [];
    let   idx    = 0;

    function makeStage(name, count, cycles) {
        if (count <= 0) return;
        let stepsHtml = '';
        for (let i = 0; i < count; i++) {
            const si  = idx + i;
            if (si >= blocks.length) break;
            const temp = blocks[si];
            const t    = formatTime(times[si] || 0);
            const hot  = temp >= 72;
            stepsHtml += `<div class="step-chip ${hot ? 'step-hot' : 'step-cool'}">
                            <div class="step-temp">${temp}&#176;C</div>
                            <div class="step-time">${t}</div>
                          </div>`;
        }
        const badge = cycles ? `<span class="cycle-badge">&#215;${cycles}</span>` : '';
        const box   = document.createElement('div');
        box.className = 'stage-box';
        box.innerHTML = `<div class="stage-name">${name} ${badge}</div>
                         <div class="steps-row">${stepsHtml}</div>`;
        stagesDiv.appendChild(box);
        idx += count;
    }

    const holdStart = Number(data.Hold_Start) || 0;
    const pcrLoop   = Number(data.PCR_Loop)   || 0;
    const holdEnd   = Number(data.Hold_End)   || 0;

    if (holdStart > 0) makeStage('Initial Hold', holdStart, null);
    for (let i = 0; i < pcrLoop; i++) {
        const steps  = (data.Step_PCR   || [])[i] || 0;
        const cycles = (data.Cycles_PCR || [])[i] || 1;
        if (steps > 0) makeStage(`PCR Phase ${i + 1}`, steps, cycles);
    }
    if (holdEnd > 0) makeStage('Final Hold', holdEnd, null);

    panel.appendChild(stagesDiv);
}

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function parseHMS(str) {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseInt(str, 10) || 0;
}

// ---- CHART ----
function renderChart(data) {
    const container = document.getElementById('rr-chart');
    if (!container) return;

    const measured = data.Measured_Temperature_Array || [];
    const target   = data.Target_Temperature_Array   || [];

    if (measured.length === 0) {
        container.innerHTML = '<div class="no-chart">No temperature data available</div>';
        return;
    }

    // Compute real elapsed time per sample
    const totalSec     = parseHMS(data.Time_Run_Total);
    const n            = measured.length;
    const secPerSample = (n > 1 && totalSec > 0) ? totalSec / (n - 1) : 1;
    const xMax         = (n - 1) * secPerSample;

    if (chartRoot) { chartRoot.dispose(); chartRoot = null; }

    const root = am5.Root.new(container, { useSafeResolution: false });
    if (root._logo) root._logo.dispose();
    chartRoot = root;

    root.setThemes([am5themes_Animated.new(root)]);
    root.container.setAll({
        width:      am5.percent(100),
        height:     am5.percent(100),
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize:   12
    });

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX:           true,
            panY:           false,
            wheelX:         'panX',
            wheelY:         'zoomX',
            pinchZoomX:     true,
            paddingLeft:    0,
            paddingRight:   2,
            paddingTop:     4,
            paddingBottom:  0
        })
    );

    // X axis
    const xRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: 55,
        strokeOpacity:   0.3,
        stroke:          am5.color(0x4a5568)
    });
    xRenderer.labels.template.setAll({
        fontSize:     11,
        fill:         am5.color(0xffffff),
        paddingTop:   4
    });
    xRenderer.grid.template.setAll({
        stroke:        am5.color(0x2d3748),
        strokeOpacity: 0.5
    });

    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            min:          0,
            max:          xMax,
            strictMinMax: true,
            renderer:     xRenderer
        })
    );

    xAxis.get('renderer').labels.template.adapters.add('text', (_t, tgt) => {
        const v = tgt.dataItem?.get('value');
        if (v == null) return _t;
        const sec = Math.round(v);
        if (sec < 60)   return `${sec}s`;
        if (sec < 3600) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return s === 0 ? `${m}m` : `${m}m${s}s`;
        }
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return m === 0 ? `${h}h` : `${h}h${m}m`;
    });

    // Y axis
    const maxTemp = Math.max(...measured, ...target, 10);
    const yRenderer = am5xy.AxisRendererY.new(root, {
        minGridDistance: 22,
        strokeOpacity:   0.3,
        stroke:          am5.color(0x4a5568),
        inside:          false
    });
    yRenderer.labels.template.setAll({
        fontSize:      11,
        fill:          am5.color(0xffffff),
        paddingRight:  4
    });
    yRenderer.grid.template.setAll({
        stroke:        am5.color(0x2d3748),
        strokeOpacity: 0.5
    });

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min:          0,
            max:          Math.ceil(maxTemp / 10) * 10 + 5,
            strictMinMax: true,
            renderer:     yRenderer
        })
    );

    yAxis.get('renderer').labels.template.adapters.add('text', (_t, tgt) => {
        const v = tgt.dataItem?.get('value');
        return v != null ? `${v}°` : _t;
    });

    // Series factory
    function makeSeries(field, color, name) {
        const s = chart.series.push(
            am5xy.LineSeries.new(root, {
                xAxis,
                yAxis,
                valueXField: 'x',
                valueYField: field,
                stroke:      am5.color(color),
                fill:        am5.color(color),
                name,
                tooltip: am5.Tooltip.new(root, {
                    labelText:         `{name}: {valueY.formatNumber('#.0')}°C`,
                    getFillFromSprite: false,
                    autoTextColor:     false
                })
            })
        );
        s.strokes.template.set('strokeWidth', 2);
        s.fills.template.setAll({ visible: true, fillOpacity: 0.12 });
        s.set('interpolationDuration', 0);
        return s;
    }

    seriesRefs.measured = makeSeries('m', 0xff4444, 'Sample');
    seriesRefs.target   = makeSeries('t', 0x4488ff, 'Target');

    const allData = measured.map((v, i) => ({ x: i * secPerSample, m: v, t: target[i] ?? 0 }));
    seriesRefs.measured.data.setAll(allData);
    seriesRefs.target.data.setAll(allData);

    // Cursor
    const cursor = chart.set('cursor', am5xy.XYCursor.new(root, {
        behavior: 'none',
        xAxis
    }));
    cursor.lineY.set('visible', false);

    // Legend
    const legend = chart.children.push(am5.Legend.new(root, {
        centerX: am5.p50,
        x:       am5.p50,
        layout:  root.horizontalLayout,
        paddingTop: 2
    }));
    legend.data.setAll(chart.series.values);
    legend.labels.template.setAll({ fontSize: 11, fill: am5.color(0xe2e8f0) });
    legend.markers.template.setAll({ width: 10, height: 10 });

    chart.zoomOutButton.set('forceHidden', true);
    chart.appear(500, 80);
}
