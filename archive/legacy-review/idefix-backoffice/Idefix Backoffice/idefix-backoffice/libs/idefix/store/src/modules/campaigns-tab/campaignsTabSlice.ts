import { createAsyncThunk, createSelector, createSlice, SerializedError } from "@reduxjs/toolkit";

import { CampaignsTab, PlayerActiveCampaigns } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

interface CampaignsTabState {
  isLoading: boolean;
  campaigns: CampaignsTab | null;
  activeCampaigns: PlayerActiveCampaigns[];
  isActiveCampaignsLoading: boolean;
  error: SerializedError | null;
}

const initialState: CampaignsTabState = {
  isLoading: false,
  campaigns: null,
  activeCampaigns: [],
  isActiveCampaignsLoading: false,
  error: null
};

export const fetchCampaigns = createAsyncThunk<CampaignsTab, { playerId: number; pageSize?: number }>(
  "campaigns-tab/fetch-campaigns",
  // TODO might there should be `pageSize = 0` as indefinite value
  async ({ playerId, pageSize = 999999 }, { rejectWithValue }) => {
    try {
      const campaigns = await api.players.getCampaigns(playerId, { pageSize });

      return campaigns.data;
    } catch (err) {
      const error = err.response.data || err.message;

      return rejectWithValue(error);
    }
  }
);

export const fetchActiveCampaigns = createAsyncThunk<PlayerActiveCampaigns[], number>(
  "campaigns-tab/fetch-active-campaigns",
  async (playerId, { rejectWithValue }) => {
    try {
      const response = await api.players.getActiveCampaigns(playerId);
      return response.data;
    } catch (err) {
      const error = err.response.data || err.message;

      return rejectWithValue(error);
    }
  }
);

const campaignsTabSlice = createSlice({
  name: "campaigns-tab",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchCampaigns.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchCampaigns.fulfilled, (state, action) => {
      state.isLoading = false;
      state.campaigns = action.payload;
    });
    builder.addCase(fetchCampaigns.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error;
    });

    builder.addCase(fetchActiveCampaigns.pending, state => {
      state.isActiveCampaignsLoading = true;
    });
    builder.addCase(fetchActiveCampaigns.fulfilled, (state, action) => {
      state.isActiveCampaignsLoading = false;
      state.activeCampaigns = action.payload;
    });
    builder.addCase(fetchActiveCampaigns.rejected, (state, action) => {
      state.isActiveCampaignsLoading = false;
      state.error = action.error;
    });
  }
});

export const { reducer, actions } = campaignsTabSlice;

export const getCampaignsTab = (state: RootState) => state.campaignsTab;

export const getIsLoadingCampaigns = createSelector(getCampaignsTab, state => state.isLoading);
export const getCampaigns = createSelector(getCampaignsTab, state => state.campaigns);

export const getIsLoadingActiveCampaigns = createSelector(getCampaignsTab, state => state.isActiveCampaignsLoading);
export const getActiveCampaigns = createSelector(getCampaignsTab, state => state.activeCampaigns);
