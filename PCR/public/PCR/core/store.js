// public/PCR/core/store.js

const Store =
{
    Show_UI:  {},
    Setpoint: {},
    System:   {},
    Calib:    {},
    Pro_State:{},
    Pro_Conf: {}
};

/**
 * update toàn bộ store
 */
function updateStore(data)
{
    Object.assign(Store, data);
}

export { Store, updateStore };