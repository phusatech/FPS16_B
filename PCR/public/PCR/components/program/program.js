// program.js
function initProgram() {
    const program = document.getElementById("program");
    const box = document.querySelector(".program-box");
    const closeBtn = document.getElementById("program-close");

    if (!program || !box || !closeBtn) return;

    closeBtn.addEventListener("click", () =>
    {
        program.classList.add("program-hidden");
    });
}

function showProgram({
    title = "Edit PCR Program",
    data = { HOLD_START_CNT:1, PCR_LOOP_CNT:1, STEP_PCR_CNT:[2], HOLD_END_CNT:1 },
    onSave = null
}) {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        overflowY: "auto"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
        background: "radial-gradient(circle at 50% 15%, #0f1e35 0%, #070e1c 75%, #020408 100%)",
        border: "1px solid rgba(34,211,238,0.18)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
        borderRadius: "18px",
        padding: "28px 24px 24px",
        minWidth: "320px",
        maxWidth: "88vw",
        textAlign: "center",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        fontSize: "15px",
        color: "#e0f2fe",
        boxSizing: "border-box",
    });

    const h2 = document.createElement("h2");
    h2.innerText = title;
    Object.assign(h2.style, {
        margin: "0 0 18px",
        fontSize: "17px",
        fontWeight: "700",
        color: "#e0f2fe",
        letterSpacing: "0.3px",
    });
    panel.appendChild(h2);

    const treeContainer = document.createElement("div");
    treeContainer.style = "text-align:left; color:#cbd5e1; font-size:14px; line-height:2;";
    panel.appendChild(treeContainer);

    const inputStyle = {
        width: "4ch",
        fontSize: "14px",
        textAlign: "center",
        borderRadius: "6px",
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(0,0,0,0.4)",
        color: "#f1f5f9",
        fontFamily: "inherit",
        padding: "3px 4px",
        outline: "none",
    };

    // --- Hold Start ---
    const holdStartDiv = document.createElement("div");
    holdStartDiv.innerHTML = `&#8227; Hold Stage : <input type="text">`;
    const holdStartInput = holdStartDiv.querySelector("input");
    holdStartInput.type = "text";
    holdStartInput.inputMode = "numeric";
    holdStartInput.pattern = "[0-9]*";
    holdStartInput.value = data.HOLD_START_CNT;
    Object.assign(holdStartInput.style, inputStyle);
    holdStartDiv.style.paddingLeft = "16px";
    treeContainer.appendChild(holdStartDiv);

    // --- PCR Stage ---
    const pcrDiv = document.createElement("div");
    pcrDiv.innerHTML = `&#8227; PCR Stage : <input type="text">`;
    const pcrInput = pcrDiv.querySelector("input");
    pcrInput.type = "text";
    pcrInput.inputMode = "numeric";
    pcrInput.pattern = "[0-9]*";
    pcrInput.value = data.PCR_LOOP_CNT;
    Object.assign(pcrInput.style, inputStyle);
    pcrDiv.style.paddingLeft = "16px";
    treeContainer.appendChild(pcrDiv);

    // --- Step Inputs ---
    const stepContainer = document.createElement("div");
    treeContainer.appendChild(stepContainer);
    const stepDivs = [];

    function renderSteps() {
        stepContainer.innerHTML = "";
        stepDivs.length = 0;

        for (let i = 0; i < data.PCR_LOOP_CNT; i++)
        {
            const div = document.createElement("div");
            div.style = "padding-left:40px;";
            const steps = data.STEP_PCR_CNT[i] || 2;
            div.innerHTML = `&#10230; Step in PCR Stage ${i+1}: <input type="text">`;
            const input = div.querySelector("input");
            input.value = steps;
            Object.assign(input.style, inputStyle);
            input.inputMode = "numeric";
            input.pattern = "[0-9]*";

            input.addEventListener("input", () => {
                input.value = input.value.replace(/[^0-9]/g, "");
            });
            input.addEventListener("blur", () => {
                let val = parseInt(input.value);
                if (isNaN(val)) val = 2;
                if (val < 2) val = 2;
                if (val > 4) val = 4;
                input.value = val;
            });

            stepContainer.appendChild(div);
            stepDivs.push(div);
        }
    }
    renderSteps();

    // --- Hold End ---
    const holdEndDiv = document.createElement("div");
    holdEndDiv.innerHTML = `&#8227; Hold Stage : <input type="text">`;
    const holdEndInput = holdEndDiv.querySelector("input");
    holdEndInput.type = "text";
    holdEndInput.inputMode = "numeric";
    holdEndInput.pattern = "[0-9]*";
    holdEndInput.value = data.HOLD_END_CNT;
    Object.assign(holdEndInput.style, inputStyle);
    holdEndDiv.style.paddingLeft = "16px";
    treeContainer.appendChild(holdEndDiv);

    // --- Buttons ---
    const btnContainer = document.createElement("div");
    btnContainer.style = "margin-top:22px; display:flex; gap:10px; width:100%;";

    const btnCancel = document.createElement("button");
    btnCancel.innerText = "Cancel";
    Object.assign(btnCancel.style, {
        flex: "1",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(148,163,184,0.15)",
        background: "rgba(255,255,255,0.05)",
        color: "#94a3b8",
        fontSize: "14px",
        fontWeight: "700",
        fontFamily: "inherit",
        cursor: "pointer",
        letterSpacing: "0.3px",
    });

    const btnApply = document.createElement("button");
    btnApply.innerText = "Apply";
    Object.assign(btnApply.style, {
        flex: "1",
        padding: "12px",
        borderRadius: "10px",
        background: "linear-gradient(135deg,#06b6d4 0%,#0284c7 100%)",
        border: "1px solid rgba(6,182,212,0.35)",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "700",
        fontFamily: "inherit",
        cursor: "pointer",
        letterSpacing: "0.3px",
        boxShadow: "0 4px 18px rgba(6,182,212,0.3)",
    });

    btnContainer.appendChild(btnCancel);
    btnContainer.appendChild(btnApply);
    panel.appendChild(btnContainer);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // --- Validation ---
    [holdStartInput, holdEndInput, pcrInput].forEach((input) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, "");
        });
        input.addEventListener("blur", () => {
            let val = parseInt(input.value);
            if (isNaN(val)) val = 1;
            if (val < 1) val = 1;
            if (val > 3) val = 3;
            input.value = val;

            if (input === pcrInput) {
                data.PCR_LOOP_CNT = val;
                renderSteps();
            }
        });
    });

    btnCancel.onclick = () => overlay.remove();
    btnApply.onclick = () => {
        data.HOLD_START_CNT = parseInt(holdStartInput.value) || 1;
        data.HOLD_END_CNT = parseInt(holdEndInput.value) || 1;
        data.PCR_LOOP_CNT = parseInt(pcrInput.value) || 1;

        data.STEP_PCR_CNT = stepDivs.map(div =>
        {
            const val = parseInt(div.querySelector("input").value);
            return isNaN(val) ? 1 : val;
        });

        if (onSave) onSave(data);
        overlay.remove();
    };

    return { close: () => overlay.remove() };
}
