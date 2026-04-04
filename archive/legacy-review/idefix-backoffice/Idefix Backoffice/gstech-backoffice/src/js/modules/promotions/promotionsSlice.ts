import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { PlayerPromotion } from "app/types";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface PromotionsState {
  isLoadingPromotions: boolean;
  promotions: PlayerPromotion[];
  isLoadingSegments: boolean;
  segments: string[];
}

const initialState: PromotionsState = {
  isLoadingPromotions: false,
  promotions: [],
  isLoadingSegments: false,
  segments: [],
};

export const fetchPromotions = createAsyncThunk("promotions/fetch", async (playerId: number) => {
  try {
    const promotions = await api.players.getPromotions(playerId);
    return promotions;
  } catch (err) {
    console.log(err);
  }
});

export const fetchSegments = createAsyncThunk("promotions/segments-fetch", async (playerId: number) => {
  try {
    const segments = await api.players.getSegments(playerId);
    return segments;
  } catch (err) {
    console.log(err);
  }
});

const promotionsSlice = createSlice({
  name: "promotions",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchPromotions.pending, state => {
        state.isLoadingPromotions = true;
      })
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        state.isLoadingPromotions = false;
        state.promotions = action.payload!;
      });
    builder.addCase(fetchSegments.fulfilled, (state, action) => {
      state.segments = action.payload!;
    });
  },
});

export const { reducer, actions } = promotionsSlice;

export const getPromotionsState = (state: RootState) => state.promotions;
