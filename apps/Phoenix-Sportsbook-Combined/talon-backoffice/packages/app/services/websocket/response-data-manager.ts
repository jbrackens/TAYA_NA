import { Dispatch } from "redux";
import { channelsMap } from "./channels-map";
import { ParsedData, MessageEventEnum } from "./websocket-service";
import {
  addSubscription,
  cleanupSubscription,
  removeMessageFromQueue,
} from "../../lib/slices/channels/channelSubscriptionSlice";

export const responseDataManager = (data: ParsedData, dispatch: Dispatch) => {
  const { event, channel, correlationId } = data;

  if (event !== MessageEventEnum.ERROR) {
    switch (event) {
      case MessageEventEnum.SUBSCRIBE_SUCCESS:
        dispatch(addSubscription({ channel: channel }));
        dispatch(
          removeMessageFromQueue({
            channel: channel,
            event: event,
            correlationId: correlationId,
          }),
        );
        break;
      case MessageEventEnum.UNSUBSCRIBE_SUCCESS:
        dispatch(cleanupSubscription(channel));
        dispatch(
          removeMessageFromQueue({
            channel: channel,
            event: event,
            correlationId: correlationId,
          }),
        );
        break;
    }

    const channelKey = channel.split("^")[0];
    if (channelsMap[channelKey]) {
      channelsMap[channelKey].actions.saveChannelData(data, dispatch);
    }
  }
};
