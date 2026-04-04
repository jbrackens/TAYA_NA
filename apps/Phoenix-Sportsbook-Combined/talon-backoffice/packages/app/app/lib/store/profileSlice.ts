'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface ProfileState {
  /** Generic counter — used by the original codebase for profile view tracking */
  value: number;
}

const initialState: ProfileState = {
  value: 0,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    reset: (state) => {
      state.value = 0;
    },
    setValue: (state, action: PayloadAction<number>) => {
      state.value = action.payload;
    },
  },
});

// Selectors
export const selectProfileValue = (state: RootState) => state.profile.value;

export const { increment, reset, setValue } = profileSlice.actions;
export default profileSlice.reducer;
