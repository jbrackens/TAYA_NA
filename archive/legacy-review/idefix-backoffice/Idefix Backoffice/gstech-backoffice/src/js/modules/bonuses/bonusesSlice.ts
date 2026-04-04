import { createAsyncThunk, createSlice, SerializedError } from "@reduxjs/toolkit";
import { PlayerBonus } from "app/types";
import api from "js/core/api";

interface BonusesState {
  isFetching: boolean;
  bonuses: PlayerBonus[];
  errors: SerializedError;
}

const initialState: BonusesState = {
  isFetching: false,
  bonuses: [],
  errors: {},
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
  },
);

const bonusesSlice = createSlice({
  name: "bonuses",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchBonuses.pending, state => {
      state.isFetching = true;
    });
    builder.addCase(fetchBonuses.fulfilled, (state, action) => {
      state.bonuses = action.payload;
      state.isFetching = false;
    });
    builder.addCase(fetchBonuses.rejected, (state, action) => {
      state.isFetching = true;
      state.errors = action.error;
    });
  },
});

export const { reducer } = bonusesSlice;
