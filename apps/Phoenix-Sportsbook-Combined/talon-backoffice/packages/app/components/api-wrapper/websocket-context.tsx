import { createContext } from "react";
import { UseWebsocket } from "../../services/websocket/websocket-service";

const defaultValue: UseWebsocket = {
  data: null,
  closeConnection: () => {},
  openConnection: () => {},
  sendMessage: (_msg: unknown) => {
    // no-op default
  },
  error: null,
  isConnectionOpen: false,
};

const WebsocketContext = createContext(defaultValue);

export default WebsocketContext;
