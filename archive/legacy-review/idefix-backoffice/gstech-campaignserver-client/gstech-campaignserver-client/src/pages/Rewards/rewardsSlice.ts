import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityId,
  EntityState,
  PayloadAction
} from "@reduxjs/toolkit";
import { ApiServerError, Reward, RewardInstance } from "app/types";
import { toast } from "react-toastify";
import { AxiosError } from "axios";

import api from "../../api";
import { RootState } from "../../redux";
import { IRewardFormValues, RewardWithOrder } from "./types";
import { selectGameById } from "../Games";
import { formatReward, formatMoneyFieldsToCurrency, formatMoneyFieldsToCents, getMoneyFields } from "./utils";
import { selectRewardFormFieldsInfoByBrandAndType } from "../../modules/app";

const rewardsAdapter = createEntityAdapter<RewardInstance>({
  selectId: (rewardInstance: RewardInstance) => rewardInstance.reward.id,
  sortComparer: (a, b) => a.reward.order - b.reward.order
});

interface IState extends EntityState<RewardInstance> {
  isLoading: boolean;
  rewardIsLoading: boolean;
  selectedRewardType?: string;
}

const initialState: IState = rewardsAdapter.getInitialState({
  isLoading: true,
  rewardIsLoading: true,
  selectedRewardType: undefined
});

