import { createSlice, createAsyncThunk, PayloadAction, createSelector, createAction } from "@reduxjs/toolkit";
import { AudienceType, CampaignStats, ApiServerError, ExistingCampaign } from "app/types";
import omitBy from "lodash/omitBy";
import isUndefined from "lodash/isUndefined";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import api from "../../api";
import { RootState } from "../../redux";
import { ICampaignInfo, IFormValues } from "./types";
import { formatToMaltaTz } from "./utils";

export const resetCampaignState = createAction("campaign/reset-campaign");

export interface ICampaignInfoState {
  fetchLoading: boolean;
  info?: ICampaignInfo;
  infoLoading: boolean;
  stats?: CampaignStats;
  statsLoading: boolean;
}

export const initialState: ICampaignInfoState = {
  fetchLoading: false,
  infoLoading: false,
  statsLoading: false
};

export const fetchCampaign = createAsyncThunk<
  ExistingCampaign,
  number,
  {
    rejectValue: ApiServerError;
  }
>("campaign-info/fetchCampaign", async (id, { rejectWithValue }) => {
  try {
    const response = await api.campaigns.getCampaign(id);
    const campaign = response.data.data;

    const { startTime, endTime } = campaign;

    const zonedStartTime = startTime !== null ? formatToMaltaTz(startTime) : startTime;
    const zonedEndTime = endTime !== null ? formatToMaltaTz(endTime) : endTime;

    return {
      ...campaign,
      startTime: zonedStartTime,
      endTime: zonedEndTime
    };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      throw err;
    }

    return rejectWithValue({ error: { ...error.response.data.error, status: error.response.status } });
  }
});

export const fetchCampaignStats = createAsyncThunk<
  CampaignStats,
  number,
  {
    rejectValue: ApiServerError;
  }
>("campaign-info/fetchCampaignStats", async (id, { rejectWithValue }) => {
  try {
    const response = await api.campaigns.getStats(id);
    const stats = response.data.data;
    return stats;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      throw err;
    }

    return rejectWithValue({ error: { ...error.response.data.error, status: error.response.status } });
  }
});

export const updateCampaign = createAsyncThunk<
  ExistingCampaign,
  Partial<ICampaignInfo>,
  {
    rejectValue: ApiServerError;
    getState: () => RootState;
  }
