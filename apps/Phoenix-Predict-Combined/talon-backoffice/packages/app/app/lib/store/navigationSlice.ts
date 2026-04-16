'use client';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from './store';

export enum LocationEnum {
  STANDARD = 'STANDARD',
  ACCOUNT = 'ACCOUNT',
}

interface NavigationState {
  location: LocationEnum;
}

const initialState: NavigationState = {
  location: LocationEnum.STANDARD,
};

const navigationSlice = createSlice({
  name: 'navigation',
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

export const { changeLocationToAccount, changeLocationToStandard } = navigationSlice.actions;

// Selectors
export const selectLocation = (state: RootState) => state.navigation.location;

export default navigationSlice.reducer;
