import { createSlice } from "@reduxjs/toolkit";
import { Currency } from "@phoenix-ui/utils";

type SiteSettingsType = {
  minAgeToRegister: number;
  currency: Currency;
  thresholdValue: number;
  countryCode: string;
  minWithdrawalValue: number;
  maxWithdrawalValue: number;
  minDepositValue: number;
  maxDepositValue: number;
  maxStake: number;
  minStake: number;
  mfaToggleVisibility: boolean;
};

type State = {
  siteSettings: SiteSettingsType;
};

export const initialState: SiteSettingsType = {
  minAgeToRegister: 21,
  currency: Currency.USD,
  thresholdValue: 2500,
  countryCode: "+1",
  minWithdrawalValue: 50,
  maxWithdrawalValue: 10000,
  minDepositValue: 10,
  maxDepositValue: 10000,
  maxStake: 500,
  minStake: 0.5,
  mfaToggleVisibility: false,
};

const siteSettingsSlice = createSlice({
  name: "siteSettings",
  initialState,
  reducers: {
    setMinAgeToRegister: (state, action) => {
      state.minAgeToRegister = action.payload;
    },
  },
});

export const selectMinAgeToRegister = (state: State) =>
  state.siteSettings.minAgeToRegister;

export const selectCurrency = (state: State) => state.siteSettings.currency;

export const selectThresholdValue = (state: State) =>
  state.siteSettings.thresholdValue;

export const selectCountryCode = (state: State) =>
  state.siteSettings.countryCode;

export const selectMinWithdrawalValue = (state: State) =>
  state.siteSettings.minWithdrawalValue;

export const selectMaxWithdrawalValue = (state: State) =>
  state.siteSettings.maxWithdrawalValue;

export const selectMinDepositValue = (state: State) =>
  state.siteSettings.minDepositValue;

export const selectMaxDepositValue = (state: State) =>
  state.siteSettings.maxDepositValue;

export const selectMaxStake = (state: State) => state.siteSettings.maxStake;

export const selectMinStake = (state: State) => state.siteSettings.minStake;

export const selectMfaToggleVisibility = (state: State) =>
  state.siteSettings.mfaToggleVisibility;

export const { setMinAgeToRegister } = siteSettingsSlice.actions;

export default siteSettingsSlice.reducer;
