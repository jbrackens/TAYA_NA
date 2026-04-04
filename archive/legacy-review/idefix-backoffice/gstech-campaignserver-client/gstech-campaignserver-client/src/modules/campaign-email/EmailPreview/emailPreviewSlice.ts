import { createSlice, createAsyncThunk, createAction } from "@reduxjs/toolkit";
import { Language, ApiServerError } from "app/types";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { resetCampaignState } from "../../campaign-info";
import { RootState } from "../../../redux";
import api from "../../../api";

interface EmailPreviewDraft {
  contentId: number;
  lang: string;
}

interface EmailPreviewResult {
  html: string;
  lang: string;
}

export const getEmailPreview = createAsyncThunk<
  EmailPreviewResult,
  EmailPreviewDraft,
  {
    rejectValue: ApiServerError;
  }
>("email/email-preview", async ({ contentId, lang }, { rejectWithValue }) => {
  try {
    const response = await api.emails.getEmailPreview(contentId, lang);
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

export const resetEmailPreviewState = createAction("emailPreview/reset-state");

export interface IEmailPreviewState {
  error?: string;
  html?: string;
  lang: Language["code"];
  isLoading: boolean;
}

export const initialState: IEmailPreviewState = {
  lang: "en",
  isLoading: true
};

const emailPreviewSlice = createSlice({
  name: "emailPreview",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(resetEmailPreviewState, () => initialState);
    builder.addCase(getEmailPreview.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(getEmailPreview.fulfilled, (state, action) => {
      const { html, lang } = action.payload;

      state.html = html;
      state.lang = lang;
      state.isLoading = false;
    });
    builder.addCase(getEmailPreview.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const { reducer } = emailPreviewSlice;

export const getEmailPreviewState = (state: RootState) => state.emailPreview;
