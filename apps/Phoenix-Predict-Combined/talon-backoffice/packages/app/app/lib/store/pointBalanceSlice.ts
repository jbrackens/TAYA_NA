"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

interface PointBalanceState {
  currentBalance: number;
  isBalanceUpdateNeeded: boolean;
}

const initialState: PointBalanceState = {
  currentBalance: 0,
  isBalanceUpdateNeeded: false,
};

const pointBalanceSlice = createSlice({
  name: "pointBalance",
  initialState,
  reducers: {
    setCurrentBalance: (state, action: PayloadAction<number>) => {
      state.currentBalance = action.payload;
    },
    setBalanceUpdateNeeded: (state, action: PayloadAction<boolean>) => {
      state.isBalanceUpdateNeeded = action.payload;
    },
  },
});

export const { setCurrentBalance, setBalanceUpdateNeeded } =
  pointBalanceSlice.actions;

// Selectors
export const selectCurrentBalance = (state: RootState) =>
  state.pointBalance.currentBalance;
export const selectIsBalanceUpdateNeeded = (state: RootState) =>
  state.pointBalance.isBalanceUpdateNeeded;

export default pointBalanceSlice.reducer;
