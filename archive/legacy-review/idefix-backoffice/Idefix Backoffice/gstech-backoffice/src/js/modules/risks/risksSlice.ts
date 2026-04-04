import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { ConnectedPlayer, RiskLog, RiskStatus, RiskType } from "app/types";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface RisksState {
  isLoading?: boolean;
  isRisksLoading: boolean;
  isRisksByTypeLoading: boolean;
  isLogsLoading: boolean;
  isConnectedPlayersLoading: boolean;
  connectedPlayers: ConnectedPlayer[];
  risks: Record<RiskType | "total", number> | {};
  risksByType: RiskStatus[];
  logs: RiskLog[];
  error: any;
}

const initialState: RisksState = {
  isRisksLoading: false,
  isRisksByTypeLoading: false,
  isLogsLoading: false,
  isConnectedPlayersLoading: false,
  connectedPlayers: [],
  risks: {},
  risksByType: [],
  logs: [],
  error: null,
};

export const fetchConnectedPlayersError = createAction("persons/fetch-connected-players-error", error => ({
  error,
  payload: undefined,
}));

export const fetchConnectedPlayers = createAsyncThunk(
  "persons/fetch-connected-players",
  async (playerId: number, { dispatch }) => {
    try {
      const connectedPlayers = await api.players.getConnectedPlayers(playerId);
      return connectedPlayers;
    } catch (err) {
      dispatch(fetchConnectedPlayersError(err));
    }
  },
);

export const disconnectPlayerFromPerson = createAsyncThunk<void, { playerId: number; currentPlayerId: number }>(
  "persons/disconnect-player",
  async ({ playerId, currentPlayerId }, { dispatch }) => {
    try {
      await api.players.disconnectPlayerFromPerson(playerId);
      await dispatch(fetchConnectedPlayers(currentPlayerId));
    } catch (err) {
      dispatch(fetchConnectedPlayersError(err));
    }
  },
);

export const fetchRisks = createAsyncThunk<Record<RiskType | "total", number>, number>(
  "risks/fetch-risks",
  async (playerId, { rejectWithValue }) => {
    try {
      const risks = await api.players.getRisks(playerId, true);
      return risks;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const fetchRisksByType = createAsyncThunk<RiskStatus[], { playerId: number; riskType: RiskType }>(
  "risks/fetch-risks-by-type",
  async ({ playerId, riskType }, { rejectWithValue }) => {
    try {
      const risks = await api.players.getRisksByType(playerId, riskType);
      return risks;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const fetchLogs = createAsyncThunk<RiskLog[], { playerId: number; riskType: RiskType }>(
  "risks/fetch-logs",
  async ({ playerId, riskType }, { rejectWithValue }) => {
    try {
      const logs = await api.players.getRisksLog(playerId, riskType);
      return logs;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

const risksSlice = createSlice({
  name: "risks",
  initialState,
  reducers: {},
  extraReducers: builder => {
    function errorReducer(state: RootState["risks"], action: any) {
      state.isLoading = false;
      state.isRisksByTypeLoading = false;
      state.isLogsLoading = false;
      state.isConnectedPlayersLoading = false;
      state.error = action.error;
    }
    builder
      .addCase(fetchConnectedPlayers.pending, state => {
        state.isConnectedPlayersLoading = true;
      })
      .addCase(fetchConnectedPlayers.fulfilled, (state, action) => {
        state.connectedPlayers = action.payload!;
        state.isConnectedPlayersLoading = false;
      })
      .addCase(fetchConnectedPlayersError, errorReducer);
    builder
      .addCase(fetchRisks.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchRisks.fulfilled, (state, action) => {
        state.risks = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchRisks.rejected, errorReducer);
    builder
      .addCase(fetchRisksByType.pending, state => {
        state.isRisksByTypeLoading = true;
      })
      .addCase(fetchRisksByType.fulfilled, (state, action) => {
        state.risksByType = action.payload;
        state.isRisksByTypeLoading = false;
      })
      .addCase(fetchRisksByType.rejected, errorReducer);
    builder
      .addCase(fetchLogs.pending, state => {
        state.isLogsLoading = true;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.logs = action.payload;
        state.isLogsLoading = false;
      })
      .addCase(fetchLogs.rejected, errorReducer);
  },
});

export const { reducer } = risksSlice;

const getRisksState = (state: RootState) => state.risks;
export const getConnectedPlayers = createSelector(getRisksState, state => state.connectedPlayers);
export const getIsConnectedPlayersLoading = createSelector(getRisksState, state => state.isConnectedPlayersLoading);
export const getRisks = createSelector(getRisksState, state => state.risks);
export const getIsRisksLoading = createSelector(getRisksState, state => state.isLoading);
export const getRisksByType = createSelector(getRisksState, state => state.risksByType);
export const getIsRisksByTypeLoading = createSelector(getRisksState, state => state.isRisksByTypeLoading);
export const getLogs = createSelector(getRisksState, state => state.logs);
export const getIsLogsLoading = createSelector(getRisksState, state => state.isLogsLoading);
export const getRisksTabs = createSelector(getRisks, risks => Object.entries(risks).filter(([key]) => key !== "total"));
