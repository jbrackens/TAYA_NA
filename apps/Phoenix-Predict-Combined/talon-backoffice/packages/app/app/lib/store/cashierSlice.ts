'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface CashierState {
  isCashierDrawerVisible: boolean;
  currentBalance: number;
  isBalanceUpdateNeeded: boolean;
}

const initialState: CashierState = {
  isCashierDrawerVisible: false,
  currentBalance: 0,
  isBalanceUpdateNeeded: false,
};

const cashierSlice = createSlice({
  name: 'cashier',
  initialState,
  reducers: {
    showCashierDrawer: (state) => {
      state.isCashierDrawerVisible = true;
    },
    hideCashierDrawer: (state) => {
      state.isCashierDrawerVisible = false;
    },
    setCurrentBalance: (state, action: PayloadAction<number>) => {
      state.currentBalance = action.payload;
    },
    setBalanceUpdateNeeded: (state, action: PayloadAction<boolean>) => {
      state.isBalanceUpdateNeeded = action.payload;
    },
  },
});

export const {
  showCashierDrawer,
  hideCashierDrawer,
  setCurrentBalance,
  setBalanceUpdateNeeded,
} = cashierSlice.actions;

// Selectors
export const selectCashierDrawerVisible = (state: RootState) => state.cashier.isCashierDrawerVisible;
export const selectCurrentBalance = (state: RootState) => state.cashier.currentBalance;
export const selectIsBalanceUpdateNeeded = (state: RootState) => state.cashier.isBalanceUpdateNeeded;

export default cashierSlice.reducer;
