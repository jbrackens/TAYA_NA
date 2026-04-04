import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FixtureStatus } from "@phoenix-ui/utils";

import { omit } from "lodash";

export type FixtureUpdate = {
  id: string;
  name: string;
  score: {
    away: number;
    home: number;
  };
  startTime: string;
  status: FixtureStatus;
};

type State = {
  values: { [key: string]: FixtureUpdate };
};

const initialState: State = {
  values: {},
};

const fixtureSlice = createSlice({
  name: "fixtures",
  initialState,
  reducers: {
    addFixtureUpdate: (state, action: PayloadAction<FixtureUpdate>) => {
      state.values = {
        ...state.values,
        [action.payload.id]: {
          ...action.payload,
        },
      };
    },

    removeFixtureUpdate: (state, action: PayloadAction<string>) => {
      state.values = omit(state.values, action.payload);
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
  [K in typeof fixtureSlice.name]: ReturnType<typeof fixtureSlice.reducer>;
};
export const SelectFixtures = (state: SliceState) => state.fixtures.values;

export const { addFixtureUpdate, removeFixtureUpdate } = fixtureSlice.actions;

export default fixtureSlice.reducer;
