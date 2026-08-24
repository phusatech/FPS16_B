// public/PCR/core/api.js
import { send, subscribe } from "./socket_client.js";

export const API = {
    startPCR: (configData) => { send("system_run", configData); },
    stopPCR:  () => { send("system_stop", {}); },
    pausePCR: () => { send("system_pause", {}); },
    autoPCR:  () => { send("system_auto", {}); },
    send:      (eventName, data = {}) => { send(eventName, data); },
    subscribe: (eventName, callback)  => subscribe(eventName, callback)
};