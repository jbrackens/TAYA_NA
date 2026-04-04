import { io } from "socket.io-client";

let socket: any;

if (process.env.NODE_ENV === "development") {
  socket = io();
} else {
  socket = io({ transports: ["websocket"] });
}

export const on = (key: any, listener: any) => socket.on(key, listener);
export const off = (key: any, listener: any) => socket.off(key, listener);
export const emit = (key: any) => socket.emit(key);
