import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import sub from "date-fns/sub";

import api from "@idefix-backoffice/idefix/api";
import { GamesSummary, PlayerTransaction, PlayerWithdrawals, TransactionDate } from "@idefix-backoffice/idefix/types";

import { RootState } from "../../rootReducer";

export type Period = {
  startDate?: string | null;
  endDate?: string | null;
};

interface TransactionsState {
  isFetchingTransactions: number;
  isFetchingGames: boolean;
  isFetchingWithdrawals: boolean;
  transactions: PlayerTransaction[];
  transactionsDates: TransactionDate[];
  games: GamesSummary[];
  withdrawals: PlayerWithdrawals | null;
  period: Period;
  error?: string;
}

const initialState: TransactionsState = {
  isFetchingTransactions: 0,
  isFetchingGames: false,
  isFetchingWithdrawals: false,
  transactions: [],
  transactionsDates: [],
  games: [],
  withdrawals: null,
  period: {
    startDate: sub(new Date(), { days: 1 }).toISOString(),
    endDate: new Date().toISOString()
  }
};

export const refundRound = createAsyncThunk<void, { roundId: number }>(
  "transactions/refund-round",
  async ({ roundId }) => {
    try {
      await api.players.refundGameRound(roundId);
    } catch (err) {
      console.log(err);
    }
  }
);

export const closeRound = createAsyncThunk<void, { roundId: number }>(
  "transactions/close-round",
  async ({ roundId }) => {
    try {
      await api.players.closeGameRound(roundId);
    } catch (err) {
      console.log(err);
    }
  }
);

export const fetchGamesSummary = createAsyncThunk<GamesSummary[] | undefined, { playerId: number }>(
  "transactions/fetch-games-summary",
  async ({ playerId }, { getState }) => {
    const { startDate, endDate } = getTransactionsPeriod(getState() as RootState);

    if (!startDate || !endDate) return;

    try {
      const games = await api.players.getGamesSummary(playerId, { startDate, endDate });
      return games;
    } catch (err) {
      console.log("error", err);
      return err.message;
    }
  }
);

export const fetchTransactions = createAsyncThunk<
  PlayerTransaction[] | undefined,
  { playerId: number; pageSize?: number; text?: string }
>("transactions/fetch-transactions", async ({ playerId, pageSize = 100, text }, { getState }) => {
  const { startDate, endDate } = getTransactionsPeriod(getState() as RootState);

  if (!startDate || !endDate) return;

  try {
    const transactions = await api.players.getTransactions(playerId, { startDate, endDate, pageSize, text });
    return transactions;
  } catch (err) {
    console.log("error", err);
    return err.message;
  }
});

export const fetchTransactionsDates = createAsyncThunk<TransactionDate[], { playerId: number }>(
  "transactions/fetch-transactions-dates",
  async ({ playerId }) => {
    try {
      const { dates } = await api.players.getTransactionDates(playerId);
      return dates;
    } catch (err) {
      console.log("error", err);
      return err.message;
    }
  }
);

export const fetchWithdrawals = createAsyncThunk<PlayerWithdrawals, { playerId: number }>(
  "transactions/fetch-withdrawals",
  async ({ playerId }) => {
    try {
      const withdrawals = await api.players.getWithdrawals(playerId);
      return withdrawals;
    } catch (err) {
      console.log("error", err);
      return err.message;
    }
  }
);

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setInitialState: () => {
      return initialState;
    },
    onDatesChange: (state, action: PayloadAction<{ startDate: Date; endDate: Date }>) => {
      const { startDate, endDate } = action.payload;

      state.period = {
        startDate: startDate && startDate.toISOString(),
        endDate: endDate && endDate.toISOString()
      };
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchGamesSummary.pending, state => {
      state.isFetchingGames = true;
    });
    builder.addCase(fetchGamesSummary.fulfilled, (state, action) => {
      const games = action.payload;
      state.isFetchingGames = false;
      if (games) {
        state.games = games;
      }
    });
    builder.addCase(fetchGamesSummary.rejected, state => {
      state.isFetchingGames = false;
    });

    builder.addCase(fetchTransactions.pending, state => {
      state.isFetchingTransactions = state.isFetchingTransactions + 1;
    });
    builder.addCase(fetchTransactions.fulfilled, (state, action) => {
      const transactions = action.payload;
      state.isFetchingTransactions = state.isFetchingTransactions - 1;
      if (transactions) {
        state.transactions = transactions;
      }
    });
    builder.addCase(fetchTransactions.rejected, state => {
      state.isFetchingTransactions = state.isFetchingTransactions - 1;
    });

    builder.addCase(fetchTransactionsDates.fulfilled, (state, action) => {
      const dates = action.payload;
      if (dates) {
        state.transactionsDates = dates;
      }
    });

    builder.addCase(fetchWithdrawals.pending, state => {
      state.isFetchingWithdrawals = true;
    });
    builder.addCase(fetchWithdrawals.fulfilled, (state, action) => {
      const withdrawals = action.payload;
      state.isFetchingWithdrawals = false;
      state.withdrawals = withdrawals;
    });
    builder.addCase(fetchWithdrawals.rejected, state => {
      state.isFetchingWithdrawals = false;
    });
  }
});

export const {
  reducer,
  actions: { setInitialState, onDatesChange }
} = transactionsSlice;

const getTransactionsState = (state: RootState) => state.transactions;

export const getTransactionsPeriod = createSelector(getTransactionsState, state => state.period);
export const getTransactions = createSelector(getTransactionsState, state => state.transactions);
export const getIsLoadingTransactions = createSelector(getTransactionsState, state =>
  Boolean(state.isFetchingTransactions)
);
export const getWithdrawals = createSelector(getTransactionsState, state => state.withdrawals);
export const getIsLoadingWithdrawals = createSelector(getTransactionsState, state => state.isFetchingWithdrawals);

export const getGames = createSelector(getTransactionsState, state => state.games);
export const getIsLoadingGames = createSelector(getTransactionsState, state => state.isFetchingGames);

export const getTransactionsDates = createSelector(getTransactionsState, state => state.transactionsDates);
