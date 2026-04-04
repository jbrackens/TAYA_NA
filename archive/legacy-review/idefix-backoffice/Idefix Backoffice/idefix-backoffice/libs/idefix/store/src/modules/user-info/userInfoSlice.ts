import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";

import { User, UserAccessSettings, UserDraft, UserLog } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";
import { getLoggedInUserId, updateAccessSettings as authUpdateAccessSettings } from "../authentication";

export interface UserInfoState {
  isFetchingUser: boolean;
  user: User | null;
  isFetchingAccessSettings: boolean;
  accessSettings: UserAccessSettings | null;
  isFetchingLog: boolean;
  log: UserLog[];
  error: unknown | null;
}

const initialState: UserInfoState = {
  isFetchingUser: false,
  user: null,
  isFetchingAccessSettings: false,
  accessSettings: null,
  isFetchingLog: false,
  log: [],
  error: null
};

export const fetchUser = createAsyncThunk<User, number>("user-info/fetch-user", async (userId, { rejectWithValue }) => {
  try {
    return await api.users.getById(userId);
  } catch (e) {
    return rejectWithValue(e);
  }
});

export const fetchAccessSettings = createAsyncThunk<UserAccessSettings, number>(
  "user-info/fetch-access-settings",
  async (userId, { rejectWithValue }) => {
    try {
      return await api.users.getAccessSettings(userId);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const fetchLog = createAsyncThunk<UserLog[], number>(
  "user-info/fetch-log",
  async (userId, { rejectWithValue }) => {
    try {
      return await api.users.getLog(userId);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateUser = createAsyncThunk<User, { userId: number } & Partial<UserDraft>>(
  "user-info/update-user",
  async ({ userId, ...values }, { rejectWithValue }) => {
    try {
      return await api.users.update(userId, {
        ...values,
        ...(values.mobilePhone ? { mobilePhone: values.mobilePhone.substring(1) } : {})
      });
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateAccessSettings = createAsyncThunk<
  UserAccessSettings,
  { userId: number; key: string; value: boolean }
>("user-info/update-access-settings", async ({ userId, key, value }, { rejectWithValue, getState, dispatch }) => {
  try {
    const loggedInUserId = getLoggedInUserId(getState() as RootState);
    const accessSettings = await api.users.updateAccessSettings(userId, { [key]: value });
    if (userId === loggedInUserId) {
      if (!accessSettings.administratorAccess) {
        window.location.replace("/");
      }
      dispatch(authUpdateAccessSettings(accessSettings));
    }
    dispatch(fetchLog(userId));
    return accessSettings;
  } catch (e) {
    return rejectWithValue(e);
  }
});

const userInfoSlice = createSlice({
  name: "user-info",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchUser.pending, state => {
      state.isFetchingUser = true;
    });
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetchingUser = false;
      state.user = payload;
    });

    builder.addCase(updateUser.pending, state => {
      state.isFetchingUser = true;
    });
    builder.addCase(updateUser.fulfilled, (state, action) => {
      state.isFetchingUser = false;
      state.user = action.payload;
    });

    builder.addCase(fetchAccessSettings.pending, state => {
      state.isFetchingAccessSettings = true;
    });
    builder.addCase(fetchAccessSettings.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetchingAccessSettings = false;
      state.accessSettings = payload;
    });

    builder.addCase(fetchLog.pending, state => {
      state.isFetchingLog = true;
    });
    builder.addCase(fetchLog.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetchingLog = false;
      state.log = payload;
    });

    builder.addCase(updateAccessSettings.pending, state => {
      state.isFetchingAccessSettings = true;
    });
    builder.addCase(updateAccessSettings.fulfilled, (state, action) => {
      const { payload } = action;
      state.accessSettings = payload;
      state.isFetchingAccessSettings = false;
    });
    builder.addCase(updateAccessSettings.rejected, state => {
      state.isFetchingAccessSettings = false;
    });
  }
});

export const { reducer } = userInfoSlice;

const getState = (state: RootState) => state.userInfo;

export const getUser = createSelector(getState, state => state.user);
export const getIsLoadingUser = createSelector(getState, state => state.isFetchingUser);
export const getUserAccessSettings = createSelector(getState, state => state.accessSettings);
export const getIsLoadingAccessSettings = createSelector(getState, state => state.isFetchingAccessSettings);
export const getUserLog = createSelector(getState, state => state.log);
export const getIsLoadingLog = createSelector(getState, state => state.isFetchingLog);
