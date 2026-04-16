'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

interface SiteSettingsState {
  minAgeToRegister: number;
  currency: Currency;
  thresholdValue?: number;
  countryCode?: string;
  minWithdrawal?: number;
  maxWithdrawal?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minStake?: number;
  maxStake?: number;
  mfaToggleVisibility?: boolean;
}

const initialState: SiteSettingsState = {
  minAgeToRegister: 21,
  currency: Currency.USD,
  thresholdValue: undefined,
  countryCode: undefined,
  minWithdrawal: undefined,
  maxWithdrawal: undefined,
  minDeposit: undefined,
  maxDeposit: undefined,
  minStake: undefined,
  maxStake: undefined,
  mfaToggleVisibility: undefined,
};

const siteSettingsSlice = createSlice({
  name: 'siteSettings',
  initialState,
  reducers: {
    setMinAgeToRegister: (state, action: PayloadAction<number>) => {
      state.minAgeToRegister = action.payload;
    },
    setCurrency: (state, action: PayloadAction<Currency>) => {
      state.currency = action.payload;
    },
    setThresholdValue: (state, action: PayloadAction<number | undefined>) => {
      state.thresholdValue = action.payload;
    },
    setCountryCode: (state, action: PayloadAction<string | undefined>) => {
      state.countryCode = action.payload;
    },
    setMinWithdrawal: (state, action: PayloadAction<number | undefined>) => {
      state.minWithdrawal = action.payload;
    },
    setMaxWithdrawal: (state, action: PayloadAction<number | undefined>) => {
      state.maxWithdrawal = action.payload;
    },
    setMinDeposit: (state, action: PayloadAction<number | undefined>) => {
      state.minDeposit = action.payload;
    },
    setMaxDeposit: (state, action: PayloadAction<number | undefined>) => {
      state.maxDeposit = action.payload;
    },
    setMinStake: (state, action: PayloadAction<number | undefined>) => {
      state.minStake = action.payload;
    },
    setMaxStake: (state, action: PayloadAction<number | undefined>) => {
      state.maxStake = action.payload;
    },
    setMfaToggleVisibility: (state, action: PayloadAction<boolean | undefined>) => {
      state.mfaToggleVisibility = action.payload;
    },
  },
});

export const {
  setMinAgeToRegister,
  setCurrency,
  setThresholdValue,
  setCountryCode,
  setMinWithdrawal,
  setMaxWithdrawal,
  setMinDeposit,
  setMaxDeposit,
  setMinStake,
  setMaxStake,
  setMfaToggleVisibility,
} = siteSettingsSlice.actions;

// Selectors
export const selectMinAgeToRegister = (state: RootState) => state.siteSettings.minAgeToRegister;
export const selectCurrency = (state: RootState) => state.siteSettings.currency;
export const selectThresholdValue = (state: RootState) => state.siteSettings.thresholdValue;
export const selectCountryCode = (state: RootState) => state.siteSettings.countryCode;
export const selectMinWithdrawal = (state: RootState) => state.siteSettings.minWithdrawal;
export const selectMaxWithdrawal = (state: RootState) => state.siteSettings.maxWithdrawal;
export const selectMinDeposit = (state: RootState) => state.siteSettings.minDeposit;
export const selectMaxDeposit = (state: RootState) => state.siteSettings.maxDeposit;
export const selectMinStake = (state: RootState) => state.siteSettings.minStake;
export const selectMaxStake = (state: RootState) => state.siteSettings.maxStake;
export const selectMfaToggleVisibility = (state: RootState) => state.siteSettings.mfaToggleVisibility;

export default siteSettingsSlice.reducer;
