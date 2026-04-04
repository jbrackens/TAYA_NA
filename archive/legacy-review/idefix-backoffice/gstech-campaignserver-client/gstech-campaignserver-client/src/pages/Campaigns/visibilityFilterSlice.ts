import { createSlice, createSelector, createAction } from "@reduxjs/toolkit";
import { CampaignStatus } from "app/types";

import { RootState } from "../../redux";

export const changeFilter = createAction<CampaignStatus>("changeFilter");

const visibilityFilterSlice = createSlice({
  name: "visibilityFilter",
  initialState: "active" as CampaignStatus,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(changeFilter, (_state, action) => {
      return action.payload;
    });
  }
});

export const { reducer } = visibilityFilterSlice;

const selectCampaignsPageState = (state: RootState) => state.campaignsPage;

export const selectVisibilityFilter = createSelector(
  selectCampaignsPageState,
  campaignsState => campaignsState.visibilityFilter
);
