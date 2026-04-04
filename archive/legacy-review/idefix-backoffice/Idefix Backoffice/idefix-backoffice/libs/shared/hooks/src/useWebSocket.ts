import { Socket, io } from "socket.io-client";

// TODO fix this hook
export function useWebSocket() {
  let socketInstance: Socket;

  if (process.env["NODE_ENV"] === "production") {
    socketInstance = io();
  } else {
    socketInstance = io({ transports: ["websocket"] });
  }

  const webSocket = {
    on: (ev: string, listener: (...args: any[]) => void) => socketInstance.on(ev, listener),
    off: (ev: string, listener: (...args: any[]) => void) => socketInstance.off(ev, listener),
    emit: (ev: string) => socketInstance.emit(ev)
  };

  return webSocket;
}