>("campaign-info/update-campaign", async (values, thunkApi) => {
  try {
    const campaignDetails = selectCampaignInfo(thunkApi.getState() as RootState);
    const clearValues = omitBy(values, isUndefined) as Partial<IFormValues>;

    const { id, group, ...rest } = campaignDetails.info!;

    const updatedGroupCampaigns = group.campaigns.map(campa => {
      if (clearValues.name && campa.id === id) {
        return { ...campa, name: clearValues.name };
      }

      return campa;
    });

    const changedValues = Object.fromEntries(
      Object.entries(clearValues).filter(([key, value]) => {
        // @ts-ignore
        return rest[key] !== value;
      })
    );

    const response = await api.campaigns.updateCampaign(id, { ...changedValues });
    const campaign = response.data.data;
    const { startTime, endTime } = campaign;

    const zonedStartTime = startTime !== null ? formatToMaltaTz(startTime) : startTime;
    const zonedEndTime = endTime !== null ? formatToMaltaTz(endTime) : endTime;

    return {
      ...rest,
      ...campaign,
      group: { name: group.name, campaigns: updatedGroupCampaigns },
      startTime: zonedStartTime,
      endTime: zonedEndTime
    };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Update of the campaign failed: ${error.message}`);
      throw err;
    }

    toast.error(`Update of the campaign failed: ${error.response.data.error.message}`);
    return thunkApi.rejectWithValue(error.response.data);
  }
});

export const updateCampaignGroupName = createAsyncThunk<{ name: string }, { groupId: number; name: string }>(
  "campaign-info/update-group-name",
  async (values, thunkApi) => {
    try {
      const data = { name: values.name };
      await api.campaigns.updateCampaignGroupName(values.groupId, data);

      return data;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Update of the campaign group failed: ${error.message}`);
        throw err;
      }

      toast.error(`Update of the campaign group failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

export const resetCampaignStateReducer = (): ICampaignInfoState => initialState;

export const fetchCampaignDetailsFulfilled = (
  state: ICampaignInfoState,
  action: PayloadAction<
    ExistingCampaign,
    string,
    {
      arg: number;
      requestId: string;
    },
    never
  >
) => {
  const {
    audience: _audience,
    reward: _reward,
    notification: _notification,
    sms: _sms,
    email: _email,
    ...restProps
  } = action.payload;
  state.fetchLoading = false;
  state.info = { ...restProps };
};

export const fetchCampaignStatsFulfilled = (
  state: ICampaignInfoState,
  action: PayloadAction<
    CampaignStats,
    string,
    {
      arg: number;
      requestId: string;
    }
  >
) => {
  const { ...stats } = action.payload;
  state.statsLoading = false;
  state.stats = { ...stats };
};

export const updateCampaignDetailsFulfilled = (
  state: ICampaignInfoState,
  action: PayloadAction<
    ExistingCampaign,
    string,
    {
      arg: Partial<IFormValues>;
      requestId: string;
    },
    never
  >
) => {
  state.info = action.payload;
  state.infoLoading = false;
};

const editCampaignInfoSlice = createSlice({
  name: "campaign-info",
  initialState,
  reducers: {
    changeAudienceType(state: ICampaignInfoState, action: PayloadAction<AudienceType>) {
      state.info!.audienceType = action.payload;
    },
    changeCreditMultiple(state: ICampaignInfoState, action: PayloadAction<boolean>) {
      state.info!.creditMultiple = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);

    builder.addCase(fetchCampaign.pending, (state: ICampaignInfoState) => {
      state.fetchLoading = true;
    });
    builder.addCase(fetchCampaign.fulfilled, fetchCampaignDetailsFulfilled);
    builder.addCase(fetchCampaign.rejected, (state: ICampaignInfoState) => {
      state.fetchLoading = false;
    });

    builder.addCase(updateCampaign.pending, (state: ICampaignInfoState) => {
      state.infoLoading = true;
    });
    builder.addCase(updateCampaign.fulfilled, updateCampaignDetailsFulfilled);
    builder.addCase(updateCampaign.rejected, (state: ICampaignInfoState) => {
      state.infoLoading = false;
    });

    builder.addCase(updateCampaignGroupName.fulfilled, (state, action) => {
      if (state.info) {
        state.info.group.name = action.payload.name;
      }
    });

    builder.addCase(fetchCampaignStats.pending, (state: ICampaignInfoState) => {
      state.statsLoading = true;
    });
    builder.addCase(fetchCampaignStats.fulfilled, fetchCampaignStatsFulfilled);
    builder.addCase(fetchCampaignStats.rejected, (state: ICampaignInfoState) => {
      state.statsLoading = false;
    });
  }
});

export const {
  reducer,
  actions: { changeAudienceType, changeCreditMultiple }
} = editCampaignInfoSlice;

export const selectCampaignInfo = (state: RootState) => state.campaignInfo;

export const selectGroupCampaigns = createSelector(
  selectCampaignInfo,
  campaignInfo => campaignInfo.info?.group?.campaigns
);

export const selectAudienceType = createSelector(selectCampaignInfo, campaignInfo => campaignInfo.info!.audienceType);

export const selectCampaignStatus = createSelector(selectCampaignInfo, campaignInfo => campaignInfo.info!.status);

export const selectCampaignBrand = createSelector(selectCampaignInfo, campaignInfo => campaignInfo.info?.brandId);

export const selectCampaignId = createSelector(selectCampaignInfo, campaignInfo => campaignInfo.info?.id);

export const selectCreditMultiple = createSelector(
  selectCampaignInfo,
  campaignInfo => campaignInfo.info!.creditMultiple
);

export const selectCampaignStats = createSelector(selectCampaignInfo, campaignInfo => campaignInfo.stats);

export const selectCampaignAudienceStats = createSelector(
  selectCampaignStats,
  (_: unknown, key: string) => key,
  (stats, key) => stats?.audience.find(({ id }) => id === key)
);
export const selectCampaignNotificationStats = createSelector(selectCampaignStats, stats => stats?.notification);
export const selectCampaignEmailStats = createSelector(selectCampaignStats, stats => stats?.email);
export const selectCampaignSmsStats = createSelector(selectCampaignStats, stats => stats?.sms);
export const selectCampaignRewardsStats = createSelector(selectCampaignStats, stats => stats?.reward);
export const selectCampaignRewardGeneralStats = createSelector(selectCampaignRewardsStats, rewardsStats =>
  rewardsStats?.general?.map(({ name, value }) => ({ title: name, value }))
);
export const selectCampaignRewardStats = createSelector(
  selectCampaignRewardsStats,
  rewardsStats => rewardsStats?.rewards
);
