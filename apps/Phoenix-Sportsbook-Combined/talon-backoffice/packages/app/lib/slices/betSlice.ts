import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Bet, SummaryValues, SelectedBed } from "@phoenix-ui/utils";
import { Status } from "@phoenix-ui/utils";
import { omit } from "lodash";
import { BetSlipData } from "../../components/layout/betslip/list";

export type BetValues = {
  [key: string]: {
    bet: number;
    toReturn: number;
  };
};

type State = {
  values: Array<Bet>;
  summaryValues: SummaryValues;
  openBets: Array<Bet>;
  handledOpenBetsPages: Array<number>;
  openBetsSize: number;
  multiBetsStake: number;
  shouldScrollToErrorElement: boolean;
  errorCodes: Array<{ errorCode: string }>;
  isErrorVisible: boolean;
  singleBets: Array<BetSlipData>;
  isListErrorVisible: boolean;
  isConfirmationComponentVisible: boolean;
  isOddsChangesConfirmed: boolean;
};

const initialState: State = {
  values: [],
  openBets: [],
  summaryValues: {
    totalStake: 0,
    possibleReturn: 0,
    betValues: {},
    totalOdds: 0,
    multiBetsPossibleReturn: 0,
  },
  handledOpenBetsPages: [],
  openBetsSize: 0,
  multiBetsStake: 0,
  shouldScrollToErrorElement: false,
  errorCodes: [],
  isErrorVisible: false,
  singleBets: [],
  isListErrorVisible: false,
  isConfirmationComponentVisible: false,
  isOddsChangesConfirmed: false,
};

