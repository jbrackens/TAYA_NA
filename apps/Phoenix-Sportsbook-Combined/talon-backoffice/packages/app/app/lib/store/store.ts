'use client';
import { configureStore } from '@reduxjs/toolkit';
// Import all slice reducers
import authReducer from './authSlice';
import betReducer from './betSlice';
import sportReducer from './sportSlice';
import marketReducer from './marketSlice';
import fixtureReducer from './fixtureSlice';
import settingsReducer from './settingsSlice';
import navigationReducer from './navigationSlice';
import cashierReducer from './cashierSlice';
import siteSettingsReducer from './siteSettingsSlice';
import channelSubscriptionReducer from './channelSubscriptionSlice';
import profileReducer from './profileSlice';
import predictionReducer from './predictionSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      bets: betReducer,
      sports: sportReducer,
      markets: marketReducer,
      fixtures: fixtureReducer,
      settings: settingsReducer,
      navigation: navigationReducer,
      cashier: cashierReducer,
      siteSettings: siteSettingsReducer,
      channelSubscriptions: channelSubscriptionReducer,
      profile: profileReducer,
      prediction: predictionReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
