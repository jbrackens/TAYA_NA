import { MessageEventEnum } from "../websocket-service";
import { handleBetUpdate } from "./utils";

export enum BetChannelEventEnum {
  UPDATE = "UPDATE",
}

export enum BetChannelStateTypeEnum {
  OPENED = "OPENED",
  CANCELLED = "CANCELLED",
  SETTLED = "SETTLED",
  FAILED = "FAILED",
}

export const betsChannelHandler = (data: any, dispatch: any) => {
  switch (data.event) {
    case MessageEventEnum.UPDATE:
      handleBetUpdate(data.data, dispatch);
      break;
  }
};
