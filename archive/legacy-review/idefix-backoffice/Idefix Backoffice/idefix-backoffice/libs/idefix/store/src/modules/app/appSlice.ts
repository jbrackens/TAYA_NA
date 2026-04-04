import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { Settings } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

interface AppState {
  loaded: boolean;
  brands: Settings["brands"];
  brandsSettings: Settings["brandsSettings"] | null;
  paymentProviders?: Settings["paymentProviders"];
  tasks?: Settings["tasks"];
  roles?: Settings["roles"];
  isProduction?: boolean;
}

const initialState: AppState = {
  loaded: false,
  brands: [],
  brandsSettings: null,
  roles: []
};

export const initializeSettingsSuccess = createAction("app/settings-initialized", (settings: Partial<Settings>) => ({
  payload: settings
}));

export const initializeSettings = createAsyncThunk("app/settings", async (_: void, { dispatch }) => {
  try {
    const settings = await api.settings.load();
    dispatch(initializeSettingsSuccess(settings));
  } catch (err) {
    console.log(err);
  }
});

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(initializeSettingsSuccess, (state, action) => {
      const brands = action.payload.brands;
      const brandsSettings = action.payload.brandsSettings;
      const tasks = action.payload.tasks;
      const roles = action.payload.roles;
      const paymentProviders = action.payload.paymentProviders;
      const isProduction = action.payload.isProduction;

      if (brands) {
        state.brands = brands;
      }
      if (brandsSettings) {
        state.brandsSettings = brandsSettings;
      }
      if (tasks) {
        state.tasks = tasks;
      }
      if (roles) {
        state.roles = roles;
      }
      if (paymentProviders) {
        state.paymentProviders = paymentProviders;
      }

      state.isProduction = isProduction;
      state.loaded = true;
    });
  }
});

export const { reducer } = appSlice;

export const getAppState = (state: RootState) => state.app;
export const getRoles = createSelector(getAppState, state => state.roles);

export const getAppIsLoaded = createSelector(getAppState, state => state.loaded);
export const getBrandSettings = createSelector(
  getAppState,
  (_: unknown, brandId: string) => brandId,
  (state, brandId) => state.brandsSettings?.[brandId]
);
export const getBrands = createSelector(getAppState, state => state.brands);
export const getTasksList = createSelector(getAppState, state => state.tasks);
export const getPaymentProviders = createSelector(getAppState, state => state.paymentProviders);
export const getIsProduction = createSelector(getAppState, state => state.isProduction);
