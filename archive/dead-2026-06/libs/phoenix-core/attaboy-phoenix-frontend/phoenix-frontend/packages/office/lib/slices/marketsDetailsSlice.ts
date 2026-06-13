import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TalonSingleMarketFixture } from "../../types/market.d";
import { Id, SelectionOdd } from "@phoenix-ui/utils";
import { Overwrite } from "utility-types";

export type MarketsDetailsSliceState = {
  basic: TalonSingleMarketFixture;
  loadingPostDetailsUpdate: boolean;
  loadingPutSelectionUpdate: boolean;
};

export type MarketsDetailsResponse = TalonSingleMarketFixture;

export type MarketsDetailsUpdateResponse = {
  id: Id;
  marketName: string;
};

export type MarketsStatusUpdateResponse = {
  id: Id;
};

export type MarketsSelectionUpdateResponse = {
  id: Id;
  selectionId: Id;
  odds: number;
  isStatic?: boolean;
};

export type MarketsBatchSelectionUpdateResponse = Overwrite<
  MarketsSelectionUpdateResponse,
  {
    selectionId: Id[];
  }
>;

export type MarketsDetailsSlice = {
  marketsDetails: MarketsDetailsSliceState;
};

const initialState: MarketsDetailsSliceState = {
  basic: {} as TalonSingleMarketFixture,
  loadingPostDetailsUpdate: false,
  loadingPutSelectionUpdate: false,
};

const marketsDetailsSlice = createSlice({
  name: "marketsDetails",
  initialState,
  reducers: {
    getMarketsDetails: () => {},

    getMarketsDetailsSucceeded: (
      state: MarketsDetailsSliceState,
      action: PayloadAction<MarketsDetailsResponse>,
    ) => {
      if (action?.payload) {
        state.basic = action.payload;
      }
    },

    postMarketDetailsUpdate: (state: MarketsDetailsSliceState) => {
      state.loadingPostDetailsUpdate = true;
    },

    postMarketDetailsUpdateSucceeded: (
      state: MarketsDetailsSliceState,
      action: PayloadAction<MarketsDetailsUpdateResponse>,
    ) => {
      state.loadingPostDetailsUpdate = false;
      state.basic.market.marketName = action.payload.marketName;
    },

    putMarketSelectionUpdate: (state: MarketsDetailsSliceState) => {
      state.loadingPutSelectionUpdate = true;
    },

    putMarketSelectionUpdateSucceeded: (
      state: MarketsDetailsSliceState,
      action: PayloadAction<MarketsSelectionUpdateResponse>,
    ) => {
      state.loadingPutSelectionUpdate = false;
      state.basic.market.selectionOdds = state.basic.market.selectionOdds.map(
        (selection: SelectionOdd) => {
          if (selection.selectionId === action.payload.selectionId) {
            return {
              ...selection,
              odds: action.payload.odds,
              isStatic: action.payload.isStatic || false,
            };
          }
          return selection;
        },
      );
    },

    putMarketBatchSelectionUpdate: (state: MarketsDetailsSliceState) => {
      state.loadingPutSelectionUpdate = true;
    },

    putMarketBatchSelectionUpdateSucceeded: (
      state: MarketsDetailsSliceState,
      action: PayloadAction<MarketsBatchSelectionUpdateResponse>,
    ) => {
      state.loadingPutSelectionUpdate = false;
      state.basic.market.selectionOdds = state.basic.market.selectionOdds.map(
        (selection: SelectionOdd) => {
          if (action.payload.selectionId.includes(selection.selectionId)) {
            return {
              ...selection,
              odds: action.payload.odds,
              isStatic: action.payload.isStatic || false,
            };
          }
          return selection;
        },
      );
    },
  },
});

export const selectBasicData = (
  state: MarketsDetailsSlice,
): TalonSingleMarketFixture => state.marketsDetails.basic;

export const selectUpdateDataLoading = (state: MarketsDetailsSlice): boolean =>
  state.marketsDetails.loadingPostDetailsUpdate;

export const selectUpdateSelectionLoading = (
  state: MarketsDetailsSlice,
): boolean => state.marketsDetails.loadingPutSelectionUpdate;

export const {
  getMarketsDetails,
  getMarketsDetailsSucceeded,
  postMarketDetailsUpdate,
  postMarketDetailsUpdateSucceeded,
  putMarketSelectionUpdate,
  putMarketSelectionUpdateSucceeded,
  putMarketBatchSelectionUpdate,
  putMarketBatchSelectionUpdateSucceeded,
} = marketsDetailsSlice.actions;

export default marketsDetailsSlice.reducer;
