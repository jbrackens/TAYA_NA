import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DisplayOddsEnum, PunterStatus } from "@phoenix-ui/utils";

export type CurrentGameTournament =
  | {
      id: string;
      name: string;
      numberOfFixtures: number;
    }
  | undefined;

export enum LimitEnum {
  STAKE = "stakeLimits",
  DEPOSIT = "depositLimits",
  SESSION = "sessionLimits",
}

export type CurrentGame =
  | {
      abbreviation?: string;
      iconUrl?: string;
      id: string;
      name?: string;
      tournaments?: Array<CurrentGameTournament>;
      noStar?: boolean;
      isUrlSeparate?: boolean;
    }
  | undefined;

export enum GameIdEnum {
  ALL = "all",
  IN_PLAY = "inPlay",
  UPCOMING = "upcoming",
}

export const initialState = {
  currentGame: undefined,
  language: "",
  isUserDataLoading: undefined as boolean | undefined,
  isGeocomplyRequired: false,
  isGeocomplyLocationFailed: false,
  isAccountDataUpdateNeeded: false,
  userData: {
    phoneNumber: "",
    userId: "",
    username: "",
    email: "",
    name: {
      firstName: "",
      lastName: "",
      title: "",
    },
    address: {
      country: "",
      addressLine: "",
      city: "",
      state: "",
      zipcode: "",
    },
    dateOfBirth: {
      day: 1,
      month: 1,
      year: 1,
    },
    depositLimits: {
      daily: {},
      weekly: {},
      monthly: {},
    },
    stakeLimits: {
      daily: {},
      weekly: {},
      monthly: {},
    },
    sessionLimits: {
      daily: {},
      weekly: {},
      monthly: {},
    },
    communicationPreferences: {
      announcements: false,
      promotions: false,
      subscriptionUpdates: false,
    },
    bettingPreferences: {
      autoAcceptBetterOdds: false,
    },
    status: "",
    coolOff: undefined,
    terms: undefined,
    hasToAcceptTerms: false,
    signUpDate: undefined,
    hasToAcceptResponsibilityCheck: false,
  },
  oddsFormat: DisplayOddsEnum.AMERICAN,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    resetUserData: (state) => {
      state.userData = initialState.userData;
    },

    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },

    setUserData: (state, action: PayloadAction<Partial<typeof initialState.userData>>) => {
      state.userData = {
        ...state.userData,
        ...action.payload,
      };
    },

    setIsGeocomplyLocationFailed: (state, action: PayloadAction<boolean>) => {
      state.isGeocomplyLocationFailed = action.payload;
    },

    setIsGeocomplyRequired: (state, action: PayloadAction<boolean>) => {
      state.isGeocomplyRequired = action.payload;
    },

    setIsUserDataLoading: (state, action: PayloadAction<boolean | undefined>) => {
      state.isUserDataLoading = action.payload;
    },

    setUserIdentificationData: (state, action: PayloadAction<Partial<typeof initialState.userData>>) => {
      state.userData = {
        ...state.userData,
        ...action.payload,
      };
    },

    setCommunicationPreferences: (state, action: PayloadAction<typeof initialState.userData.communicationPreferences>) => {
      state.userData.communicationPreferences = { ...action.payload };
    },

    setUserLimits: (
      state,
      action: PayloadAction<{
        limits: typeof state.userData.depositLimits;
        type: LimitEnum;
      }>,
    ) => {
      switch (action.payload.type) {
        case LimitEnum.DEPOSIT:
          state.userData = {
            ...state.userData,
            [LimitEnum.DEPOSIT]: action.payload.limits,
          };
          break;

        case LimitEnum.STAKE:
          state.userData = {
            ...state.userData,
            [LimitEnum.STAKE]: action.payload.limits,
          };
          break;

        case LimitEnum.SESSION:
          state.userData = {
            ...state.userData,
            [LimitEnum.SESSION]: action.payload.limits,
          };
          break;
      }
    },

    setIsAccountDataUpdateNeeded: (state, action: PayloadAction<boolean>) => {
      state.isAccountDataUpdateNeeded = action.payload;
    },

    setOddsFormat: (state, action: PayloadAction<DisplayOddsEnum>) => {
      state.oddsFormat = action.payload;
    },
  },
});

type SettingsSliceState = {
  settings: typeof initialState & { timezone?: string };
};

export const selectLanguage = (state: SettingsSliceState) => state.settings.language;

export const selectTimezone = (state: SettingsSliceState) => state.settings.timezone;

export const selectAccountCommunicatePreferences = (state: SettingsSliceState) =>
  state.settings.userData.communicationPreferences;

export const selectAccountDepositLimits = (state: SettingsSliceState) =>
  state.settings.userData.depositLimits;

export const selectAccountSessionLimits = (state: SettingsSliceState) =>
  state.settings.userData.sessionLimits;

export const selectAccountStakeLimits = (state: SettingsSliceState) =>
  state.settings.userData.stakeLimits;

export const selectIsUserDataLoading = (state: SettingsSliceState) =>
  state.settings.isUserDataLoading;

export const selectIsGeocomplyRequired = (state: SettingsSliceState) =>
  state.settings.isGeocomplyRequired;

export const selectIsGeocomplyLocationFailed = (state: SettingsSliceState) =>
  state.settings.isGeocomplyLocationFailed;

export const selectAccountStatus = (state: SettingsSliceState): PunterStatus =>
  state.settings.userData.status as PunterStatus;

export const selectUserPersonalDetails = (state: SettingsSliceState) => ({
  username: state.settings.userData.username,
  email: state.settings.userData.email,
  phoneNumber: state.settings.userData.phoneNumber,
  name: {
    firstName: state.settings.userData.name.firstName,
    lastName: state.settings.userData.name.lastName,
    title: state.settings.userData.name.title,
  },
  dateOfBirth: state.settings.userData.dateOfBirth,
  address: state.settings.userData.address,
  terms: state.settings.userData.terms,
  hasToAcceptTerms: state.settings.userData.hasToAcceptTerms,
  signUpDate: state.settings.userData.signUpDate,
});

export const selectIsAccountDataUpdateNeeded = (state: SettingsSliceState) =>
  state.settings.userData.userId === "" ||
  state.settings.isAccountDataUpdateNeeded;

export const selectStatus = (state: SettingsSliceState) => state.settings.userData.status;

export const selectCoolOff = (state: SettingsSliceState) => state.settings.userData.coolOff;

export const selectHasToAcceptResponsibilityCheck = (state: SettingsSliceState) =>
  state.settings.userData.hasToAcceptResponsibilityCheck;

export const selectOddsFormat = (state: SettingsSliceState): DisplayOddsEnum =>
  state.settings.oddsFormat;

export const {
  resetUserData,
  setLanguage,
  setUserData,
  setIsUserDataLoading,
  setIsGeocomplyRequired,
  setIsGeocomplyLocationFailed,
  setUserIdentificationData,
  setCommunicationPreferences,
  setUserLimits,
  setIsAccountDataUpdateNeeded,
  setOddsFormat,
} = settingsSlice.actions;

export default settingsSlice.reducer;
