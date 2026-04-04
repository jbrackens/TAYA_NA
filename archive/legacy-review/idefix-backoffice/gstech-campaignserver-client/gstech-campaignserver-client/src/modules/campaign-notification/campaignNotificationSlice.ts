import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { NewContent, ApiServerError } from "app/types";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { fetchCampaign, resetCampaignState } from "../campaign-info";
import { resetNotificationPreviewState } from "../campaign-notification/NotificationPreview";
import { RootState, AppDispatch } from "../../redux";
import api from "../../api";

interface CreateNotificationDraft {
  campaignId: number;
  values: NewContent;
}

interface CreateNotificationResult extends NewContent {
  notificationId: number;
}

interface UpdateNotificationDraft {
  campaignId: number;
  notificationId: number;
  values: NewContent;
}

interface RemoveNotificationDraft {
  campaignId: number;
  notificationId: number;
}

export const createNotification = createAsyncThunk<
  CreateNotificationResult,
  CreateNotificationDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-notification/create-notification", async ({ campaignId, values }, { rejectWithValue }) => {
  try {
    const response = await api.campaigns.addContent(campaignId, values);
    const notificationId = response.data.data.campaignContentId;

    return { ...values, notificationId };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Create notification failed: ${error.message}`);
      throw err;
    }

    toast.error(`Create notification failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const updateNotification = createAsyncThunk<
  NewContent,
  UpdateNotificationDraft,
  {
    rejectValue: ApiServerError;
    dispatch: AppDispatch;
  }
>(
  "campaign-notification/update-notification",
  async ({ campaignId, notificationId, values }, { dispatch, rejectWithValue }) => {
    try {
      await api.campaigns.updateContent(campaignId, notificationId, values);
      dispatch(resetNotificationPreviewState());

      return values;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Update notification failed: ${error.message}`);
        throw err;
      }

      toast.error(`Update notification failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export const removeNotification = createAsyncThunk<
  unknown,
  RemoveNotificationDraft,
  {
    rejectValue: ApiServerError;
    dispatch: AppDispatch;
  }
>(
  "campaign-notification/remove-notification",
  async ({ campaignId, notificationId }, { dispatch, rejectWithValue }) => {
    try {
      await api.campaigns.removeContent(campaignId, notificationId);
      dispatch(resetNotificationPreviewState());
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Remove notification failed: ${error.message}`);
        throw err;
      }

      toast.error(`Remove notification failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export interface INotificationState {
  notificationTemplate: {
    notificationId?: number;
    contentId?: number;
    name?: string;
    info?: string;
  };
  error?: string;
  isLoading: boolean;
}

export const initialState: INotificationState = {
  notificationTemplate: {},
  isLoading: false
};

const notificationSlice = createSlice({
  name: "campaignNotification",
  initialState,
  reducers: {
    setNotificationTemplateInfo(state: INotificationState, { payload }: PayloadAction<{ name: string; info: string }>) {
      const { name, info } = payload;

      state.notificationTemplate.name = name;
      state.notificationTemplate.info = info;
    }
  },
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(fetchCampaign.fulfilled, (state, action) => {
      const { notification } = action.payload;

      if (notification) {
        const { title, ...rest } = notification;

        state.notificationTemplate = { ...rest, info: title };
      }
    });
    builder.addCase(createNotification.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(createNotification.fulfilled, (state, action) => {
      const { contentId, notificationId } = action.payload;

      state.notificationTemplate.contentId = contentId;
      state.notificationTemplate.notificationId = notificationId;
      state.isLoading = false;
    });
    builder.addCase(createNotification.rejected, state => {
      state.isLoading = false;
    });
    builder.addCase(updateNotification.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(updateNotification.fulfilled, (state, action) => {
      const { contentId } = action.payload;

      state.notificationTemplate.contentId = contentId;
      state.isLoading = false;
    });
    builder.addCase(updateNotification.rejected, state => {
      state.isLoading = false;
    });
    builder.addCase(removeNotification.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(removeNotification.fulfilled, () => {
      return initialState;
    });
    builder.addCase(removeNotification.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const {
  reducer,
  actions: { setNotificationTemplateInfo }
} = notificationSlice;

export const getNotificationState = (state: RootState) => state.campaignNotification;
