import { createContext } from "react";
import { UseWebsocket } from "../../services/websocket/websocket-service";

const defaultValue: UseWebsocket = {
  data: null,
  closeConnection: () => {},
  openConnection: () => {},
  sendMessage: (msg: any) => {
    msg;
  },
  error: null,
  isConnectionOpen: false,
};

const WebsocketContext = createContext(defaultValue);

export default WebsocketContext;
