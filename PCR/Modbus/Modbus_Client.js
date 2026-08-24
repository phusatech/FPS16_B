/**
 * =========================================================
 * MODBUS CLIENT DRIVER (UART RTU MASTER)
 * =========================================================
 * Vai trò:
 * - Kết nối UART với STM32
 * - Gửi request Modbus RTU
 * - Nhận raw register data
 * =========================================================
 */

const ModbusRTU = require("modbus-serial");

class ModbusClient
{
    constructor()
    {
        this.client = new ModbusRTU();
    }

    /**
     * Kết nối UART tới STM32
     */
    async connect()
    {
        try
        {
            await this.client.connectRTUBuffered(
                "/dev/serial0",
                {
                    baudRate: 115200,
                    dataBits: 8,
                    parity: "none",
                    stopBits: 1
                }
            );


            this.client.setID(1);
            this.client.setTimeout(1000); // Cài thời gian Timeout Modbus là 1s
            console.log("[MODBUS_CLIENT] UART Init Success");
        }
        catch(err)
        {
            console.log("CONNECT ERROR:", err);
            throw err;
        }
    }

    /* Đọc Holding Registers */
    async readHolding(start, length)
    {
        const res = await this.client.readHoldingRegisters(start, length);
        return res.data;
    }

    /* Đọc Input Registers */
    async readInput(start, length)
    {
        const res = await this.client.readInputRegisters(start, length);
        return res.data;
    }

    /* Ghi Multiple Holding Registers (FC16) */
    async writeRegisters(start, arrayData)
    {
        // Sử dụng hàm gốc của thư viện modbus-serial thông qua instance client
        const res = await this.client.writeRegisters(start, arrayData);
        return res;
    }

    /* Xóa stale bytes trong OS serial buffer sau khi timeout */
    async flushPort()
    {
        try {
            const port = this.client._port;
            if (port && typeof port.flush === "function") await port.flush();
        } catch (_) {}
    }
}

module.exports = ModbusClient;