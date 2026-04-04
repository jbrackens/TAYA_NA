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

// Map Go market status to Talon MarketLifecycleType
const mapGoStatusToLifecycle = (status: string): string => {
  switch ((status || "").toLowerCase()) {
    case "open": return "BETTABLE";
    case "suspended": return "NOT_BETTABLE";
    case "settled": return "SETTLED";
    case "closed": return "SETTLED";
    case "voided": return "CANCELLED";
    default: return "UNKNOWN";
  }
};

// Normalize Go snake_case single market to Talon TalonSingleMarketFixture
const normalizeGoMarketDetail = (raw: any): TalonSingleMarketFixture => {
  if (!raw || typeof raw !== "object") return raw;
  const isGoFormat = "market_id" in raw || "event_id" in raw || "market_type" in raw;
  if (!isGoFormat) return raw as TalonSingleMarketFixture;

  const outcomes = Array.isArray(raw.outcomes) ? raw.outcomes : [];
  const selectionOdds = outcomes.map((o: any) => ({
    selectionId: o.outcome_id ?? o.selectionId ?? "",
    selectionName: o.name ?? o.selectionName ?? "",
    odds: Number(o.odds ?? 0),
    displayOdds: o.odds ? { decimal: Number(o.odds), american: "", fractional: "" } : null,
    isStatic: false,
    active: (o.status ?? "active") === "active",
  }));

  return {
    fixtureId: raw.event_id ?? "",
    fixtureName: raw.event_name ?? "",
    sport: { id: raw.sport ?? "", name: raw.sport ?? "", abbreviation: raw.sport ?? "" },
    status: raw.status ?? "",
    startTime: raw.scheduled_start ?? "",
    isLive: false,
    competitors: [],
    score: { home: 0, away: 0 },
    scoreHistory: [],
    market: {
      marketId: raw.market_id ?? "",
      marketName: raw.market_type ?? "",
      selectionOdds,
      currentLifecycle: {
        type: mapGoStatusToLifecycle(raw.status),
        changeReason: "",
      },
      exposure: raw.total_matched != null
        ? { amount: Number(raw.total_matched), currency: "USD" }
        : { amount: 0, currency: "USD" },
      lifecycleChanges: [],
    },
  } as any;
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
        state.basic = normalizeGoMarketDetail(action.payload);
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
