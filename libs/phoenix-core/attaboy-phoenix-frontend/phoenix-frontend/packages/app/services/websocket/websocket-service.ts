import { useState, useEffect } from "react";
import { responseDataManager } from "./response-data-manager";
import { useToken } from "@phoenix-ui/utils";
import { useApi } from "../../services/api/api-service";
import { useDispatch, useSelector } from "react-redux";
import {
  showWsErrorModal,
  selectIsLoggedIn,
  selectIsWsConnected,
  setWsConnected,
  setWsDisconnected,
} from "../../lib/slices/authSlice";

const {
  WS_GLOBAL_ENDPOINT,
} = require("next/config").default().publicRuntimeConfig;

export type UseWebsocket = {
  data: ParsedData | null;
  closeConnection: () => void;
  openConnection: () => void;
  sendMessage: (message: any) => void;
  error: null | string;
  isConnectionOpen: boolean;
};

export type ParsedData = {
  event: string;
  channel: string;
  correlationId?: string;
  data: {
    [key: string]: any;
  };
};

export type Message = {
  event: string;
  channel: string;
  token?: string;
};

export enum MessageEventEnum {
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  SUBSCRIBE_SUCCESS = "subscribe:success",
  UNSUBSCRIBE_SUCCESS = "unsubscribe:success",
  UPDATE = "update",
  ERROR = "error",
}

export const useWebsocket = (): UseWebsocket => {
  const [data, setData] = useState<ParsedData | null>(null);
  const [sock, setSock] = useState<WebSocket | null>(null);
  const [isClosedByUser, setIsClosedByUser] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const isConnectionOpen = useSelector(selectIsWsConnected);
  const { getToken } = useToken();
  const { triggerRefresh } = useApi("", "POST");
  const [intervalState, setIntervalState] = useState(0);
  const isUserLoggedIn = useSelector(selectIsLoggedIn);

  const setIsConnectionOpen = (isOpen: boolean) => {
    if (isOpen) {
      dispatch(setWsConnected());
    } else {
      dispatch(setWsDisconnected());
    }
  };

  if (sock) {
    sock.onopen = () => {
      setIntervalState((prevState) => prevState + 1);
      setReconnectCount(0);
      setIsConnectionOpen(true);
    };

    sock.onmessage = (e: MessageEvent) => {
      if (e.data) {
        setData(JSON.parse(e.data));
        responseDataManager(JSON.parse(e.data), dispatch);
      }
    };

    sock.onclose = () => {
      setIsConnectionOpen(false);
      if (!isClosedByUser && reconnectCount < 5) {
        isUserLoggedIn && triggerRefresh(true);
        openConnection();
        setReconnectCount(reconnectCount + 1);
      }
      if (reconnectCount === 5) {
        dispatch(showWsErrorModal());
        setError("Unable to connect to the server");
        setData(null);
      }
    };
  }

  const closeConnection = () => {
    if (sock) {
      setIsClosedByUser(true);
      sock.close();
    }
  };

  const openConnection = () => {
    setIsClosedByUser(false);
    setSock(new WebSocket(`${WS_GLOBAL_ENDPOINT}`));
  };

  const sendMessage = (message: Message) => {
    setIntervalState((prevState) => prevState + 1);
    let messageWithToken;
    if (message.token !== undefined) {
      messageWithToken = message;
    } else {
      messageWithToken = {
        ...message,
        token: getToken(),
      };
    }
    if (sock) {
      sock.send(JSON.stringify(messageWithToken));
    }
  };

  /**
   * Heartbeat
   */
  const heartbeatIntervalTime = 50000;

  useEffect(() => {
    let interval: number;
    if (intervalState > 0) {
      // https://github.com/Microsoft/TypeScript/issues/30128
      // @ts-ignore
      interval = setInterval(() => {
        sendMessage({
          event: "heartbeat",
          channel: "heartbeat",
        });
      }, heartbeatIntervalTime);
    }

    return () => {
      clearInterval(interval);
    };
  }, [intervalState]);

  return {
    data,
    closeConnection,
    openConnection,
    sendMessage,
    error,
    isConnectionOpen,
  };
};
