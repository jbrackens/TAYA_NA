import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Id } from "@phoenix-ui/utils";

export type FixturesDetailsSliceState = {
  basic: any;
  loadingPostDetailsUpdate: boolean;
};

export type FixturesDetailsResponse = Record<string, unknown>;

export type FixturesDetailsUpdateResponse = {
  id: Id;
  name?: string;
  status?: string;
};

export type FixturesStatusUpdateResponse = {
  id: Id;
  status: string;
};

export type FixturesSelectionUpdateResponse = {
  id: Id;
  selectionId: Id;
  odds: number;
  isStatic?: boolean;
};

export type FixturesBatchSelectionUpdateResponse = {
  id: Id;
  selectionId: Id[];
  odds: number;
  isStatic?: boolean;
};

export type FixturesDetailsSlice = {
  retiredEventDetails: FixturesDetailsSliceState;
};

const initialState: FixturesDetailsSliceState = {
  basic: {},
  loadingPostDetailsUpdate: false,
};

const retiredEventDetailsSlice = createSlice({
  name: "retiredEventDetails",
  initialState,
  reducers: {
    getFixturesDetails: () => {},

    getFixturesDetailsSucceeded: (
      state: FixturesDetailsSliceState,
      action: PayloadAction<FixturesDetailsResponse>,
    ) => {
      state.basic = action.payload || {};
    },

    postFixtureDetailsUpdate: (state: FixturesDetailsSliceState) => {
      state.loadingPostDetailsUpdate = true;
    },

    postFixtureDetailsUpdateSucceeded: (
      state: FixturesDetailsSliceState,
      action: PayloadAction<FixturesDetailsUpdateResponse>,
    ) => {
      state.loadingPostDetailsUpdate = false;
      state.basic = {
        ...state.basic,
        ...action.payload,
      };
    },

    putFixtureStatusUpdateSucceeded: (
      state: FixturesDetailsSliceState,
      action: PayloadAction<FixturesStatusUpdateResponse>,
    ) => {
      state.basic = {
        ...state.basic,
        status: action.payload.status,
      };
    },
  },
});

export const selectBasicData = (state: FixturesDetailsSlice): any =>
  state.retiredEventDetails.basic;

export const selectUpdateDataLoading = (
  state: FixturesDetailsSlice,
): boolean => state.retiredEventDetails.loadingPostDetailsUpdate;

export const {
  getFixturesDetails,
  getFixturesDetailsSucceeded,
  postFixtureDetailsUpdate,
  postFixtureDetailsUpdateSucceeded,
  putFixtureStatusUpdateSucceeded,
} = retiredEventDetailsSlice.actions;

export default retiredEventDetailsSlice.reducer;
