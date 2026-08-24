/**
 * =========================================================
 * DATA DECODER MODULE
 * =========================================================
 * Vai trò:
 * - Chuyển đổi dữ liệu dựa trên File Modbus_Map.Json
 * - Chuyển dữ liệu Raw nhận được từ Slave vào các biến
 * =========================================================
 */

function getFloat(regs, addr) // Lấy số Float
{
    const index = addr - 1;

    const buf = Buffer.alloc(4);

    buf.writeUInt16BE(regs[index], 0);
    buf.writeUInt16BE(regs[index + 1], 2);

    return buf.readFloatBE(0);
}

function getU8(regs, addr) // Lấy số Uin8_t
{
    return regs[addr - 1] & 0xFF;
}

function getU16(regs, addr) // Lấy sớ Uint16_t
{
    return regs[addr - 1];
}



function decodeRegisters(raw, section)
{
    const result = {};

    for(const [name, item] of Object.entries(section))
    {
        const addr   = item.address;
        const type   = item.type;
        const length = item.length;

        if(length === 1)
        {
            switch(type)
            {
                case "float":
                    result[name] = getFloat(raw, addr);
                    break;

                case "u8":
                    result[name] = getU8(raw, addr);
                    break;

                case "u16":
                    result[name] = getU16(raw, addr);
                    break;
            }
        }
        else
        {
            result[name] = [];

            for(let i=0;i<length;i++)
            {
                switch(type)
                {
                    case "float":
                        result[name].push( getFloat(raw, addr + i * 2) );
                        break;

                    case "u8":
                        result[name].push(getU8(raw, addr + i) );
                        break;

                    case "u16":
                        result[name].push(getU16(raw, addr + i) );
                        break;
                }
            }
        }
    }

    return result;
}

module.exports =
{
    getFloat,
    getU8,
    getU16,
    decodeRegisters
};