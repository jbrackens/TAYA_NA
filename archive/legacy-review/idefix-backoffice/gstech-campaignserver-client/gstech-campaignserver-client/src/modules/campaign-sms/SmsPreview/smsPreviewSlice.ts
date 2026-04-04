import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiServerError } from "app/types";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { resetCampaignState } from "../../campaign-info";
import { RootState } from "../../../redux";
import api from "../../../api";

interface Sms {
  contentId: number;
}

interface SmsPreviewResult {
  [lang: string]: string;
}

export const getSmsPreview = createAsyncThunk<
  SmsPreviewResult,
  Sms,
  {
    rejectValue: ApiServerError;
  }
>("sms/sms-preview", async ({ contentId }, { rejectWithValue }) => {
  try {
    const response = await api.smses.getSmsPreview(contentId);

    return response.data.data;
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

export const resetSmsPreviewState = createAction("smsPreview/reset-state");

export interface SmsPreviewState {
  error?: string;
  data?: SmsPreviewResult;
  isLoading: boolean;
}

export const initialState: SmsPreviewState = {
  isLoading: true
};

const smsPreviewSlice = createSlice({
  name: "smsPreview",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(resetSmsPreviewState, () => initialState);
    builder.addCase(getSmsPreview.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(getSmsPreview.fulfilled, (state, action) => {
      state.data = action.payload;
      state.isLoading = false;
    });
    builder.addCase(getSmsPreview.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const { reducer } = smsPreviewSlice;

export const getSmsPreviewState = (state: RootState) => state.smsPreview;
