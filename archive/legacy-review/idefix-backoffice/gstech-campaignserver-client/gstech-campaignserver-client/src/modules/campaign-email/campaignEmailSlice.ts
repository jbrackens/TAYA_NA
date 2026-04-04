import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { NewContent, ApiServerError } from "app/types";
import { fetchCampaign, resetCampaignState } from "../campaign-info";
import { resetEmailPreviewState } from "./EmailPreview";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { RootState, AppDispatch } from "../../redux";
import api from "../../api";
import { getMaltaHourOffset } from "../../utils/getMaltaHourOffset";

interface CreateEmailDraft {
  campaignId: number;
  values: NewContent;
}

interface CreateEmailResult extends NewContent {
  emailId: number;
}

interface UpdateEmailDraft {
  campaignId: number;
  emailId: number;
  values: NewContent;
}

interface RemoveEmailDraft {
  campaignId: number;
  emailId: number;
}

export const createEmail = createAsyncThunk<
  CreateEmailResult,
  CreateEmailDraft,
  {
    rejectValue: ApiServerError;
  }
>("campaign-email/create-email", async ({ campaignId, values }, { rejectWithValue }) => {
  try {
    const { contentId, sendingTime, sendToAll } = values;
    const draft = {
      contentId,
      sendToAll,
      sendingTime: sendingTime ? `${sendingTime}:00+0${getMaltaHourOffset()}` : undefined
    };

    const response = await api.campaigns.addContent(campaignId, draft);
    const emailId = response.data.data.campaignContentId;

    return { ...values, emailId };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Create email failed: ${error.message}`);
      throw err;
    }

    toast.error(`Create email failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const updateEmail = createAsyncThunk<
  NewContent,
  UpdateEmailDraft,
  {
    rejectValue: ApiServerError;
    dispatch: AppDispatch;
  }
>("campaign-email/update-email", async ({ campaignId, emailId, values }, { dispatch, rejectWithValue }) => {
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

    await api.campaigns.updateContent(campaignId, emailId, draft);
    dispatch(resetEmailPreviewState());

    return values;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Update email failed: ${error.message}`);
      throw err;
    }

    toast.error(`Update email failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const removeEmail = createAsyncThunk<
  unknown,
  RemoveEmailDraft,
  {
    rejectValue: ApiServerError;
    dispatch: AppDispatch;
  }
>("campaign-email/remove-email", async ({ campaignId, emailId }, { dispatch, rejectWithValue }) => {
  try {
    await api.campaigns.removeContent(campaignId, emailId);
    dispatch(resetEmailPreviewState());
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Remove email failed: ${error.message}`);
      throw err;
    }

    toast.error(`Remove email failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export interface IEmailState {
  emailTemplate: {
    emailId?: number;
    sendingTime: null | string;
    sendToAll?: boolean;
    contentId?: number;
    name?: string;
    info?: string;
  };
  error?: string;
  isLoading: boolean;
}

const initialState: IEmailState = {
  emailTemplate: {
    sendingTime: null,
    sendToAll: false
  },
  isLoading: false
};

const emailSlice = createSlice({
  name: "campaignEmail",
  initialState,
  reducers: {
    setEmailTemplateInfo(state: IEmailState, { payload }: PayloadAction<{ name: string; info: string }>) {
      const { info, name } = payload;

      state.emailTemplate.name = name;
      state.emailTemplate.info = info;
    }
  },
  extraReducers: builder => {
    builder.addCase(resetCampaignState, () => initialState);
    builder.addCase(fetchCampaign.fulfilled, (state, action) => {
      const { email } = action.payload;

      if (email) {
        const { subject, ...rest } = email;
        state.emailTemplate = { ...rest, info: subject };
      }
    });
    builder.addCase(createEmail.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(createEmail.fulfilled, (state, action) => {
      const { contentId, emailId, sendingTime, sendToAll } = action.payload;

      state.emailTemplate.contentId = contentId;
      state.emailTemplate.emailId = emailId;
      state.emailTemplate.sendToAll = sendToAll;

      if (sendingTime) {
        state.emailTemplate.sendingTime = sendingTime;
      }

      state.isLoading = false;
    });
    builder.addCase(createEmail.rejected, state => {
      state.isLoading = false;
    });
    builder.addCase(updateEmail.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(updateEmail.fulfilled, (state, action) => {
      const { contentId, sendingTime, sendToAll } = action.payload;

      state.emailTemplate.contentId = contentId;
      state.emailTemplate.sendToAll = sendToAll;

      if (!sendingTime) {
        state.emailTemplate.sendingTime = null;
      } else {
        state.emailTemplate.sendingTime = sendingTime;
      }

      state.isLoading = false;
    });
    builder.addCase(updateEmail.rejected, state => {
      state.isLoading = false;
    });
    builder.addCase(removeEmail.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(removeEmail.fulfilled, () => initialState);
    builder.addCase(removeEmail.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const {
  reducer,
  actions: { setEmailTemplateInfo }
} = emailSlice;

export const getEmailState = (state: RootState) => state.campaignEmail;
