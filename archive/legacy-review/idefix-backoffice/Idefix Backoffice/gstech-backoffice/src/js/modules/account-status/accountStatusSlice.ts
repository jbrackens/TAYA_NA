import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { ClosedAccount, PlayerAccountStatus, PlayerAccountStatusDraft, RiskStatus } from "app/types";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface IAccountStatusState {
  error?: any;
  isLoadingAccountsStatus: boolean;
  isLoadingPlayers: boolean;
  players: ClosedAccount[];
  values: PlayerAccountStatus;
}

const initialState: IAccountStatusState = {
  isLoadingAccountsStatus: false,
  isLoadingPlayers: true,
  players: [],
  values: {
    verified: false,
    allowTransactions: false,
    loginBlocked: false,
    allowGameplay: false,
    preventLimitCancel: false,
    accountClosed: false,
    accountSuspended: false,
    gamblingProblem: false,
    documentsRequested: false,
    riskProfile: "low",
    ddPending: false,
    ddMissing: false,
    activated: false,
    depositLimitReached: null,
    pep: false,
    potentialGamblingProblem: false,
    modified: {},
  },
};

export const fetchAccountStatus = createAsyncThunk<PlayerAccountStatus, number>(
  "limits/fetch-account-status",
  async (playerId, { rejectWithValue }) => {
    try {
      const accountStatus = await api.players.getAccountStatus(playerId);
      return accountStatus;
    } catch (err) {
      let error: any = err.response.data || err.message;
      console.log(error, "error");
      return rejectWithValue(error);
    }
  },
);

export const updateAccountStatusSuccess = createAction(
  "limits/update-account-status-success",
  (accountStatus: PlayerAccountStatus) => ({ payload: accountStatus }),
);

export const updateAccountStatus = createAsyncThunk<
  void,
  { playerId: number; field: keyof PlayerAccountStatusDraft; value: boolean | RiskStatus; reason?: string }
>("limits/update-account-status", async ({ playerId, field, value, reason }, { dispatch, rejectWithValue }) => {
  try {
    const accountStatus = await api.players.updateAccountStatus(playerId, { [field]: value, reason });
    dispatch(updateAccountStatusSuccess(accountStatus));
  } catch (err) {
    let error: any = err.response.data || err.message;
    console.log(error, "error");
    return rejectWithValue(error);
  }
});

export const fetchPlayersWithClosedAccounts = createAsyncThunk(
  "limits/fetch-players-with-closed-accounts",
  async (playerId: number) => {
    const players = await api.players.getPlayersWithClosedAccounts(playerId);
    return players;
  },
);

const accountStatusSlice = createSlice({
  name: "accountStatus",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchAccountStatus.pending, state => {
      state.isLoadingAccountsStatus = true;
    });
    builder.addCase(fetchAccountStatus.fulfilled, (state, action) => {
      state.isLoadingAccountsStatus = false;
      state.values = action.payload;
    });
    builder.addCase(fetchAccountStatus.rejected, (state, action) => {
      state.isLoadingAccountsStatus = false;
      state.error = action.error;
    });
    builder.addCase(updateAccountStatusSuccess, (state, action) => {
      state.values = action.payload;
    });
    builder.addCase(updateAccountStatus.rejected, (state, action) => {
      state.error = action.error;
    });
    builder.addCase(fetchPlayersWithClosedAccounts.pending, state => {
      state.isLoadingPlayers = true;
    });
    builder.addCase(fetchPlayersWithClosedAccounts.fulfilled, (state, action) => {
      state.isLoadingPlayers = false;
      state.players = action.payload;
    });
  },
});

export const { reducer } = accountStatusSlice;

export const getAccountStatusState = (state: RootState) => state.accountStatus;

export const getAccountStatus = createSelector(getAccountStatusState, state => state.values);