export const fetchRewards = createAsyncThunk<RewardInstance[], { type: string; brandId: string }>(
  "rewards/fetchRewards",
  async ({ brandId, type }, thunkApi) => {
    try {
      const {
        data: { data: rewardInstances }
      } = await api.rewards.getRewards(brandId, type);
      const formFieldsInfo = selectRewardFormFieldsInfoByBrandAndType(thunkApi.getState() as RootState, brandId);
      const moneyFields = getMoneyFields(formFieldsInfo);

      const formattedRewardInstances = rewardInstances.map(({ game, reward }) => ({
        game,
        reward: { ...reward, ...formatMoneyFieldsToCurrency(reward, moneyFields) }
      }));

      return formattedRewardInstances;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch rewards failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch rewards failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

export const fetchReward = createAsyncThunk<RewardInstance, { brandId: string; rewardId: number }>(
  "rewards/fetchReward",
  async ({ brandId, rewardId }, { getState, rejectWithValue }) => {
    try {
      const {
        data: { data: rewardInstance }
      } = await api.rewards.getReward(rewardId);

      const formFieldsInfo = selectRewardFormFieldsInfoByBrandAndType(getState() as RootState, brandId);

      const moneyFields = getMoneyFields(formFieldsInfo);

      const formattedRewardInstance = {
        ...rewardInstance,
        reward: {
          ...rewardInstance.reward,
          ...formatMoneyFieldsToCurrency(rewardInstance.reward, moneyFields)
        }
      };

      return formattedRewardInstance;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch reward failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch reward failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export const createReward = createAsyncThunk<
  RewardInstance,
  { rewardDefinitionId: number; reward: IRewardFormValues; brandId: string },
  {
    rejectValue: ApiServerError;
  }
>("rewards/createReward", async ({ rewardDefinitionId, reward, brandId }, { rejectWithValue, getState }) => {
  try {
    const game = selectGameById(getState() as RootState, reward.gameId as EntityId)!;

    const formFieldsInfo = selectRewardFormFieldsInfoByBrandAndType(getState() as RootState, brandId);
    const moneyFields = getMoneyFields(formFieldsInfo);

    const formFields = Object.keys(formFieldsInfo || {});

    const formattedReward = formatReward({
      reward,
      formFields
    });
    const rewardDraft = { ...formattedReward, ...formatMoneyFieldsToCents(reward as Reward, moneyFields) } as Omit<
      Reward,
      "id" | "rewardDefinitionId"
    >;
    const response = await api.rewards.addReward({
      rewardDefinitionId,
      ...rewardDraft
    });
    const { id } = response.data.data;

    toast.success(`Reward created!`);
    return { reward: { ...formattedReward, id }, game } as RewardInstance;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Create reward failed: ${error.message}`);
      throw err;
    }

    toast.error(`Create reward failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const updateReward = createAsyncThunk<
  { id: number; changes: RewardInstance },
  {
    id: number;
    values: Partial<IRewardFormValues>;
    brandId: string;
  },
  {
    rejectValue: ApiServerError;
  }
>("rewards/updateReward", async ({ id, values, brandId }, { rejectWithValue, getState }) => {
  try {
    const formFieldsInfo = selectRewardFormFieldsInfoByBrandAndType(getState() as RootState, brandId);
    const moneyFields = getMoneyFields(formFieldsInfo);
    const formFields = [...Object.keys(formFieldsInfo || {}), "order"];

    const formattedValues = formatReward({
      reward: values as IRewardFormValues,
      formFields
    });

    const formattedReward = {
      ...formattedValues,
      ...formatMoneyFieldsToCents(values as Reward, moneyFields)
    } as Omit<Reward, "id">;
    const {
      data: { data: reward }
    } = await api.rewards.updateReward(id, formattedReward);

    const game = selectGameById(getState() as RootState, reward.gameId as EntityId)!;

    const changes = {
      reward: { ...reward, ...formatMoneyFieldsToCurrency(reward, moneyFields) },
      game
    } as RewardInstance;
    toast.success(`Reward updated!`);
    return { id, changes };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Update reward failed: ${error.message}`);
      throw err;
    }

    toast.error(`Update reward failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const removeReward = createAsyncThunk<number, number>(
  "rewards/removeReward",
  async (rewardId: number, { rejectWithValue }) => {
    try {
      await api.rewards.removeReward(rewardId);
      toast.success(`Reward removed!`);
      return rewardId;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Remove reward failed: ${error.message}`);
        throw err;
      }

      toast.error(`Remove reward failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export const copyReward = createAsyncThunk<
  RewardInstance,
  { rewardId: number; brandId: string },
  {
    rejectValue: ApiServerError;
  }
>("rewards/copyReward", async ({ rewardId, brandId }, { rejectWithValue, getState }) => {
  try {
    const formFieldsInfo = selectRewardFormFieldsInfoByBrandAndType(getState() as RootState, brandId);
    const moneyFields = getMoneyFields(formFieldsInfo);

    const response = await api.rewards.duplicateReward(rewardId);

    const unformattedReward = response.data.data;
    const reward = { ...unformattedReward, ...formatMoneyFieldsToCents(unformattedReward, moneyFields) };
    const game = selectGameById(getState() as RootState, reward.gameId as EntityId)!;

    toast.success(`Reward copied!`);
    return { reward, game } as RewardInstance;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Copy reward failed: ${error.message}`);
      throw err;
    }

    toast.error(`Copy reward failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

const rewardsSlice = createSlice({
  name: "rewardsPage",
  initialState,
  reducers: {
    setSelectedRewardsType: (state, action: PayloadAction<string>) => {
      state.selectedRewardType = action.payload;
    },
    resetRewardsState: () => initialState
  },
  extraReducers: builder => {
    builder.addCase(fetchRewards.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchRewards.fulfilled, (state, action) => {
      rewardsAdapter.setMany(state, action.payload);
      state.isLoading = false;
    });
    builder.addCase(fetchRewards.rejected, (state, action) => {
      const { meta } = action;
      if (meta.aborted) {
        return;
      }
      state.isLoading = false;
    });

    builder.addCase(fetchReward.pending, state => {
      state.rewardIsLoading = true;
    });
    builder.addCase(fetchReward.fulfilled, (state, action) => {
      const reward = action.payload;
      rewardsAdapter.upsertOne(state, reward);
      state.rewardIsLoading = false;
    });
    builder.addCase(fetchReward.rejected, state => {
      state.rewardIsLoading = false;
    });

    builder.addCase(createReward.fulfilled, (state, action) => {
      const reward = action.payload;
      rewardsAdapter.addOne(state, reward);
    });

    builder.addCase(updateReward.fulfilled, (state, action) => {
      rewardsAdapter.updateOne(state, action.payload);
    });

    builder.addCase(removeReward.fulfilled, (state, action) => {
      const rewardId = action.payload;
      rewardsAdapter.removeOne(state, rewardId);
      state.isLoading = false;
    });

    builder.addCase(copyReward.fulfilled, (state, action) => {
      const reward = action.payload;
      rewardsAdapter.addOne(state, reward);
    });
  }
});

export const {
  reducer,
  actions: { setSelectedRewardsType, resetRewardsState }
} = rewardsSlice;

const selectRewardsState = (state: RootState) => state.rewardsPage;

export const selectSelectedRewardsType = createSelector(
  selectRewardsState,
  rewardsState => rewardsState.selectedRewardType
);

export const {
  selectById: selectRewardById,
  selectIds: selectRewardIds,
  selectEntities: selectRewardEntities,
  selectAll: selectAllRewards,
  selectTotal: selectTotalRewards
} = rewardsAdapter.getSelectors(selectRewardsState);

export const selectRewardsTableData = createSelector(
  selectAllRewards,
  rewards =>
    rewards.map(({ reward, game }) => ({
      ...reward,
      permalink: game?.permalink,
      manufacturer: game?.manufacturer
    })) as RewardWithOrder[]
);
export const selectRewardsIsLoading = createSelector(selectRewardsState, rewardsState => rewardsState.isLoading);
export const selectRewardIsLoading = createSelector(selectRewardsState, rewardsState => rewardsState.rewardIsLoading);
