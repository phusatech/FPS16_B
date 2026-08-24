import { io } from "/socket.io/socket.io.esm.min.js";

const socket = io();
const listeners = {};

// =====================================================
// SUBSCRIBE
// =====================================================
function subscribe(eventName, callback)
{
    if (!listeners[eventName])
    {
        listeners[eventName] = [];

        socket.on(eventName, (data) =>
        {
            listeners[eventName].forEach(cb => cb(data));
        });
    }

    listeners[eventName].push(callback);
}

// =====================================================
// SEND
// =====================================================
function send(eventName, data = {})
{
    socket.emit(eventName, data);
}

// =====================================================
// GLOBAL API
// =====================================================
window.API =
{
    send,
    subscribe,
    socket
};

export
{
    socket,
    subscribe,
    send
};