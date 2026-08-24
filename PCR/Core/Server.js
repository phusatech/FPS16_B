// Nhiệm vụ:

// Tạo HTTP Server
// Tạo Socket.IO
// Start Express

const Modbus_Process =
require("./Modbus/Modbus_Process");

const {InitServer
}
=
require("./Core/Server");

Modbus_Process.startSystem();

InitServer();