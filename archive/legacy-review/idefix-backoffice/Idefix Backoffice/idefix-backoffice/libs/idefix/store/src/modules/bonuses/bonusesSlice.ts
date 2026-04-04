import { createAsyncThunk, createSelector, createSlice, SerializedError } from "@reduxjs/toolkit";

import { PlayerBonus } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

interface BonusesState {
  isLoading: boolean;
  bonuses: PlayerBonus[];
  errors: SerializedError;
}

const initialState: BonusesState = {
  isLoading: false,
  bonuses: [],
  errors: {}
};

export const fetchBonuses = createAsyncThunk<PlayerBonus[], number>(
  "bonuses/fetch-bonuses",
  async (playerId, { rejectWithValue }) => {
    try {
      const bonuses = await api.players.getBonuses(playerId);
      return bonuses;
    } catch (err) {
      console.log(err);

      return rejectWithValue(err);
    }
  }
);

const bonusesSlice = createSlice({
  name: "bonuses",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchBonuses.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchBonuses.fulfilled, (state, action) => {
      state.bonuses = action.payload;
      state.isLoading = false;
    });
    builder.addCase(fetchBonuses.rejected, (state, action) => {
      state.isLoading = true;
      state.errors = action.error;
    });
  }
});

export const { reducer } = bonusesSlice;

const getBonusesState = (state: RootState) => state.bonuses;

export const getBonuses = createSelector(getBonusesState, state => state.bonuses);
export const getIsLoadingBonuses = createSelector(getBonusesState, state => state.isLoading);
