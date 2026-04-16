import React, { useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addSubscription,
  removeSubscription,
  SelectSubscriptionQueue,
  removeMessageFromQueue,
  SelectSubscriptions,
  Message,
} from "../../../lib/slices/channels/channelSubscriptionSlice";
import WebsocketContext from "../../../components/api-wrapper/websocket-context";
import { useEffect } from "react";
import { MessageEventEnum } from "../websocket-service";

type ChannelSubscriptionManagerProps = {
  children?: React.ReactNode;
};

const ChannelSubscriptionManager: React.FC<ChannelSubscriptionManagerProps> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const subscriptionQueue = useSelector(SelectSubscriptionQueue);
  const subscriptions = useSelector(SelectSubscriptions);
  const websocketApi = useContext(WebsocketContext);

  const sendWsMessage = (message: Message) => {
    if (websocketApi.isConnectionOpen) {
      websocketApi.sendMessage({
        channel: message.channel,
        event: message.event,
        correlationId: message.correlationId,
      });
    }
  };

  useEffect(() => {
    if (websocketApi.isConnectionOpen) {
      let existingSubscriptions = [...subscriptions];
      let copiedSubscriptionQueue = [...subscriptionQueue];
      const sortedSubscriptionQueue = copiedSubscriptionQueue.sort((a, b) =>
        a.event.localeCompare(b.event),
      );

      sortedSubscriptionQueue.forEach((message) => {
        let existingIndex = existingSubscriptions.findIndex(
          (subscription) => subscription.channel === message.channel,
        );

        if (message.event === MessageEventEnum.SUBSCRIBE) {
          if (existingIndex === -1) {
            sendWsMessage(message);

            existingSubscriptions = [
              ...existingSubscriptions,
              {
                channel: message.channel,
                totalSubscriptions: 1,
              },
            ];
          } else {
            dispatch(addSubscription(message));

            if (existingIndex !== -1) {
              existingSubscriptions[existingIndex] = {
                channel: existingSubscriptions[existingIndex].channel,
                totalSubscriptions:
                  existingSubscriptions[existingIndex].totalSubscriptions + 1,
              };
            }
          }
        }

        if (message.event === MessageEventEnum.UNSUBSCRIBE) {
          dispatch(removeSubscription(message));
          if (existingIndex !== -1) {
            existingSubscriptions[existingIndex] = {
              channel: existingSubscriptions[existingIndex].channel,
              totalSubscriptions:
                existingSubscriptions[existingIndex].totalSubscriptions - 1,
            };

            if (existingSubscriptions[existingIndex].totalSubscriptions === 0) {
              sendWsMessage(message);
              existingSubscriptions.splice(existingIndex, 1);
            }
          }
        }

        dispatch(removeMessageFromQueue(message));
      });
    }
  }, [subscriptionQueue, websocketApi]);

  return <>{children}</>;
};

export { ChannelSubscriptionManager };
