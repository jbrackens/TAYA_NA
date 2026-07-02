"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

interface SiteSettingsState {
  minAgeToRegister: number;
  countryCode?: string;
  mfaToggleVisibility?: boolean;
}

const initialState: SiteSettingsState = {
  minAgeToRegister: 21,
  countryCode: undefined,
  mfaToggleVisibility: undefined,
};

const siteSettingsSlice = createSlice({
  name: "siteSettings",
  initialState,
  reducers: {
    setMinAgeToRegister: (state, action: PayloadAction<number>) => {
      state.minAgeToRegister = action.payload;
    },
    setCountryCode: (state, action: PayloadAction<string | undefined>) => {
      state.countryCode = action.payload;
    },
    setMfaToggleVisibility: (
      state,
      action: PayloadAction<boolean | undefined>,
    ) => {
      state.mfaToggleVisibility = action.payload;
    },
  },
});

export const { setMinAgeToRegister, setCountryCode, setMfaToggleVisibility } =
  siteSettingsSlice.actions;

// Selectors
export const selectMinAgeToRegister = (state: RootState) =>
  state.siteSettings.minAgeToRegister;
export const selectCountryCode = (state: RootState) =>
  state.siteSettings.countryCode;
export const selectMfaToggleVisibility = (state: RootState) =>
  state.siteSettings.mfaToggleVisibility;

export default siteSettingsSlice.reducer;
