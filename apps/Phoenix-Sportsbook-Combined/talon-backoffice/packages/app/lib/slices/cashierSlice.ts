import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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

    setCurrentBalance: (state, action: PayloadAction<number>) => {
      state.currentBalance = action.payload;
    },

    setBalanceUpdateNeeded: (state, action: PayloadAction<boolean>) => {
      state.isBalanceUpdateNeeded = action.payload;
    },
  },
});

type CashierSliceState = {
  cashier: typeof initialState;
};

export const selectCashierDrawerVisible = (state: CashierSliceState) =>
  state.cashier.isCashierDrawerVisible;

export const selectCurrentBalance = (state: CashierSliceState) =>
  state.cashier.currentBalance;
export const selectIsBalanceUpdateNeeded = (state: CashierSliceState) =>
  state.cashier.isBalanceUpdateNeeded;

export const {
  showCashierDrawer,
  hideCashierDrawer,
  setCurrentBalance,
  setBalanceUpdateNeeded,
} = cashierSlice.actions;

export default cashierSlice.reducer;
