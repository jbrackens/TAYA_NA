import { createSlice, createAsyncThunk, createEntityAdapter } from "@reduxjs/toolkit";
import { Reward } from "app/types";

import api from "../../api";
import { RootState } from "../../redux";

const rewardsAdapter = createEntityAdapter<Reward>({
  selectId: (rewardRuleConfig: Reward) => rewardRuleConfig.id
});

const initialState = rewardsAdapter.getInitialState();

export const fetchRewards = createAsyncThunk(
  "rewards-config/fetchRewards",
  async ({ brandId, rewardType }: { brandId: string; rewardType?: string }) => {
    const response = await api.settings.getRewards(brandId, rewardType);
    const rewards = response.data.data;

    return rewards;
  }
);

const rewardsSlice = createSlice({
  name: "rewards-config",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchRewards.fulfilled, (state, action) => {
      const rewards = action.payload;
      rewardsAdapter.setAll(state, rewards);
    });
  }
});

export const { reducer } = rewardsSlice;

export const selectRewardsState = (state: RootState) => state.rewards;

export const {
  selectById: selectRewardById,
  selectEntities: selectRewardEntities,
  selectAll: selectAllRewards,
  selectTotal: selectTotalRewards
} = rewardsAdapter.getSelectors(selectRewardsState);
