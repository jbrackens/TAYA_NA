import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { NewContent, ApiServerError } from "app/types";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { fetchCampaign, resetCampaignState } from "../campaign-info";
import { RootState } from "../../redux";
import api from "../../api";
import { getMaltaHourOffset } from "../../utils/getMaltaHourOffset";
import { resetSmsPreviewState } from "./SmsPreview";

interface CreateSmsDraft {
  campaignId: number;
  values: NewContent;
}

interface CreateSmsResult extends NewContent {
  smsId: number;
}

interface UpdateSmsDraft {
  campaignId: number;
  smsId: number;
  values: NewContent;
}

interface RemoveSmsDraft {
  campaignId: number;
  smsId: number;
}

export const createSms = createAsyncThunk<
  CreateSmsResult,
  CreateSmsDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-sms/create-sms", async ({ campaignId, values }, { rejectWithValue }) => {
  try {
    const { contentId, sendingTime, sendToAll } = values;
    const draft = {
      contentId,
      sendToAll,
      sendingTime: sendingTime ? `${sendingTime}:00+0${getMaltaHourOffset()}` : undefined
    };

    const response = await api.campaigns.addContent(campaignId, draft);
    const smsId = response.data.data.campaignContentId;

    return { ...values, smsId };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Create sms failed: ${error.message}`);
      throw err;
    }

    toast.error(`Create sms failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const updateSms = createAsyncThunk<
  NewContent,
  UpdateSmsDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-sms/update-sms", async ({ campaignId, smsId, values }, { dispatch, rejectWithValue }) => {
  try {
    const { contentId, sendingTime, sendToAll } = values;
    const draft = {
      contentId,
      sendToAll,
      sendingTime: sendingTime
        ? sendingTime.length < 11
          ? `${sendingTime}:00+0${getMaltaHourOffset()}`
          : sendingTime
        : undefined
    };

    await api.campaigns.updateContent(campaignId, smsId, draft);
    dispatch(resetSmsPreviewState());

    return values;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Update sms failed: ${error.message}`);
      throw err;
    }

    toast.error(`Update sms failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const removeSms = createAsyncThunk<
  unknown,
  RemoveSmsDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-sms/remove-sms", async ({ campaignId, smsId }, { dispatch, rejectWithValue }) => {
  try {
    await api.campaigns.removeContent(campaignId, smsId);
    dispatch(resetSmsPreviewState());
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Remove sms failed: ${error.message}`);
      throw err;
    }

    toast.error(`Remove sms failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

interface ISmsState {
  smsTemplate: {
    smsId?: number;
    sendingTime: null | string;
    sendToAll?: boolean;
    contentId?: number;
    name?: string;
    info?: string;
  };
  error?: string;
  isLoading: boolean;
}

const initialState: ISmsState = {
  smsTemplate: {
    sendingTime: null,
    sendToAll: false
  },
  isLoading: false
};

const smsSlice = createSlice({
  name: "campaignSms",
  initialState,
  reducers: {
    setSmsTemplateInfo(state: ISmsState, { payload }: PayloadAction<{ name: string; info: string }>) {
      const { info, name } = payload;

      state.smsTemplate.name = name;
      state.smsTemplate.info = info;
    }
  },
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(fetchCampaign.fulfilled, (state, action) => {
      const { sms } = action.payload;

      if (sms) {
        const { text, ...rest } = sms;

        state.smsTemplate = { ...rest, info: text };
      }
    });
    builder.addCase(createSms.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(createSms.fulfilled, (state, action) => {
      const { contentId, smsId, sendingTime, sendToAll } = action.payload;

      state.smsTemplate.contentId = contentId;
      state.smsTemplate.smsId = smsId;
      state.smsTemplate.sendToAll = sendToAll;

      if (sendingTime) {
        state.smsTemplate.sendingTime = sendingTime;
      }

      state.isLoading = false;
    });
    builder.addCase(createSms.rejected, () => {});
    builder.addCase(updateSms.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(updateSms.fulfilled, (state, action) => {
      const { contentId, sendingTime, sendToAll } = action.payload;

      state.smsTemplate.contentId = contentId;
      state.smsTemplate.sendToAll = sendToAll;

      if (!sendingTime) {
        state.smsTemplate.sendingTime = null;
      } else {
        state.smsTemplate.sendingTime = sendingTime;
      }

      state.isLoading = false;
    });
    builder.addCase(updateSms.rejected, state => {
      state.isLoading = false;
    });
    builder.addCase(removeSms.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(removeSms.fulfilled, () => {
      return initialState;
    });
    builder.addCase(removeSms.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const {
  reducer,
  actions: { setSmsTemplateInfo }
} = smsSlice;

export const getSmsState = (state: RootState) => state.campaignSms;
