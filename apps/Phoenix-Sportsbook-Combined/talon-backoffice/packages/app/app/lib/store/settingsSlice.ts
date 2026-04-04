'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export enum DisplayOddsEnum {
  AMERICAN = 'american',
  DECIMAL = 'decimal',
  FRACTIONAL = 'fractional',
}

export enum LimitEnum {
  STAKE = 'stakeLimits',
  DEPOSIT = 'depositLimits',
  SESSION = 'sessionLimits',
}

interface CommunicationPreferences {
  [key: string]: unknown;
}

interface BettingPreferences {
  [key: string]: unknown;
}

interface UserData {
  phoneNumber?: string;
  userId?: string;
  username?: string;
  email?: string;
  name?: string;
  address?: string;
  dateOfBirth?: string;
  depositLimits?: {
    [key: string]: unknown;
  };
  stakeLimits?: {
    [key: string]: unknown;
  };
  sessionLimits?: {
    [key: string]: unknown;
  };
  communicationPreferences?: CommunicationPreferences;
  bettingPreferences?: BettingPreferences;
  status?: string;
  coolOff?: boolean;
  terms?: boolean;
  hasToAcceptTerms?: boolean;
  signUpDate?: string;
  hasToAcceptResponsibilityCheck?: boolean;
}

interface SettingsState {
  userData: UserData;
  oddsFormat: DisplayOddsEnum;
  currentGame?: string;
  language: string;
  isUserDataLoading: boolean;
  isGeocomplyRequired: boolean;
  isGeocomplyLocationFailed: boolean;
  isAccountDataUpdateNeeded: boolean;
}

const initialState: SettingsState = {
  userData: {},
  oddsFormat: DisplayOddsEnum.DECIMAL,
  currentGame: undefined,
  language: 'en',
  isUserDataLoading: false,
  isGeocomplyRequired: false,
  isGeocomplyLocationFailed: false,
  isAccountDataUpdateNeeded: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUserData: (state, action: PayloadAction<UserData>) => {
      state.userData = action.payload;
    },
    updateUserData: (state, action: PayloadAction<Partial<UserData>>) => {
      state.userData = { ...state.userData, ...action.payload };
    },
    setOddsFormat: (state, action: PayloadAction<DisplayOddsEnum>) => {
      state.oddsFormat = action.payload;
    },
    setCurrentGame: (state, action: PayloadAction<string | undefined>) => {
      state.currentGame = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setIsUserDataLoading: (state, action: PayloadAction<boolean>) => {
      state.isUserDataLoading = action.payload;
    },
    setIsGeocomplyRequired: (state, action: PayloadAction<boolean>) => {
      state.isGeocomplyRequired = action.payload;
    },
    setIsGeocomplyLocationFailed: (state, action: PayloadAction<boolean>) => {
      state.isGeocomplyLocationFailed = action.payload;
    },
    setIsAccountDataUpdateNeeded: (state, action: PayloadAction<boolean>) => {
      state.isAccountDataUpdateNeeded = action.payload;
    },
    clearSettings: (state) => {
      state.userData = {};
      state.oddsFormat = DisplayOddsEnum.DECIMAL;
      state.currentGame = undefined;
      state.language = 'en';
      state.isUserDataLoading = false;
      state.isGeocomplyRequired = false;
      state.isGeocomplyLocationFailed = false;
      state.isAccountDataUpdateNeeded = false;
    },
  },
});

export const {
  setUserData,
  updateUserData,
  setOddsFormat,
  setCurrentGame,
  setLanguage,
  setIsUserDataLoading,
  setIsGeocomplyRequired,
  setIsGeocomplyLocationFailed,
  setIsAccountDataUpdateNeeded,
  clearSettings,
} = settingsSlice.actions;

// Selectors
export const selectUserData = (state: RootState) => state.settings.userData;
export const selectOddsFormat = (state: RootState) => state.settings.oddsFormat;
export const selectCurrentGame = (state: RootState) => state.settings.currentGame;
export const selectLanguage = (state: RootState) => state.settings.language;
export const selectIsUserDataLoading = (state: RootState) => state.settings.isUserDataLoading;
export const selectIsGeocomplyRequired = (state: RootState) => state.settings.isGeocomplyRequired;
export const selectIsGeocomplyLocationFailed = (state: RootState) => state.settings.isGeocomplyLocationFailed;
export const selectIsAccountDataUpdateNeeded = (state: RootState) => state.settings.isAccountDataUpdateNeeded;
export const selectUserPhoneNumber = (state: RootState) => state.settings.userData.phoneNumber;
export const selectUserId = (state: RootState) => state.settings.userData.userId;
export const selectUsername = (state: RootState) => state.settings.userData.username;
export const selectUserEmail = (state: RootState) => state.settings.userData.email;
export const selectUserName = (state: RootState) => state.settings.userData.name;
export const selectUserAddress = (state: RootState) => state.settings.userData.address;
export const selectUserDateOfBirth = (state: RootState) => state.settings.userData.dateOfBirth;
export const selectDepositLimits = (state: RootState) => state.settings.userData.depositLimits;
export const selectStakeLimits = (state: RootState) => state.settings.userData.stakeLimits;
export const selectSessionLimits = (state: RootState) => state.settings.userData.sessionLimits;
export const selectCommunicationPreferences = (state: RootState) => state.settings.userData.communicationPreferences;
export const selectBettingPreferences = (state: RootState) => state.settings.userData.bettingPreferences;
export const selectUserStatus = (state: RootState) => state.settings.userData.status;
export const selectCoolOff = (state: RootState) => state.settings.userData.coolOff;
export const selectTerms = (state: RootState) => state.settings.userData.terms;
export const selectHasToAcceptTerms = (state: RootState) => state.settings.userData.hasToAcceptTerms;
export const selectSignUpDate = (state: RootState) => state.settings.userData.signUpDate;
export const selectHasToAcceptResponsibilityCheck = (state: RootState) => state.settings.userData.hasToAcceptResponsibilityCheck;

export default settingsSlice.reducer;
