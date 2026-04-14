import { createSlice } from "@reduxjs/toolkit";

const profileSlice = createSlice({
  name: "profile",
  initialState: {
    value: 0,
  },
  reducers: {
    // Redux Toolkit allows us to write "mutating" logic in reducers. It
    // doesn't actually mutate the state because it uses the Immer library,
    // which detects changes to a "draft state" and produces a brand new
    // immutable state based off those changes
    increment: (state) => {
      state.value += 1;
    },

    reset: (state) => {
      state.value = 0;
    },
  },
});

/**
 * Extract value from root state
 *
 * @param   {Object} state The root state
 * @returns {number} The current value
 */
export const selectValue = (state: { profile: { value: number } }) => state.profile.value;

export const { increment, reset } = profileSlice.actions;

export default profileSlice.reducer;
