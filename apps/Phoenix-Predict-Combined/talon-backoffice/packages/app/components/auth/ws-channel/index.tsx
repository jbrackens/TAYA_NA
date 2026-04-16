import React, { useState, useEffect, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { useToken } from "@phoenix-ui/utils";
import { addMessageToQueue } from "../../../lib/slices/channels/channelSubscriptionSlice";
import { v4 as uuidv4 } from "uuid";
import WebsocketContext from "../../api-wrapper/websocket-context";

const WsChannelComponent: React.FC = () => {
  const dispatch = useDispatch();
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const { getToken } = useToken();
  const token = typeof localStorage !== "undefined" ? getToken() : "";
  const [prevToken, setPrevToken] = useState("");
  const websocketApi = useContext(WebsocketContext);

  const channels = ["bets", "wallets"];

  useEffect(() => {
    if (token !== "" && token !== null) {
      setPrevToken(token);
    }
    if (token === null) {
      if (websocketApi.isConnectionOpen) {
        channels.forEach((channel) => {
          websocketApi.sendMessage({
            channel,
            event: "unsubscribe",
            token: prevToken,
            correlationId: uuidv4(),
          });
        });
      }
    }
  }, [token]);

  useEffect(() => {
    if (isUserLoggedIn) {
      channels.forEach((channel) => {
        dispatch(addMessageToQueue({ channel, event: "subscribe" }));
      });
    }
  }, [isUserLoggedIn]);

  return <></>;
};
export { WsChannelComponent };
