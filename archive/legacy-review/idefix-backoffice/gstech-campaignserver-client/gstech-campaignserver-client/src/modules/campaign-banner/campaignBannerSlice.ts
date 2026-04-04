import { createSlice, createAsyncThunk, createSelector, PayloadAction } from "@reduxjs/toolkit";
import { NewContent, Content, ExistingBannerTemplate, ApiServerError } from "app/types";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { fetchCampaign } from "../campaign-info";
import { RootState, AppDispatch } from "../../redux";
import api from "../../api";

interface CreateBannerDraft {
  campaignId: number;
  values: NewContent;
}

interface UpdateBannerDraft {
  campaignId: number;
  values: NewContent;
  bannerId: number;
}

interface RemoveBannerDraft {
  campaignId: number;
  bannerId: number;
}

export const createBanner = createAsyncThunk<NewContent & { bannerId: number }, CreateBannerDraft>(
  "campaign-banner/create-banner",
  async ({ campaignId, values }: CreateBannerDraft, { rejectWithValue }) => {
    try {
      const response = await api.campaigns.addContent(campaignId, values);
      const { campaignContentId } = response.data.data;
      return { ...values, bannerId: campaignContentId };
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Create banner failed: ${error.message}`);
        throw err;
      }

      toast.error(`Create banner failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export const updateBanner = createAsyncThunk<
  NewContent,
  UpdateBannerDraft,
  {
    rejectValue: ApiServerError;
    dispatch: AppDispatch;
  }
>("campaign-banner/update-banner", async ({ campaignId, bannerId, values }, { rejectWithValue }) => {
  try {
    await api.campaigns.updateContent(campaignId, bannerId, values);

    return values;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Create banner failed: ${error.message}`);
      throw err;
    }

    toast.error(`Create banner failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const removeBanner = createAsyncThunk<
  unknown,
  RemoveBannerDraft,
  {
    rejectValue: ApiServerError;
    dispatch: AppDispatch;
  }
>("campaign-banner/remove-banner", async ({ campaignId, bannerId }, { rejectWithValue }) => {
  try {
    await api.campaigns.removeContent(campaignId, bannerId);
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Remove banner failed: ${error.message}`);
      throw err;
    }

    toast.error(`Remove banner failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export interface IBannerState {
  banner: Partial<ExistingBannerTemplate>;
  error?: string;
  isLoading: boolean;
}

export const initialState: IBannerState = {
  banner: {},
  isLoading: false
};

const bannerSlice = createSlice({
  name: "campaignBanner",
  initialState,
  reducers: {
    setBanner(state, { payload }: PayloadAction<{ banner: Content; location: string }>) {
      const { banner, location } = payload;
      const { name, content } = banner;

      state.banner.name = name;
      state.banner.location = location;
      state.banner.text = content.en.text;
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchCampaign.fulfilled, (state, action) => {
      const { banner } = action.payload;

      if (banner) {
        state.banner = banner;
      }
    });
    builder.addCase(createBanner.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(createBanner.fulfilled, (state, action) => {
      const { contentId, bannerId } = action.payload;

      state.banner.bannerId = bannerId;
      state.banner.contentId = contentId;
      state.isLoading = false;
    });
    builder.addCase(createBanner.rejected, state => {
      state.isLoading = false;
    });

    builder.addCase(updateBanner.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(updateBanner.fulfilled, (state, action) => {
      const { contentId } = action.payload;

      state.banner.contentId = contentId;
      state.isLoading = false;
    });
    builder.addCase(updateBanner.rejected, state => {
      state.isLoading = false;
    });

    builder.addCase(removeBanner.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(removeBanner.fulfilled, () => {
      return initialState;
    });
    builder.addCase(removeBanner.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const {
  reducer,
  actions: { setBanner }
} = bannerSlice;

export const getBannerState = (state: RootState) => state.campaignBanner;
export const getBanner = createSelector(getBannerState, state => state.banner);
export const getIsLoading = createSelector(getBannerState, state => state.isLoading);
