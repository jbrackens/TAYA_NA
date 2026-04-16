'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface Subscription {
  channel: string;
  totalSubscriptions: number;
}

interface Message {
  channel: string;
  event: string;
  correlationId: string;
}

interface ChannelSubscriptionState {
  subscriptions: Subscription[];
  messageQueue: Message[];
}

const initialState: ChannelSubscriptionState = {
  subscriptions: [],
  messageQueue: [],
};

const channelSubscriptionSlice = createSlice({
  name: 'channelSubscriptions',
  initialState,
  reducers: {
    addSubscription: (state, action: PayloadAction<Subscription>) => {
      const existingIndex = state.subscriptions.findIndex(
        (sub) => sub.channel === action.payload.channel
      );
      if (existingIndex >= 0) {
        state.subscriptions[existingIndex] = action.payload;
      } else {
        state.subscriptions.push(action.payload);
      }
    },
    removeSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter((sub) => sub.channel !== action.payload);
    },
    cleanupSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter((sub) => sub.channel !== action.payload);
    },
    addMessageToQueue: (state, action: PayloadAction<Message>) => {
      state.messageQueue.push(action.payload);
    },
    removeMessageFromQueue: (state, action: PayloadAction<string>) => {
      state.messageQueue = state.messageQueue.filter(
        (msg) => msg.correlationId !== action.payload
      );
    },
  },
});

export const {
  addSubscription,
  removeSubscription,
  cleanupSubscription,
  addMessageToQueue,
  removeMessageFromQueue,
} = channelSubscriptionSlice.actions;

// Selectors
export const selectSubscriptions = (state: RootState) => state.channelSubscriptions.subscriptions;
export const selectMessageQueue = (state: RootState) => state.channelSubscriptions.messageQueue;

export default channelSubscriptionSlice.reducer;
