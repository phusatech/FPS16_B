/**
 * =========================================================
 * SYSTEM CACHE (FULL MIRROR STM32 SYSTEM_DATA.h)
 * =========================================================
 * - Lưu trữ dữ liệu
 * - Dựa vào định nghĩa file map để giải mã dữ liệu thô từ Modbus thành dữ liệu có ý nghĩa
 * =========================================================
 */

function expandCache(Cache, decoded)
{
    for(const [key, value] of Object.entries(decoded))
    {
        let group;
        let field;

        if(key.startsWith("Show_UI_"))       { group = "Show_UI";   field = key.replace("Show_UI_", "");  }
        else if(key.startsWith("Pro_State_")){ group = "Pro_State"; field = key.replace("Pro_State_", "");}
        else if(key.startsWith("ProConf_"))  { group = "Pro_Conf";  field = key.replace("ProConf_", "");  }
        else if(key.startsWith("System_"))   { group = "System";    field = key.replace("System_", "");}
        else if(key.startsWith("Calib_"))    { group = "Calib";     field = key.replace("Calib_", "");}
        else
        {
            const pos = key.indexOf('_');
            if(pos < 0) continue;
            group = key.substring(0, pos);
            field = key.substring(pos + 1);
        }

        if(!Cache[group])
            Cache[group] = {};

        Cache[group][field] = value;
    }
}


const Cache =
{
    input: {},
    holding: {},
    meta:
    {
        lastInputUpdate: 0,
        lastHoldingUpdate: 0
    }
};

module.exports = {
    Cache,
    expandCache
};
