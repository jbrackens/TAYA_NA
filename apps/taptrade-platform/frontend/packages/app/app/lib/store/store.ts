"use client";
import { configureStore } from "@reduxjs/toolkit";
import pointBalanceReducer from "./pointBalanceSlice";

// Store shape. State keys MUST match what slice selectors dereference —
// pointBalanceSlice selectors read `state.pointBalance`. Changing a key here
// without updating the matching slice breaks every selector in that slice
// silently at runtime (selectors return undefined). If you add a slice, also
// add its reducer here.
//
// P12 dead-code sweep (2026-07-12): the sportsbook-era slices (auth,
// settings, navigation, profile, siteSettings, channelSubscriptions, bonus)
// were deleted — none had a consumer outside lib/store. pointBalance is the
// only live slice (TopBar balance pill + market detail post-trade refresh).
export const makeStore = () => {
  return configureStore({
    reducer: {
      pointBalance: pointBalanceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
