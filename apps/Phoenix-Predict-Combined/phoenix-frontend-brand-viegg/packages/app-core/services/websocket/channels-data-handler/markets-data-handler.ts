import {
  addMarketUpdate,
  removeMarketUpdate,
} from "../../../lib/slices/marketSlice";
import { MessageEventEnum } from "../websocket-service";

export enum MarketChannelTypeEnum {
  UPDATE = "update",
}

export const marketsChannelHandler = (data: any, dispatch: any) => {
  const payload = data.data;

  switch (data.event) {
    case MessageEventEnum.UNSUBSCRIBE_SUCCESS:
      dispatch(removeMarketUpdate(data.channel.split("^")[1]));
      break;
    case MarketChannelTypeEnum.UPDATE:
      dispatch(addMarketUpdate(payload));
      break;
  }
};
