import { createSlice, createEntityAdapter, createAsyncThunk, EntityState, createSelector } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import { RewardRule, ApiServerError } from "app/types";

import api from "../../api";
import { RootState } from "../../redux";
import { fetchCampaign, resetCampaignState } from "../campaign-info";

function sortComparer(a: RewardRule, b: RewardRule) {
  return b.id - a.id;
}

interface CreateRewardRuleDraft {
  campaignId: number;
  values: RewardRule;
}

interface UpdateRewardRuleDraft {
  campaignId: number;
  rewardRuleId: number;
  values: RewardRule;
}

export const createRewardRule = createAsyncThunk<
  RewardRule,
  CreateRewardRuleDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-reward/createRewardRule", async (rewardRuleDraft, { rejectWithValue }) => {
  try {
    const { campaignId, values } = rewardRuleDraft;

    const response = await api.campaigns.addRewardRule(campaignId, values);
    const rewardId = response.data.data.rewardRuleId;

    return { ...values, id: rewardId } as RewardRule;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;
    if (!error.response) {
      throw err;
    }

    return rejectWithValue(error.response.data);
  }
});

export const updateRewardRule = createAsyncThunk<
  RewardRule,
  UpdateRewardRuleDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-reward/updateRewardRule", async (rewardRuleDraft, { rejectWithValue }) => {
  try {
    const { campaignId, rewardRuleId, values } = rewardRuleDraft;
    await api.campaigns.updateRewardRule(campaignId, rewardRuleId, values);

    return { ...values, id: rewardRuleId };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;
    if (!error.response) {
      throw err;
    }

    return rejectWithValue(error.response.data);
  }
});

export const removeRewardRule = createAsyncThunk(
  "campaign-reward/removeRewardRule",
  async ({ rewardId, campaignId }: { rewardId: number; campaignId: number }) => {
    await api.campaigns.removeRewardRule(campaignId, rewardId);
  }
);

const rewardRulesAdapter = createEntityAdapter<RewardRule>({
  sortComparer
});

interface IState extends EntityState<RewardRule> {
  loadingState: {
    [key: number]: boolean;
  };
}

const initialState: IState = rewardRulesAdapter.getInitialState({
  loadingState: {}
});

const campaignRewardSlice = createSlice({
  name: "campaign-reward",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(fetchCampaign.fulfilled, (state, action) => {
      const { reward } = action.payload;
      rewardRulesAdapter.upsertMany(state, reward.rewards);
    });

    builder.addCase(createRewardRule.fulfilled, (state, action) => {
      const reward = action.payload;
      rewardRulesAdapter.addOne(state, reward);
    });

    builder.addCase(updateRewardRule.fulfilled, (state, action) => {
      const { id, ...values } = action.payload;
      rewardRulesAdapter.updateOne(state, { id, changes: values });
    });

    builder.addCase(removeRewardRule.pending, (state, action) => {
      const { rewardId } = action.meta.arg;
      state.loadingState[rewardId] = true;
    });

    builder.addCase(removeRewardRule.fulfilled, (state, action) => {
      const { rewardId } = action.meta.arg;
      state.loadingState[rewardId] = false;
      rewardRulesAdapter.removeOne(state, rewardId);
      delete state.loadingState[rewardId];
    });

    builder.addCase(removeRewardRule.rejected, (state, action) => {
      const { rewardId } = action.meta.arg;
      state.loadingState[rewardId] = false;
    });
  }
});

export const selectCampaignRewardState = (state: RootState) => state.campaignReward;

export const selectLoadingState = createSelector(
  selectCampaignRewardState,
  campaignRewardState => campaignRewardState.loadingState
);

export const {
  selectById: selectRewardRuleById,
  selectIds: selectRewardRuleIds,
  selectEntities: selectRewardRuleEntities,
  selectAll: selectAllRewardRules,
  selectTotal: selectTotalRewardRules
} = rewardRulesAdapter.getSelectors(selectCampaignRewardState);

export const selectLoadingById = createSelector(
  selectLoadingState,
  (_: unknown, rewardRuleId: number) => rewardRuleId,
  (loadingState, rewardRuleId) => loadingState[rewardRuleId]
);

export const { reducer } = campaignRewardSlice;
