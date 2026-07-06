import { useContext } from "react";
import WebsocketContext from "../api-wrapper/websocket-context";

export default function WebsocketSandbox() {
  const websocketApi = useContext(WebsocketContext);
  return (
    <>
      <button
        onClick={() => {
          websocketApi.sendMessage({
            header: {
              channelKey: "bet-data",
            },
            body: {
              _type: "subscribe-bets",
            },
          });
        }}
      >
        send message
      </button>
    </>
  );
}
