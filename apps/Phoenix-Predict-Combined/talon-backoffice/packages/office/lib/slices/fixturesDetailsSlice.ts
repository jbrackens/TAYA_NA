import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TalonFixture } from "../../types/fixture";
import { Id, FixtureStatus } from "@phoenix-ui/utils";
import { Overwrite } from "utility-types";

export type FixturesDetailsSliceState = {
  basic: TalonFixture;
};

export type FixturesDetailsResponse = TalonFixture;

export type FixturesDetailsUpdateResponse = {
  id: Id;
  fixtureName: string;
  status?: FixtureStatus;
};

export type FixturesStatusUpdateResponse = {
  id: Id;
  status?: FixtureStatus;
};

export type FixturesSelectionUpdateResponse = {
  id: Id;
  selectionId: Id;
  odds: number;
  isStatic?: boolean;
};

export type FixturesBatchSelectionUpdateResponse = Overwrite<
  FixturesSelectionUpdateResponse,
  {
    selectionId: Id[];
  }
>;

export type FixturesDetailsSlice = {
  fixturesDetails: FixturesDetailsSliceState;
};

const initialState: FixturesDetailsSliceState = {
  basic: {} as TalonFixture,
};

const fixturesDetailsSlice = createSlice({
  name: "fixturesDetails",
  initialState,
  reducers: {
    getFixturesDetails: () => {},

    getFixturesDetailsSucceeded: (
      state: FixturesDetailsSliceState,
      action: PayloadAction<FixturesDetailsResponse>,
    ) => {
      if (action?.payload) {
        state.basic = action.payload;
      }
    },

    postFixtureDetailsUpdate: () => {},

    postFixtureDetailsUpdateSucceeded: (
      state: FixturesDetailsSliceState,
      action: PayloadAction<FixturesDetailsUpdateResponse>,
    ) => {
      state.basic.fixtureName = action.payload.fixtureName;
      if (action.payload?.status) {
        state.basic.status = action.payload.status;
      }
    },

    postFixtureStatusUpdate: () => {},

    postFixtureStatusUpdateSucceeded: (
      state: FixturesDetailsSliceState,
      action: PayloadAction<FixturesStatusUpdateResponse>,
    ) => {
      state.basic.status = action.payload.status;
    },
  },
});

export const selectBasicData = (state: FixturesDetailsSlice): TalonFixture =>
  state.fixturesDetails.basic;

export const {
  getFixturesDetails,
  getFixturesDetailsSucceeded,
  postFixtureDetailsUpdate,
  postFixtureDetailsUpdateSucceeded,
  postFixtureStatusUpdate,
  postFixtureStatusUpdateSucceeded,
} = fixturesDetailsSlice.actions;

export default fixturesDetailsSlice.reducer;
