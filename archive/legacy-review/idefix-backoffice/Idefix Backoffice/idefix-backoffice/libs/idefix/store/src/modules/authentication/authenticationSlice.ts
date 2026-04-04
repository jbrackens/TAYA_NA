import { createAsyncThunk, createSlice, createSelector, createAction } from "@reduxjs/toolkit";

import { UserCurrentAccessSettings } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { clearLocalStorage } from "../../localStorage";
import { RootState } from "../../rootReducer";
import { AppDispatch } from "../../createStore";
import { openDialog } from "../dialogs";

interface AuthenticationState {
  open: boolean;
  loggedIn: boolean;
  userId?: number;
  token?: string;
  access: {
    administratorAccess?: boolean;
    paymentAccess?: boolean;
    reportingAccess?: boolean;
    campaignAccess?: boolean;
  };
  values: {
    email: string;
    code: string | null;
  };
  invalidLoginDetails: boolean;
}

const initialState: AuthenticationState = {
  open: false,
  loggedIn: false,
  userId: undefined,
  token: undefined,
  access: {},
  values: {
    email: "",
    code: null
  },
  invalidLoginDetails: false
};

export const authenticationRequiredAction = createAction("authentication/isRequired");

export const authenticationRequired = () => (dispatch: AppDispatch) => {
  dispatch(openDialog("authentication"));
  dispatch(authenticationRequiredAction());
};

export const logout = createAsyncThunk("authentication/logout", async () => {
  try {
    clearLocalStorage();
    await api.authentication.logout();
  } catch (err) {
    console.log(err);
  }
});

export const expirePassword = createAsyncThunk("authentication/expire-password", async () => {
  try {
    await api.authentication.expirePassword();
  } catch (err) {
    console.log(err);
  }
});

export const updateAccessSettings = createAction(
  "authentication/update-access-settings",
  (access: UserCurrentAccessSettings) => ({
    payload: access
  })
);

export const fetchAccessSettings = () => (dispatch: AppDispatch) => {
  api.users.getCurrentUserAccessSettings().then(accessSettings => dispatch(updateAccessSettings(accessSettings)));
};

const authenticationSlice = createSlice({
  name: "authentication",
  initialState,
  reducers: {
    loginSuccessful(state, action) {
      state.open = false;
      state.loggedIn = true;
      state.userId = action.payload.userId;
      state.token = action.payload.token;
      state.invalidLoginDetails = false;
    },
    loginError(state) {
      state.invalidLoginDetails = true;
    },
    changeValue(state, action) {
      state.values = {
        ...state.values,
        [action.payload.key]: action.payload.value
      };
    }
  },
  extraReducers: builder => {
    builder.addCase(logout.fulfilled, () => initialState);
    builder.addCase(expirePassword.fulfilled, () => initialState);
    builder.addCase(authenticationRequiredAction, () => initialState);
    builder.addCase(updateAccessSettings, (state, action) => {
      state.access = action.payload;
    });
  }
});

export const {
  reducer,
  actions: { loginSuccessful, loginError, changeValue }
} = authenticationSlice;

export const getAuthenticationState = (state: RootState) => state.authentication || {};

export const getUserId = createSelector(getAuthenticationState, authentication => authentication.userId);

export const getIsLoggedIn = createSelector(getAuthenticationState, authentication => authentication.loggedIn);

export const getIsInvalidLoginCredentials = createSelector(
  getAuthenticationState,
  authentication => authentication.invalidLoginDetails
);

export const getLoggedInUserId = createSelector(getAuthenticationState, authentication =>
  authentication.access ? authentication.userId : false
);
export const getAdminAccess = createSelector(
  getAuthenticationState,
  authentication => authentication.access?.administratorAccess || false
);
export const getPaymentAccess = createSelector(
  getAuthenticationState,
  authentication => authentication.access?.paymentAccess || false
);
export const getReportingAccess = createSelector(
  getAuthenticationState,
  authentication => authentication.access?.reportingAccess || false
);
export const getCampaignAccess = createSelector(
  getAuthenticationState,
  authentication => authentication.access?.campaignAccess || false
);
