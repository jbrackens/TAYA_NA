import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { AccountActive, PaymentEvent, PlayerAccount, PlayerPayment } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

export interface Filters {
  complete: boolean;
  pending: boolean;
  failed: boolean;
  cancelled: boolean;
  created: boolean;
}

interface PaymentsState {
  filters: Filters;

  isFetchingTransactions: boolean;
  transactions: PlayerPayment[];

  isFetchingTransactionsEventLogs: boolean;
  eventLogs: PaymentEvent[];

  isFetchingAccounts: boolean;
  accounts: PlayerAccount[];

  description: string;
}

const initialState: PaymentsState = {
  filters: {
    complete: true,
    pending: true,
    failed: false,
    cancelled: false,
    created: false
  },

  isFetchingTransactions: false,
  transactions: [],

  isFetchingTransactionsEventLogs: false,
  eventLogs: [],

  isFetchingAccounts: false,
  accounts: [],

  description: ""
};

export const fetchPaymentTransactions = createAsyncThunk<
  PlayerPayment[],
  { playerId: number; pageSize?: number; text?: string }
>("payments/fetch-payment-transactions", async ({ playerId, pageSize = 100, text }, { getState, rejectWithValue }) => {
  const { filters } = (getState() as RootState).payments;

  const status = Object.entries(filters)
    .filter(([_, isTruthy]) => isTruthy)
    .map(([status]) => status);

  try {
    const transactions = await api.players.getPaymentTransactions(playerId, { status, pageSize, text });
    return transactions;
  } catch (err) {
    console.log(err, "error");
    return rejectWithValue(err);
  }
});

export const fetchPaymentTransactionsEventLogs = createAsyncThunk<
  PaymentEvent[],
  { playerId: number; paymentId: number }
>("payments/fetch-event-logs", async ({ playerId, paymentId }, { rejectWithValue }) => {
  try {
    const eventLogs = await api.players.getPaymentTransactionsEventLogs(playerId, paymentId);
    return eventLogs;
  } catch (err) {
    console.log(err, "error");
    return rejectWithValue(err);
  }
});

export const cancelPaymentTransaction = createAsyncThunk<void, { playerId: number; transactionKey: string }>(
  "payments/cancel-payment-transactions",
  async ({ playerId, transactionKey }, { dispatch }) => {
    try {
      await api.players.cancelPaymentTransaction(playerId, transactionKey);
      dispatch(fetchPaymentTransactions({ playerId }));
    } catch (err) {
      console.log(err, "error");
    }
  }
);

export const updateAccountActive = createAsyncThunk<
  AccountActive,
  { playerId: number; accountId: number; active: boolean }
>("payments/toggle-account-withdrawals", async ({ playerId, accountId, active }, { rejectWithValue }) => {
  try {
    const account = await api.players.updateAccountActive(playerId, accountId, active);
    return account;
  } catch (err) {
    console.log(err, "error");
    return rejectWithValue(err);
  }
});

export const updateAccountWithdrawals = createAsyncThunk<
  AccountActive,
  { playerId: number; accountId: number; withdrawals: boolean }
>("payment/toggle-account-withdrawals", async ({ playerId, accountId, withdrawals }, { rejectWithValue }) => {
  try {
    const account = await api.players.updateAccountWithdrawals(playerId, accountId, withdrawals);
    return account;
  } catch (err) {
    console.log(err, "error");
    return rejectWithValue(err);
  }
});

export const fetchPaymentAccounts = createAsyncThunk("payments/fetch-payments-accounts", async (playerId: number) => {
  try {
    const accounts = await api.players.getPaymentAccounts(playerId);
    return accounts;
  } catch (err) {
    console.log(err, "error");
    return;
  }
});

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    changeFilterValue(state, action) {
      state.filters = {
        ...state.filters,
        [action.payload.filter]: action.payload.value
      };
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPaymentTransactions.pending, state => {
        state.isFetchingTransactions = true;
      })
      .addCase(fetchPaymentTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
        state.isFetchingTransactions = false;
      })
      .addCase(fetchPaymentTransactions.rejected, state => {
        state.isFetchingTransactions = false;
      });
    builder
      .addCase(fetchPaymentTransactionsEventLogs.pending, state => {
        state.isFetchingTransactionsEventLogs = true;
      })
      .addCase(fetchPaymentTransactionsEventLogs.fulfilled, (state, action) => {
        state.eventLogs = action.payload;
        state.isFetchingTransactionsEventLogs = false;
      })
      .addCase(fetchPaymentTransactionsEventLogs.rejected, state => {
        state.isFetchingTransactionsEventLogs = false;
      });
    builder
      .addCase(fetchPaymentAccounts.pending, state => {
        state.isFetchingAccounts = true;
      })
      .addCase(fetchPaymentAccounts.fulfilled, (state, action) => {
        state.accounts = action.payload!.accounts;
        state.description = action.payload!.description;
        state.isFetchingAccounts = false;
      })
      .addCase(fetchPaymentAccounts.rejected, state => {
        state.isFetchingAccounts = false;
      });
    builder.addCase(updateAccountActive.fulfilled, (state, action) => {
      state.accounts = state.accounts.map(account => {
        if (account.id === action.payload.id) {
          return {
            ...account,
            active: action.payload.active
          };
        }
        return account;
      });
    });
    builder.addCase(updateAccountWithdrawals.fulfilled, (state, action) => {
      state.accounts = state.accounts.map(account => {
        if (account.id === action.payload.id) {
          return {
            ...account,
            withdrawals: action.payload.withdrawals
          };
        }
        return account;
      });
    });
  }
});

export const {
  reducer,
  actions: { changeFilterValue }
} = paymentsSlice;

const getState = (state: RootState) => state.payments;

export const getDescription = createSelector(getState, state => state.description);
export const getFilters = createSelector(getState, state => state.filters);

export const getTransactions = createSelector(getState, state => state.transactions);
export const getIsLoadingTransactions = createSelector(getState, state => state.isFetchingTransactions);

export const getAccounts = createSelector(getState, state => state.accounts);
export const getIsLoadingAccounts = createSelector(getState, state => state.isFetchingAccounts);

export const getEvents = createSelector(getState, state => state.eventLogs);
export const getIsLoadingEvents = createSelector(getState, state => state.isFetchingTransactionsEventLogs);
