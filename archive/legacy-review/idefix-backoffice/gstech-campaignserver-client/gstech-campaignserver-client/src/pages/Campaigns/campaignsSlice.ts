import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction
} from "@reduxjs/toolkit";
import { ApiServerError, Campaign, CampaignGroup } from "app/types";
import { toast } from "react-toastify";
import { AxiosError } from "axios";

import api from "../../api";
import { RootState } from "../../redux";
import { selectVisibilityFilter } from "./visibilityFilterSlice";

type CampaignsPageState = Omit<CampaignGroup, "campaigns"> & { subRows: Partial<Campaign>[] };

interface IState extends EntityState<CampaignsPageState> {
  isLoading: boolean;
}

const campaignsAdapter = createEntityAdapter<CampaignsPageState>({
  selectId: (group: CampaignsPageState) => group.id
});

export const fetchCampaigns = createAsyncThunk<CampaignGroup[], string>(
  "campaigns/fetchCampaigns",
  async (brandId, { getState, rejectWithValue }) => {
    try {
      const visibilityFilter = selectVisibilityFilter(getState() as RootState);
      const response = await api.campaigns.getCampaigns(visibilityFilter, brandId);
      return response.data.data.groups;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch campaigns failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch campaigns failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export const archiveCampaign = createAsyncThunk<void, { brandId: string; campaignId: number }>(
  "campaigns/archiveCampaign",
  async ({ brandId, campaignId }, thunkApi) => {
    try {
      await api.campaigns.archiveCampaign(campaignId);
      toast.success("Campaign archived!");
      await thunkApi.dispatch(fetchCampaigns(brandId));
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Archive campaign failed: ${error.message}`);
        throw err;
      }

      toast.error(`Archive campaign failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

export const archiveGroup = createAsyncThunk<void, { brandId: string; groupId: number }>(
  "campaigns/archiveGroup",
  async ({ brandId, groupId }, thunkApi) => {
    try {
      await api.campaigns.archiveCampaignGroup(groupId);
      toast.success("Campaign group archived!");
      await thunkApi.dispatch(fetchCampaigns(brandId));
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Archive campaign group failed: ${error.message}`);
        throw err;
      }

      toast.error(`Archive campaign group failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

const initialState: IState = campaignsAdapter.getInitialState({
  isLoading: true
});

const campaignsSlice = createSlice({
  name: "campaigns",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchCampaigns.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchCampaigns.fulfilled, (state, action) => {
      const mapped = action.payload?.map(({ campaigns, ...rest }) => {
        let campaignTitles = "";

        campaigns.forEach(campaign => {
          campaignTitles += campaign.name + " ";
        });

        return {
          ...rest,
          subRows: campaigns,
          campaignTitles,
          status: campaigns[0].status
        };
      });

      campaignsAdapter.setAll(state, mapped);
      state.isLoading = false;
    });
    builder.addCase(fetchCampaigns.rejected, (state, action) => {
      const { meta } = action;
      if (meta.aborted) {
        return;
      }
      state.isLoading = false;
    });
  }
});

export const {
  reducer,
  actions: { setLoading }
} = campaignsSlice;

const getCampaignsPageState = (state: RootState) => state.campaignsPage.campaigns;

export const {
  selectById: selectCampaignById,
  selectIds: selectCampaignIds,
  selectEntities: selectCampaignEntities,
  selectAll: selectAllCampaigns,
  selectTotal: selectTotalCampaigns
} = campaignsAdapter.getSelectors(getCampaignsPageState);

export const selectLoading = createSelector(getCampaignsPageState, campaignsState => campaignsState.isLoading);

export const selectCampaigns = createSelector(
  selectAllCampaigns,
  (_: unknown, brandId: string) => brandId,
  (campaignsEntities, activeBrand) =>
    campaignsEntities.filter(({ subRows }) => subRows.filter(({ brandId }) => brandId === activeBrand))
);
