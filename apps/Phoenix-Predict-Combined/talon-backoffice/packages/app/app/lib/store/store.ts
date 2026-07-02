"use client";
import { configureStore } from "@reduxjs/toolkit";
// Import all slice reducers
import authReducer from "./authSlice";
import bonusReducer from "./bonusSlice";
import settingsReducer from "./settingsSlice";
import pointBalanceReducer from "./pointBalanceSlice";
import channelSubscriptionReducer from "./channelSubscriptionSlice";
import navigationReducer from "./navigationSlice";
import profileReducer from "./profileSlice";
import siteSettingsReducer from "./siteSettingsSlice";

// Store shape. State keys MUST match what slice selectors dereference — e.g.
// profileSlice has `state.profile` and siteSettingsSlice has
// `state.siteSettings`. Changing a key here without updating the matching
// slice breaks every selector in that slice silently at runtime (selectors
// return undefined). If you add a slice, also add its reducer here.
export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      bonus: bonusReducer,
      settings: settingsReducer,
      pointBalance: pointBalanceReducer,
      channelSubscriptions: channelSubscriptionReducer,
      navigation: navigationReducer,
      profile: profileReducer,
      siteSettings: siteSettingsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
