import { createAction, createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FormikHelpers } from "formik";

import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

interface PlayerDetailsState {
  isFetching: boolean;
  isSaving: boolean;
  playerDetails: PlayerWithUpdate | null;
  error: unknown | null;
}

const initialState: PlayerDetailsState = {
  isFetching: false,
  isSaving: false,
  playerDetails: null,
  error: null
};

export const fetchPlayerDetails = createAsyncThunk(
  "player-details/fetch",
  async (playerId: number, { rejectWithValue }) => {
    try {
      const playerDetails = await api.players.get(playerId);
      return playerDetails;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const savePlayer = createAsyncThunk<
  PlayerWithUpdate,
  { playerId: number; values: Partial<PlayerWithUpdate>; formikHelpers: FormikHelpers<Partial<PlayerWithUpdate>> }
>("player-details/save-player", async ({ playerId, values, formikHelpers }, { rejectWithValue }) => {
  try {
    const playerDetails = await api.players.update(playerId, values);
    return playerDetails;
  } catch (error) {
    formikHelpers.resetForm();
    formikHelpers.setFieldError("general", error.message);
    return rejectWithValue(error);
  }
});

const playerDetailsSlice = createSlice({
  name: "playerDetails",
  initialState: initialState,
  reducers: {
    updatePlayerDetails(state, action: PayloadAction<PlayerWithUpdate>) {
      state.playerDetails = action.payload;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPlayerDetails.pending, state => {
        state.isFetching = true;
      })
      .addCase(fetchPlayerDetails.fulfilled, (state, action) => {
        state.isFetching = false;
        state.playerDetails = action.payload;
      })
      .addCase(fetchPlayerDetails.rejected, (state, action) => {
        state.isFetching = false;
        state.error = action.payload;
      })
      .addCase(savePlayer.pending, state => {
        state.isSaving = true;
      })
      .addCase(savePlayer.fulfilled, (state, action) => {
        state.isSaving = false;
        state.playerDetails = action.payload;
      })
      .addCase(savePlayer.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload;
      });
  }
});

export const { reducer } = playerDetailsSlice;
export const { updatePlayerDetails } = playerDetailsSlice.actions;

const getPlayerDetailsState = (state: RootState) => state.playerDetails;

export const getPlayerDetails = createSelector(getPlayerDetailsState, state => state.playerDetails);
export const getIsFetchingPlayerDetails = createSelector(getPlayerDetailsState, state => state.isFetching);
export const getIsSavingPlayerDetails = createSelector(getPlayerDetailsState, state => state.isSaving);

export const getPromotions = createSelector(getPlayerDetails, playerDetails => {
  if (playerDetails) {
    return {
      allowEmailPromotions: playerDetails.allowEmailPromotions,
      allowSMSPromotions: playerDetails.allowSMSPromotions,
      activated: playerDetails.activated,
      testPlayer: playerDetails.testPlayer
    };
  }
  return;
});
