import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
  isCashierDrawerVisible: false,
  currentBalance: 0,
  isBalanceUpdateNeeded: false,
};

const cashierSlice = createSlice({
  name: "cashier",
  initialState,
  reducers: {
    showCashierDrawer: (state) => {
      state.isCashierDrawerVisible = true;
    },

    hideCashierDrawer: (state) => {
      state.isCashierDrawerVisible = false;
    },

    setCurrentBalance: (state, action) => {
      state.currentBalance = action.payload;
    },

    setBalanceUpdateNeeded: (state, action) => {
      state.isBalanceUpdateNeeded = action.payload;
    },
  },
});

export const selectCashierDrawerVisible = (state: any) =>
  state.cashier.isCashierDrawerVisible;

export const selectCurrentBalance = (state: any) =>
  state.cashier.currentBalance;
export const selectIsBalanceUpdateNeeded = (state: any) =>
  state.cashier.isBalanceUpdateNeeded;

export const {
  showCashierDrawer,
  hideCashierDrawer,
  setCurrentBalance,
  setBalanceUpdateNeeded,
} = cashierSlice.actions;

export default cashierSlice.reducer;
