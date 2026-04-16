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
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
