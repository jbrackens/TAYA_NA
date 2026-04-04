import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { PlayerPromotion } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

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
  segments: []
};

export const fetchPromotions = createAsyncThunk("promotions/fetch", async (playerId: number) => {
  try {
    const promotions = await api.players.getPromotions(playerId);
    return promotions;
  } catch (err) {
    console.log(err);
    return;
  }
});

export const fetchSegments = createAsyncThunk("promotions/segments-fetch", async (playerId: number) => {
  try {
    const segments = await api.players.getSegments(playerId);
    return segments;
  } catch (err) {
    console.log(err);
    return;
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
  }
});

export const { reducer, actions } = promotionsSlice;

const getState = (state: RootState) => state.promotions;

export const getPromotions = createSelector(getState, state => state.promotions);
export const getIsLoadingPromotions = createSelector(getState, state => state.isLoadingPromotions);
export const getSegments = createSelector(getState, state => state.segments);
export const getIsLoadingSegments = createSelector(getState, state => state.isLoadingSegments);
