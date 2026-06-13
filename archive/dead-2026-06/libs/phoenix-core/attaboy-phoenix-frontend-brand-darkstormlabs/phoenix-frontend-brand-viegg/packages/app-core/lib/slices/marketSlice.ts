import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  MarketLifecycleChangeReasonType,
  MarketLifecycleType,
  SelectionOdd,
} from "@phoenix-ui/utils";

import { omit } from "lodash";

export type MarketUpdate = {
  marketId: string;
  marketName: string;
  marketStatus: {
    changeReason: {
      status: string;
      type: MarketLifecycleChangeReasonType;
    };
    type: MarketLifecycleType;
  };
  marketType: string;
  selectionOdds: SelectionOdd[];
  specifiers: {
    variant: string;
    way: string;
  };
};

type State = {
  values: { [key: string]: MarketUpdate };
};

const initialState: State = {
  values: {},
};

const marketSlice = createSlice({
  name: "markets",
  initialState,
  reducers: {
    addMarketUpdate: (state, action: PayloadAction<MarketUpdate>) => {
      state.values = {
        ...state.values,
        [action.payload.marketId]: {
          ...action.payload,
        },
      };
    },

    removeMarketUpdate: (state, action: PayloadAction<string>) => {
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
  [K in typeof marketSlice.name]: ReturnType<typeof marketSlice.reducer>;
};
export const SelectMarkets = (state: SliceState) => state.markets.values;

export const { addMarketUpdate, removeMarketUpdate } = marketSlice.actions;

export default marketSlice.reducer;
