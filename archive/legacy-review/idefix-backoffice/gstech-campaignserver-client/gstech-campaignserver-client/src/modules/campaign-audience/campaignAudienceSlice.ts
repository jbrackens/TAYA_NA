import { createSlice, createEntityAdapter, createAsyncThunk } from "@reduxjs/toolkit";
import { ApiServerError, AudienceRule } from "app/types";

import { fetchCampaign, resetCampaignState } from "../campaign-info";
import { RootState } from "../../redux";
import api from "../../api";
import { AxiosError } from "axios";

export const addRuleThunk = createAsyncThunk<
  AudienceRule,
  { campaignId: number; data: Omit<AudienceRule, "id"> },
  { rejectValue: ApiServerError }
>("campaign-audience/add-rule", async ({ campaignId, data }, { rejectWithValue }) => {
  try {
    const response = await api.campaigns.addAudienceRule(campaignId, data);

    const ruleId = response.data.data.audienceRuleId;
    return { ...data, id: ruleId };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      throw err;
    }

    return rejectWithValue(error.response.data);
  }
});

export const addCsvRuleThunk = createAsyncThunk<
  AudienceRule,
  { campaignId: number; fileName: string; formData: FormData },
  { rejectValue: ApiServerError }
>("campaign-audience/add-csv-rule", async ({ campaignId, fileName, formData }, { rejectWithValue }) => {
  try {
    const response = await api.campaigns.addCsvAudienceRule(campaignId, formData);
    const ruleId = response.data.data.ruleId;
    return { id: ruleId, name: fileName, operator: "csv", not: false, values: formData };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      throw err;
    }

    return rejectWithValue(error.response.data);
  }
});

export const updateRuleThunk = createAsyncThunk<
  void,
  { campaignId: number; ruleId: number; data: Omit<AudienceRule, "id"> },
  { rejectValue: ApiServerError }
>("campaign-audience/update-rule", async ({ campaignId, ruleId, data }, { rejectWithValue }) => {
  try {
    await api.campaigns.updateAudienceRule(campaignId, ruleId, data);
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      throw err;
    }

    return rejectWithValue(error.response.data);
  }
});

export const removeRuleThunk = createAsyncThunk<
  void,
  {
    campaignId: number;
    ruleId: number;
  },
  {
    rejectValue: ApiServerError;
  }
>("campaign-audience/removeRule", async ({ ruleId, campaignId }, { rejectWithValue }) => {
  try {
    await api.campaigns.removeAudienceRule(campaignId, ruleId);
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      throw err;
    }

    return rejectWithValue(error.response.data);
  }
});

const rulesAdapter = createEntityAdapter<AudienceRule>();

const editCampaignAudienceSlice = createSlice({
  name: "campaign-audience",
  initialState: rulesAdapter.getInitialState(),
  reducers: {
    removeRule: rulesAdapter.removeOne
  },
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => rulesAdapter.getInitialState());

    builder.addCase(fetchCampaign.fulfilled, (state, action) => {
      const { audience } = action.payload;
      rulesAdapter.upsertMany(state, audience.rules);
    });

    builder.addCase(addRuleThunk.fulfilled, (state, action) => {
      const data = action.payload;
      rulesAdapter.addOne(state, data);
    });

    builder.addCase(removeRuleThunk.fulfilled, (state, action) => {
      const { ruleId } = action.meta.arg;
      rulesAdapter.removeOne(state, ruleId);
    });

    builder.addCase(addCsvRuleThunk.fulfilled, (state, action) => {
      const data = action.payload;
      rulesAdapter.addOne(state, data);
    });
  }
});

export const {
  reducer,
  actions: { removeRule }
} = editCampaignAudienceSlice;

export const {
  selectById: selectRuleById,
  selectIds: selectRuleIds,
  selectEntities: selectRuleEntities,
  selectAll: selectAllRules,
  selectTotal: selectTotalRules
} = rulesAdapter.getSelectors((state: RootState) => state.campaignAudience);
