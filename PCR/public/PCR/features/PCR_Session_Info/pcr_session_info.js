import { API } from "../../core/api.js";
import { subscribe } from "../../core/socket_client.js";

window.API   = API;

//===========================================================================================
// Nhận phản hồi từ server
//===========================================================================================
subscribe("protocol:validate_name_result", (data) =>
{
    console.log(data);
    if (!data.success)
    {
        alert(data.message);
        return;
    }
    window.PROTOCOL_NAME = data.protocolName;     // Lưu tên protocol được xác nhận

    //Chuyển sang trang PCR_New
    goToPage("PCR/features/PCR_New/pcr_new.html", "new", "new");
});

// Đợi cho trang web tải xong rồi mới gán sự kiện
document.addEventListener("DOMContentLoaded", () => {
    
    document.getElementById("backBtn").addEventListener("click", () => 
    {
        goToPage("PCR/features/PCR_Base/pcr_base.html", "base", "none");
    });

    // Gán sự kiện cho nút Next
    document.getElementById("nextBtn").addEventListener("click", () => 
    {
        const protocolName = document.getElementById("protocolName").value.trim();
        window.API.send("protocol:validate_name", { protocolName });
    });
    
});

let _revealed = false;
function _reveal() {
    if (_revealed) return; _revealed = true;
    const main = document.getElementById('pcr-main');
    const ov   = document.getElementById('page-loading');
    if (main) main.style.visibility = '';
    if (ov) { ov.classList.add('page-loading-hidden'); setTimeout(() => ov.remove(), 350); }
}
setTimeout(_reveal, 3000);

function Render_PCR_Session_Info()
{
  loadHeader();
  document.addEventListener("headerLoaded", () =>
  {
    _reveal();
  });
}
/*==== Render Header khi include file này======*/
Render_PCR_Session_Info();


