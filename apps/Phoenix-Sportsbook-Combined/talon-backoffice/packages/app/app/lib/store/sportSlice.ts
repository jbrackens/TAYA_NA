'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface Tournament {
  id: string;
  name: string;
  numberOfFixtures: number;
}

interface Sport {
  abbreviation: string;
  iconUrl?: string;
  id: string;
  name: string;
  tournaments?: Tournament[];
  isUrlSeparate?: boolean;
  displayToPunters?: boolean;
}

interface SportState {
  list: Sport[];
  timeOfSportsGet: string;
}

const initialState: SportState = {
  list: [],
  timeOfSportsGet: '',
};

const sportSlice = createSlice({
  name: 'sports',
  initialState,
  reducers: {
    setSports: (state, action: PayloadAction<Sport[]>) => {
      state.list = action.payload;
    },
    setTimeOfSportsGet: (state, action: PayloadAction<string>) => {
      state.timeOfSportsGet = action.payload;
    },
  },
});

export const { setSports, setTimeOfSportsGet } = sportSlice.actions;

// Selectors
export const selectSports = (state: RootState) => state.sports.list;
export const selectTimeOfSportsGet = (state: RootState) => state.sports.timeOfSportsGet;
export const selectSportByAbbreviation = (state: RootState, abbreviation: string) =>
  state.sports.list.find((sport) => sport.abbreviation === abbreviation);

export default sportSlice.reducer;
