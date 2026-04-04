import { createSlice } from "@reduxjs/toolkit";

export enum LocationEnum {
  STANDARD = "STANDARD",
  ACCOUNT = "ACCOUNT",
}

export type Link = {
  abbreviation: string;
  iconUrl?: string;
  id: string;
  name: string;
  noStar: boolean;
  isUrlSeparate?: boolean;
};

type State = {
  location: LocationEnum;
};

const initialState: State = {
  location: LocationEnum.STANDARD,
};

const navigationSlice = createSlice({
  name: "navigation",
  initialState,
  reducers: {
    changeLocationToAccount: (state) => {
      state.location = LocationEnum.ACCOUNT;
    },

    changeLocationToStandard: (state) => {
      state.location = LocationEnum.STANDARD;
    },
  },
});

/**
 * Extract value from root state
 *
 * @param   {Object} state The root state
 * @returns {number} The current value
 */

type SliceState = {
  [K in typeof navigationSlice.name]: ReturnType<
    typeof navigationSlice.reducer
  >;
};

export const selectLocation = (state: SliceState) => state.navigation.location;

export const {
  changeLocationToAccount,
  changeLocationToStandard,
} = navigationSlice.actions;

export default navigationSlice.reducer;
