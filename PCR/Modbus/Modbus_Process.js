/*
Chạy các lệnh này để không bị chiếm cổng Uart

sudo systemctl stop fps16b.service
sudo systemctl stop server_app.service

sudo systemctl disable fps16b.service
sudo systemctl disable server_app.service
sudo systemctl daemon-reload

*/

//==================== Phần dành cho khởi tạo Modbus giao tiếp PCR ================
const ModbusClient  = require("../Modbus/Modbus_Client");
const PollingEngine = require("../Modbus/Polling_engine");

// Khởi tạo instance và export trực tiếp để dùng chung toàn hệ thống
let modbusInstance = null;

//================================ Hàm chạy Polling lấy dữ liệu Modbus mỗi 0.2s ================================================//
async function startSystem()
{
    const modbus = new ModbusClient();

    await modbus.connect();       
    PollingEngine.init(modbus);
    await PollingEngine.start();
}

module.exports = {
    startSystem,
    getModbusInstance: () => modbusInstance
};
//========================================================================