const betSlice = createSlice({
  name: "bets",
  initialState,
  reducers: {
    setBets: (state, action: PayloadAction<Array<Bet> | null>) => {
      if (action.payload) {
        state.values = action.payload;
      } else {
        state.values = [];
      }
    },

    toggleBetElement: (state, action: PayloadAction<Bet>) => {
      const isElementExists = state.values.some(
        (el) =>
          el.selectionId === action.payload.selectionId &&
          el.brandMarketId === action.payload.brandMarketId,
      );
      if (isElementExists) {
        state.values = state.values.filter(
          (el) =>
            el.brandMarketId.concat(el.selectionId) !==
            action.payload.brandMarketId.concat(action.payload.selectionId),
        );
        const newSummaryValues = omit(state.summaryValues.betValues, [
          action.payload.brandMarketId.concat(action.payload.selectionId),
        ]) as typeof state.summaryValues.betValues;
        state.summaryValues = {
          ...state.summaryValues,
          betValues: newSummaryValues,
        };
      } else {
        state.values = [...state.values, action.payload];
      }
    },

    updateBetElementOdds: (state, action: PayloadAction<SelectedBed>) => {
      state.values = state.values.map((bet) => {
        if (
          bet.brandMarketId === action.payload.brandMarketId &&
          bet.selectionId === action.payload.selectionId
        ) {
          return {
            ...bet,
            odds: action.payload.newOddsValue,
            areOddsUpdated: true,
          };
        }
        return bet;
      });
    },

    clearBets: (state) => {
      state.values = [];
    },

    clearOpenBets: (state) => {
      state.openBets = [];
    },

    removeBet: (state, action: PayloadAction<string>) => {
      state.values = state.values.filter(
        (el) => el.selectionId !== action.payload,
      );
    },

    setSummaryValues: (state, action: PayloadAction<SummaryValues | null>) => {
      if (action.payload) {
        state.summaryValues = action.payload;
      } else {
        state.summaryValues = {
          totalStake: 0,
          possibleReturn: 0,
          betValues: {},
          totalOdds: 0,
          multiBetsPossibleReturn: 0,
        };
      }
    },

    updateSummaryValuesAfterOddsUpdate: (
      state,
      action: PayloadAction<SelectedBed>,
    ) => {
      const betValueKey = action.payload.brandMarketId.concat(
        action.payload.selectionId,
      );
      const betValue = state.summaryValues.betValues[betValueKey];
      if (betValue !== undefined) {
        const newValueToReturn = action.payload.newOddsValue
          ? state.summaryValues.betValues[betValueKey].bet *
            action.payload.newOddsValue.decimal
          : state.summaryValues.betValues[betValueKey].bet * 1;
        state.summaryValues = {
          ...state.summaryValues,
          betValues: {
            ...state.summaryValues.betValues,
            [betValueKey]: {
              bet: state.summaryValues.betValues[betValueKey].bet,
              toReturn: newValueToReturn,
            },
          },
        };
      }
    },

    clearSummaryValues: (state) => {
      state.summaryValues = initialState.summaryValues;
    },

    resetBetslipState: (state) => ({
      ...initialState,
      openBets: state.openBets,
      openBetsSize: state.openBetsSize,
    }),

    setBetValues: (state, action: PayloadAction<BetValues>) => {
      state.summaryValues = {
        ...state.summaryValues,
        betValues: action.payload,
      };
    },

    setOpenBets: (state, action: PayloadAction<Array<Bet>>) => {
      state.openBets = action.payload;
    },

    setOpenBetsSize: (state, action: PayloadAction<number>) => {
      state.openBetsSize = action.payload;
    },

    setHandledOpenBetsPages: (state, action: PayloadAction<Array<number>>) => {
      state.handledOpenBetsPages = action.payload;
    },

    setMultiBetsStake: (state, action: PayloadAction<any>) => {
      state.multiBetsStake = action.payload;
      state.summaryValues = {
        ...state.summaryValues,
        multiBetsPossibleReturn:
          Math.round(action.payload * state.summaryValues.totalOdds * 100) /
          100,
      };
    },

    setTotalOddsValue: (state, action: PayloadAction<number>) => {
      state.summaryValues = {
        ...state.summaryValues,
        multiBetsPossibleReturn:
          Math.round(action.payload * state.multiBetsStake * 100) / 100,
        totalOdds: action.payload,
      };
    },

    wsBetUpdateOpened: (state, action: any) => {
      const newOpenBet = state.values.find(
        (el) => el?.betId === action.payload.betId,
      );
      const filteredBets = state.values.filter(
        (el) => el?.betId !== action.payload.betId,
      );
      if (newOpenBet) {
        const newOpenBetStake =
          state.summaryValues.betValues[
            newOpenBet.brandMarketId.concat(newOpenBet.selectionId)
          ].bet;
        state.openBets = [
          omit({ ...newOpenBet, stake: newOpenBetStake }, "status"),
          ...state.openBets,
        ];
        state.openBetsSize = state.openBetsSize + 1;
        state.values = filteredBets;

        const newSummaryValues = omit(state.summaryValues.betValues, [
          newOpenBet.brandMarketId.concat(newOpenBet.selectionId),
        ]) as typeof state.summaryValues.betValues;
        state.summaryValues = {
          ...state.summaryValues,
          betValues: newSummaryValues,
        };
      }
    },

    wsBetUpdateCancelled: (state, action: any) => {
      //to change after design approval
      state.values = state.values.map((el) => {
        if (el?.betId === action.payload.betId) {
          return {
            ...el,
            status: Status.Error,
          };
        } else {
          return el;
        }
      });
    },

    wsBetUpdateSettled: (state, action: any) => {
      //to change after design approval
      state.openBets = state.openBets.filter(
        (el) => el?.betId !== action.payload.betId,
      );
    },

    wsBetUpdateFailed: (state, action: any) => {
      state.values = state.values.map((el) => {
        if (el?.betId === action.payload.betId) {
          return {
            ...el,
            status: Status.Error,
            reason: action.payload.reason,
          };
        } else {
          return el;
        }
      });
    },

    setShouldScrollToErrorElement: (state, action: PayloadAction<boolean>) => {
      state.shouldScrollToErrorElement = action.payload;
    },

    setErrorCodes: (
      state,
      action: PayloadAction<Array<{ errorCode: string }>>,
    ) => {
      state.errorCodes = action.payload;
    },

    setIsErrorVisible: (state, action: PayloadAction<boolean>) => {
      state.isErrorVisible = action.payload;
    },

    setSingleBets: (state, action: PayloadAction<Array<BetSlipData>>) => {
      state.singleBets = action.payload;
    },

    setIsListErrorVisible: (state, action: PayloadAction<boolean>) => {
      state.isListErrorVisible = action.payload;
    },

    setIsConfirmationComponentVisible: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isConfirmationComponentVisible = action.payload;
    },

    setIsOddsChangesConfirmed: (state, action: PayloadAction<boolean>) => {
      state.isOddsChangesConfirmed = action.payload;
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
  [K in typeof betSlice.name]: ReturnType<typeof betSlice.reducer>;
};
export const selectBets = (state: SliceState) => state.bets.values;

export const selectSummaryValues = (state: SliceState) =>
  state.bets.summaryValues;

export const selectBetValues = (state: SliceState) =>
  state.bets.summaryValues.betValues;

export const selectOpenBets = (state: SliceState) => state.bets.openBets;

export const selectHandledOpenBetsPages = (state: SliceState) =>
  state.bets.handledOpenBetsPages;

export const selectOpenBetsSize = (state: SliceState) =>
  state.bets.openBetsSize;

export const selectMultiBetsStake = (state: SliceState) =>
  state.bets.multiBetsStake;

export const selectShouldScrollToErrorElement = (state: SliceState) =>
  state.bets.shouldScrollToErrorElement;

export const selectBetslipErrorCodes = (state: SliceState) =>
  state.bets.errorCodes;

export const selectIsBetslipErrorVisible = (state: SliceState) =>
  state.bets.isErrorVisible;

export const selectSingleBets = (state: SliceState) => state.bets.singleBets;

export const selectIsListErrorVisble = (state: SliceState) =>
  state.bets.isListErrorVisible;

export const selectIsConfirmationComponentVisible = (state: SliceState) =>
  state.bets.isConfirmationComponentVisible;

export const selectIsOddsChangesConfirmed = (state: SliceState) =>
  state.bets.isOddsChangesConfirmed;

export const {
  setBets,
  toggleBetElement,
  clearBets,
  clearOpenBets,
  removeBet,
  setSummaryValues,
  clearSummaryValues,
  setBetValues,
  setOpenBets,
  setOpenBetsSize,
  setHandledOpenBetsPages,
  wsBetUpdateOpened,
  wsBetUpdateCancelled,
  wsBetUpdateSettled,
  wsBetUpdateFailed,
  updateBetElementOdds,
  updateSummaryValuesAfterOddsUpdate,
  setMultiBetsStake,
  setTotalOddsValue,
  resetBetslipState,
  setShouldScrollToErrorElement,
  setErrorCodes,
  setIsErrorVisible,
  setSingleBets,
  setIsListErrorVisible,
  setIsConfirmationComponentVisible,
  setIsOddsChangesConfirmed,
} = betSlice.actions;

export default betSlice.reducer;
