import { Dispatch } from "redux";
import {
  addMarketUpdate,
  removeMarketUpdate,
  MarketUpdate,
} from "../../../lib/slices/marketSlice";
import { MessageEventEnum, ParsedData } from "../websocket-service";

export enum MarketChannelTypeEnum {
  UPDATE = "update",
}

export const marketsChannelHandler = (data: ParsedData, dispatch: Dispatch) => {
  const payload = data.data;

  switch (data.event) {
    case MessageEventEnum.UNSUBSCRIBE_SUCCESS:
      dispatch(removeMarketUpdate(data.channel.split("^")[1]));
      break;
    case MarketChannelTypeEnum.UPDATE:
      dispatch(addMarketUpdate(payload as MarketUpdate));
      break;
  }
};
