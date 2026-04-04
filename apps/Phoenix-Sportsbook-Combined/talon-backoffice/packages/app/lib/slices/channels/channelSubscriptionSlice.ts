import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

export type Subscription = {
  channel: string;
  totalSubscriptions: number;
};

export type Message = {
  channel: string;
  event: string;
  correlationId?: string;
};

export type SubscriptionResponse = {
  channel: string;
};

type State = {
  subscriptions: Array<Subscription>;
  subscriptionQueue: Array<Message>;
};

export const initialState: State = {
  subscriptions: [],
  subscriptionQueue: [],
};

const channelSubscriptionSlice = createSlice({
  name: "channelSubscription",
  initialState,
  reducers: {
    addSubscription: (state, action: PayloadAction<SubscriptionResponse>) => {
      const subscriptionIndex = state.subscriptions.findIndex(
        (subscription) => subscription.channel === action.payload.channel,
      );

      if (subscriptionIndex !== -1) {
        state.subscriptions[subscriptionIndex].totalSubscriptions += 1;
      } else {
        state.subscriptions = [
          ...state.subscriptions,
          { channel: action.payload.channel, totalSubscriptions: 1 },
        ];
      }
    },

    removeSubscription: (
      state,
      action: PayloadAction<SubscriptionResponse>,
    ) => {
      const subscriptionIndex = state.subscriptions.findIndex(
        (subscription) => subscription.channel === action.payload.channel,
      );

      if (subscriptionIndex !== -1) {
        state.subscriptions[subscriptionIndex].totalSubscriptions -= 1;
      }
    },

    cleanupSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter(
        (el) => el.channel !== action.payload,
      );
    },

    addMessageToQueue: (state, action: PayloadAction<Message>) => {
      action.payload.correlationId = uuidv4();
      state.subscriptionQueue = [...state.subscriptionQueue, action.payload];
    },

    removeMessageFromQueue: (state, action: PayloadAction<Message>) => {
      state.subscriptionQueue = state.subscriptionQueue.filter(
        (el) => el.correlationId !== action.payload.correlationId,
      );
    },
  },
});

type SliceState = {
  [K in typeof channelSubscriptionSlice.name]: ReturnType<
    typeof channelSubscriptionSlice.reducer
  >;
};

export const SelectSubscriptions = (state: SliceState) =>
  state.channelSubscription.subscriptions;

export const SelectSubscriptionQueue = (state: SliceState) =>
  state.channelSubscription.subscriptionQueue;

export const {
  addSubscription,
  removeSubscription,
  addMessageToQueue,
  cleanupSubscription,
  removeMessageFromQueue,
} = channelSubscriptionSlice.actions;

export default channelSubscriptionSlice.reducer;
