"use client";
import { configureStore } from "@reduxjs/toolkit";
// Import all slice reducers
import authReducer from "./authSlice";
import betReducer from "./betSlice";
import bonusReducer from "./bonusSlice";
import marketReducer from "./marketSlice";
import fixtureReducer from "./fixtureSlice";
import settingsReducer from "./settingsSlice";
import cashierReducer from "./cashierSlice";
import predictionReducer from "./predictionSlice";
import channelSubscriptionReducer from "./channelSubscriptionSlice";
import navigationReducer from "./navigationSlice";
import profileReducer from "./profileSlice";
import siteSettingsReducer from "./siteSettingsSlice";
import sportReducer from "./sportSlice";

// Store shape. State keys MUST match what slice selectors dereference — e.g.
// profileSlice has `state.profile`, siteSettingsSlice has `state.siteSettings`,
// sportSlice has `state.sports` (plural). Changing a key here without updating
// the matching slice breaks every selector in that slice silently at runtime
// (selectors return undefined). If you add a slice, also add its reducer here.
export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      bets: betReducer,
      bonus: bonusReducer,
      markets: marketReducer,
      fixtures: fixtureReducer,
      settings: settingsReducer,
      cashier: cashierReducer,
      prediction: predictionReducer,
      channelSubscriptions: channelSubscriptionReducer,
      navigation: navigationReducer,
      profile: profileReducer,
      siteSettings: siteSettingsReducer,
      sports: sportReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
