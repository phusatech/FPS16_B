/**
 * =========================================================
 * CONSTANT
 * =========================================================
 * - Định nghĩa các giá trị tối đa cho hệ thống
 * =========================================================
 */

module.exports =
{
    // ─── CẤU HÌNH ĐỘ DÀI MẢNG CỐ ĐỊNH ───
    TEMP_TIME_SETPOINT_NUM : 30,
    PCR_LOOP               : 4,
    TEMP_SENSOR            : 5,

    // ─── INDEX_REGISTERS_MODBUS_RECEIVE ───
    // Định danh loại gói tin/lệnh ghi dịch chuyển xuống STM32
    INDEX_REGISTERS_MODBUS_RECEIVE: {
        MT_UPDATE_NONE              : 0,
        MT_UPDATE_SYSTEM_STATE      : 2,
        MT_UPDATE_BLOCK_TIME_CONFIG : 3,
        MT_UPDATE_PROTOCOL_CONFIG   : 4,
        MT_UPDATE_CALIB_CONFIG      : 1,
        MT_UPDATE_PRO_STATE         : 5,
    },

    // ─── SYSTEM_STATETYPEDEF ───
    // Các trạng thái vận hành cốt lõi của máy PCR
    SYSTEM_STATE: {
        SYSTEM_STOP   : 0,
        SYSTEM_RUN    : 1,
        SYSTEM_PAUSE  : 2,
        SYSTEM_AUTO   : 3,
        SYSTEM_RESUME : 4
    },

    // ─── DEBUG_TYPEDEF ───
    // Cấu hình bật/tắt log dữ liệu chi tiết để chẩn đoán lỗi
    DEBUG_LOG: {
        DISABLE : 0,
        ENABLE  : 1
    },

    // ─── SIMULATE_TYPEDEF ───
    // Cấu hình chế độ giả lập phần cứng (Chạy test không cần mạch thật)
    SIMULATE: {
        DISABLE : 0,
        ENABLE  : 1
    },

    // ─── CALIB_SAVE_STATUS ───
    // Giá trị thanh ghi Input 30054 (offset 53) sau khi ghi lệnh WRITE_CALIB
    // Slave tự cập nhật sau khi lưu flash xong
    CALIB_SAVE_STATUS: {
        CALIB_SAVE_IDLE : 0,   // Chưa lưu lần nào / đang xử lý
        CALIB_SAVE_OK   : 1,   // Lưu flash thành công
        CALIB_SAVE_FAIL : 2    // Lưu flash thất bại
    }
};