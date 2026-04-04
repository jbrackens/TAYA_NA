import api from "js/core/api";
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { updatePlayerDetails } from "../player-details";
import { RootState } from "js/rootReducer";
import { ActiveLimitOptions, PlayerDraft, PlayerFinancialInfo, PlayerRegistrationInfo } from "app/types";

interface PlayerInfoState {
  isFetchingFinancialInfo: boolean;
  financialInfo: PlayerFinancialInfo | {};
  isFetchingRegistrationInfo: boolean;
  registrationInfo?: PlayerRegistrationInfo;
  isFetchingKycDocuments: boolean;
  kycDocuments?: [];
  activeLimits?: ActiveLimitOptions;
  stickyNote?: string;
  isFetchingStickyNote: boolean;
  isSavingStickyNote: boolean;
}

const initialState: PlayerInfoState = {
  isFetchingFinancialInfo: false,
  financialInfo: {},
  isFetchingRegistrationInfo: false,
  isFetchingKycDocuments: false,
  isFetchingStickyNote: false,
  isSavingStickyNote: false,
};

export const fetchFinancialInfo = createAsyncThunk<PlayerFinancialInfo, number>(
  "player-info/fetch-financial-info",
  async (playerId: number, { rejectWithValue }) => {
    try {
      const financialInfo = await api.players.getFinancialInfo(playerId);
      return financialInfo;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const fetchRegistrationInfo = createAsyncThunk<PlayerRegistrationInfo, number>(
  "player-info/fetch-registration-info",
  async (playerId: number, { rejectWithValue }) => {
    try {
      const registrationInfo = await api.players.getRegistrationInfo(playerId);
      return registrationInfo;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const updatePromotionsSettings = createAsyncThunk<
  void,
  { playerId: number; type: keyof PlayerDraft; value: any; reason?: string }
>(
  "player-info/update-promotions-settings",
  async ({ playerId, type, value, reason }, { dispatch, rejectWithValue }) => {
    try {
      const player = await api.players.update(playerId, { [type]: value, reason });
      dispatch(updatePlayerDetails({ id: playerId, playerDetails: player }));
    } catch (err) {
      console.log(err, "error");
      return rejectWithValue(err);
    }
  },
);

export const fetchActiveLimits = createAsyncThunk<ActiveLimitOptions, number>(
  "player-info/fetch-active-limits",
  async (playerId: number, { rejectWithValue }) => {
    try {
      const limits = await api.players.getActiveLimits(playerId);
      return limits;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const fetchStickyNote = createAsyncThunk<{ content: string }, number>(
  "player-info/fetch-sticky-note",
  async (playerId: number, { rejectWithValue }) => {
    try {
      const stickyNote = await api.players.getStickyNote(playerId);
      return stickyNote;
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const updateStickyNote = createAsyncThunk<void, { playerId: number; content: string }>(
  "player-info/update-sticky-note",
  async ({ playerId, content }, { rejectWithValue }) => {
    try {
      await api.players.updateStickyNote(playerId, content);
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

const playerInfoSlice = createSlice({
  name: "playerInfo",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFinancialInfo.pending, state => {
        state.isFetchingFinancialInfo = true;
      })
      .addCase(fetchFinancialInfo.fulfilled, (state, action) => {
        state.financialInfo = action.payload;
        state.isFetchingFinancialInfo = false;
      })
      .addCase(fetchFinancialInfo.rejected, state => {
        state.isFetchingFinancialInfo = false;
      });
    builder
      .addCase(fetchRegistrationInfo.pending, state => {
        state.isFetchingRegistrationInfo = true;
      })
      .addCase(fetchRegistrationInfo.fulfilled, (state, action) => {
        state.registrationInfo = action.payload;
        state.isFetchingRegistrationInfo = false;
      })
      .addCase(fetchRegistrationInfo.rejected, state => {
        state.isFetchingRegistrationInfo = false;
      });
    builder
      .addCase(fetchActiveLimits.pending, state => {
        state.isFetchingKycDocuments = true;
      })
      .addCase(fetchActiveLimits.fulfilled, (state, action) => {
        state.activeLimits = action.payload;
        state.isFetchingKycDocuments = false;
      })
      .addCase(fetchActiveLimits.rejected, state => {
        state.isFetchingKycDocuments = false;
      });
    builder
      .addCase(fetchStickyNote.pending, state => {
        state.isFetchingStickyNote = true;
      })
      .addCase(fetchStickyNote.fulfilled, (state, action) => {
        state.stickyNote = action.payload.content;
        state.isFetchingStickyNote = false;
      })
      .addCase(fetchStickyNote.rejected, state => {
        state.isFetchingStickyNote = false;
      });
    builder
      .addCase(updateStickyNote.pending, state => {
        state.isSavingStickyNote = true;
      })
      .addCase(updateStickyNote.fulfilled, state => {
        state.isSavingStickyNote = false;
      });
  },
});

export const { reducer, actions } = playerInfoSlice;
export const getPlayerInfoState = (state: RootState) => state.playerInfo;
export const getPlayerFinancialInfoIsLoading = createSelector(
  getPlayerInfoState,
  state => state.isFetchingFinancialInfo,
);
export const getPlayerFinancialInfo = createSelector(getPlayerInfoState, state => state.financialInfo);
