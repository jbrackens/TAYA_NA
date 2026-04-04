import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import moment from "moment-timezone";
import api from "../../core/api";
import { RootState } from "../../rootReducer";
import { GamesSummary, PlayerTransaction, PlayerWithdrawals, Ticket, TransactionDate } from "app/types";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";
import { SortDirection } from "@material-ui/core";

export type Period = {
  startDate?: string | null;
  endDate?: string | null;
};

export type TransactionParams = {
  pageSize?: number;
  text?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
};

interface TransactionsState {
  isFetchingTransactions: number;
  isFetchingGames: boolean;
  isFetchingWithdrawals: boolean;
  transactions: PlayerTransaction[];
  transactionsDates: TransactionDate[];
  ticket: Ticket | null;
  isFetchingTicket: boolean;
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
  ticket: null,
  isFetchingTicket: false,
  games: [],
  withdrawals: null,
  period: {
    startDate: moment().subtract(1, "days").toISOString(),
    endDate: moment().toISOString(),
  },
};

export const refundRound = createAsyncThunk<void, { roundId: number }>(
  "transactions/refund-round",
  async ({ roundId }) => {
    try {
      await api.players.refundGameRound(roundId);
    } catch (err) {
      console.log(err);
    }
  },
);

export const closeRound = createAsyncThunk<void, { roundId: number }>(
  "transactions/close-round",
  async ({ roundId }) => {
    try {
      await api.players.closeGameRound(roundId);
    } catch (err) {
      console.log(err);
    }
  },
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
  },
);

export const fetchTransactions = createAsyncThunk<
  PlayerTransaction[] | undefined,
  { playerId: number } & TransactionParams
>("transactions/fetch-transactions", async ({ playerId, pageSize = 100, ...params }, { getState }) => {
  const { startDate, endDate } = getTransactionsPeriod(getState() as RootState);

  if (!startDate || !endDate) return;

  try {
    const transactions = await api.players.getTransactions(playerId, { startDate, endDate, pageSize, ...params });
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
  },
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
  },
);

export const fetchTicket = createAsyncThunk<Ticket, { externalRoundId: string }>(
  "transactions/fetch-ticket",
  async ({ externalRoundId }) => {
    try {
      const ticket = await api.players.getTicket(externalRoundId);
      return ticket;
    } catch (err) {
      console.log("error", err);
      return err.message;
    }
  },
);

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setInitialState: () => {
      return initialState;
    },
    onDatesChange: (
      state,
      action: PayloadAction<{ startDate: Date | MaterialUiPickersDate; endDate: Date | MaterialUiPickersDate }>,
    ) => {
      const { startDate, endDate } = action.payload;

      state.period = {
        startDate: startDate && startDate.toISOString(),
        endDate: endDate && endDate.toISOString(),
      };
    },
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
    builder.addCase(fetchGamesSummary.rejected, (state, action) => {
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

    builder.addCase(fetchTicket.pending, state => {
      state.isFetchingTicket = true;
    });
    builder.addCase(fetchTicket.fulfilled, (state, action) => {
      state.isFetchingTicket = false;
      state.ticket = action.payload;
    });
    builder.addCase(fetchTicket.rejected, state => {
      state.isFetchingTicket = false;
      state.ticket = null;
    });
  },
});

export const {
  reducer,
  actions: { setInitialState, onDatesChange },
} = transactionsSlice;

export const getTransactionsPeriod = (state: RootState) => state.transactions.period;
export const getTransactions = (state: RootState) => state.transactions;
export const getWithdrawals = (state: RootState) => state.transactions.withdrawals;
export const getTicket = (state: RootState) => state.transactions.ticket;
export const getIsTicketLoading = (state: RootState) => state.transactions.isFetchingTicket;
