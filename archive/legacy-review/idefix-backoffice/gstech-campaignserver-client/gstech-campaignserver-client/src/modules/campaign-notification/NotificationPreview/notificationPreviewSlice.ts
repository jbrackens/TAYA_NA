import { createSlice, createAsyncThunk, createAction } from "@reduxjs/toolkit";
import { Language, ApiServerError } from "app/types";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { resetCampaignState } from "../../campaign-info";
import { RootState } from "../../../redux";
import api from "../../../api";

interface NotificationPreviewDraft {
  contentId: number;
  lang: string;
}

interface NotificationPreviewResult {
  html: string;
  lang: string;
}

export const getNotificationPreview = createAsyncThunk<
  NotificationPreviewResult,
  NotificationPreviewDraft,
  {
    rejectValue: ApiServerError;
  }
>("notification/notification-preview", async ({ contentId, lang }, { rejectWithValue }) => {
  try {
    const response = await api.notifications.getNotificationPreview(contentId, lang);
    const html = response.data;

    return { html, lang };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Get preview failed: ${error.message}`);
      throw err;
    }

    toast.error(`Get preview failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const resetNotificationPreviewState = createAction("notificationPreview/reset-state");

interface INotificationPreviewState {
  error?: string;
  html?: string;
  lang: Language["code"];
  isLoading: boolean;
}

const initialState: INotificationPreviewState = {
  lang: "en",
  isLoading: true
};

const notificationPreviewSlice = createSlice({
  name: "notificationPreview",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(resetNotificationPreviewState, () => initialState);
    builder.addCase(getNotificationPreview.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(getNotificationPreview.fulfilled, (state, action) => {
      const { html, lang } = action.payload;

      state.html = html;
      state.lang = lang;
      state.isLoading = false;
    });
    builder.addCase(getNotificationPreview.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const { reducer } = notificationPreviewSlice;

export const getNotificationPreviewState = (state: RootState) => state.notificationPreview;
