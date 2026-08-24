/**
 * @fileoverview PageRouter.js - Quản lý điều hướng tập trung qua Socket.
 * Lưu trạng thái vào window/localStorage trước khi chuyển đổi router.
 */

import { subscribe } from "../core/socket_client.js";

// window.goToPage = function (pagePath, Tab_Prev, Option) {
//     if (window.API?.send) {
//         window.API.send("Save_Page_To_Server", { pagePath, Tab_Prev, Option });
//     } else {
//         console.error("❌ Core API hoặc Socket chưa sẵn sàng!");
//     }
// };

/**
 * Phát sự kiện chuyển trang lên Server.
 * @global Gán window để tương thích với inline-script HTML và mã nguồn cũ (non-module).
 */

/**
 * Lắng nghe sự kiện từ Server để đồng bộ trạng thái và thực thi chuyển trang.
 */
// subscribe("Go_To_Page_Web", (data) => {
//     if (!data) return;

//     const pagePath   = data.pagePath || "";
//     const tabPrev    = data.Tab_Prev || "none";
//     const optionPrev = data.Option   || "new";

//     // Đồng bộ state hệ thống
//     window.System = { Tab_Prev: tabPrev, Option_Prev: optionPrev };
//     localStorage.setItem("PCR_System_Config", JSON.stringify(window.System));

//     // Chuẩn hóa đường dẫn và thực hiện điều hướng
//     const targetPath = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
//     if (targetPath && window.location.pathname !== targetPath) {
//         window.location.href = targetPath;
//     }
// });



window.goToPage = function (pagePath, tabStatus, optionStatus)
{
    if (!window.API?.send)
    {
        console.error("❌ Core API chưa sẵn sàng!");
        return;
    }

    // ==================================================
    // 🔥 SEND SERVER
    // ==================================================
    window.API.send("Save_Page_To_Server",
    {  pagePath, tabStatus, optionStatus });

    // ==================================================
    // 🔥 UPDATE FRONTEND SYSTEM STATE
    // ==================================================
    window.System = {
        PagePath_Status: pagePath,
        Tab_Status: tabStatus,
        Option_Status: optionStatus
    };
};

// subscribe("Go_To_Page_Web", (data) =>
// {
//     if (!data) return;

//     window.System = {
//         PagePath_Status: data.pagePath || "",
//         Tab_Status: data.tabStatus     || "none",
//         Option_Status: data.optionStatus || "view"
//     };

//     const targetPath = data.pagePath?.startsWith("/") ? data.pagePath : `/${data.pagePath}`;

//     console.log(targetPath);

//     if (targetPath && window.location.pathname !== targetPath) {
//         window.location.href = targetPath;
//     }
// });

subscribe("Go_To_Page_Web", (data) =>
{
    if (!data?.pagePath) return;

    // Đồng bộ trạng thái
    window.System = {
        PagePath_Status: data.pagePath,
        Tab_Status: data.tabStatus       || "none",
        Option_Status: data.optionStatus || "view",
    };

    window.SystemReady = true;

    const targetPath = data.pagePath.startsWith("/")
        ? data.pagePath
        : `/${data.pagePath}`;

    // So sánh chuẩn hóa
    const currentPath = decodeURIComponent(window.location.pathname);

    // console.log("[PAGE]");
    // console.log("Current:", currentPath);
    // console.log("Target :", targetPath);

    // Đang ở đúng trang -> không làm gì
    if (currentPath === targetPath)
    {
        return;
    }

    // Chỉ redirect khi thực sự khác trang
    window.location.replace(targetPath);
});
