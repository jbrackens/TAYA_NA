'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface Score {
  away: number;
  home: number;
}

interface FixtureUpdate {
  id: string;
  name: string;
  score: Score;
  startTime: string;
  status: string;
}

interface FixtureState {
  values: {
    [key: string]: FixtureUpdate;
  };
}

const initialState: FixtureState = {
  values: {},
};

const fixtureSlice = createSlice({
  name: 'fixtures',
  initialState,
  reducers: {
    addFixtureUpdate: (state, action: PayloadAction<FixtureUpdate>) => {
      state.values[action.payload.id] = action.payload;
    },
    removeFixtureUpdate: (state, action: PayloadAction<string>) => {
      const { [action.payload]: _, ...rest } = state.values;
      state.values = rest;
    },
  },
});

export const { addFixtureUpdate, removeFixtureUpdate } = fixtureSlice.actions;

// Selectors
export const selectFixtures = (state: RootState) => state.fixtures.values;

export default fixtureSlice.reducer;
