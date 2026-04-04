'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface Odds {
  decimal: number;
  american: string;
  fractional: string;
}

interface SelectionOdd {
  selectionId: string;
  selectionName: string;
  odds: Odds;
}

interface MarketStatus {
  changeReason: {
    status: string;
    type: string;
  };
  type: string;
}

interface MarketUpdate {
  marketId: string;
  marketName: string;
  marketStatus: MarketStatus;
  marketType: string;
  selectionOdds: SelectionOdd[];
  specifiers: {
    variant?: string;
    way?: string;
  };
}

// Track per-selection odds movement direction
export type OddsMovement = 'up' | 'down' | 'none';

export interface SelectionMovement {
  selectionId: string;
  direction: OddsMovement;
  timestamp: number; // ms — used by UI to expire flash after ~2s
}

interface MarketState {
  values: {
    [key: string]: MarketUpdate;
  };
  /** Previous decimal odds keyed by "marketId:selectionId" */
  previousOdds: {
    [key: string]: number;
  };
  /** Active movement indicators keyed by "marketId:selectionId" */
  movements: {
    [key: string]: SelectionMovement;
  };
}

const initialState: MarketState = {
  values: {},
  previousOdds: {},
  movements: {},
};

const marketSlice = createSlice({
  name: 'markets',
  initialState,
  reducers: {
    addMarketUpdate: (state, action: PayloadAction<MarketUpdate>) => {
      const update = action.payload;
      const prev = state.values[update.marketId];

      // Compute movement per selection by comparing to previous odds
      if (prev && prev.selectionOdds && update.selectionOdds) {
        for (const sel of update.selectionOdds) {
          const key = `${update.marketId}:${sel.selectionId}`;
          const prevOdds = state.previousOdds[key];
          const newOdds = typeof sel.odds?.decimal === 'number' && !isNaN(sel.odds.decimal) ? sel.odds.decimal : 0;

          if (typeof prevOdds === 'number' && prevOdds > 0 && newOdds !== prevOdds && newOdds > 0) {
            state.movements[key] = {
              selectionId: sel.selectionId,
              direction: newOdds > prevOdds ? 'up' : 'down',
              timestamp: Date.now(),
            };
          }
          if (newOdds > 0) {
            state.previousOdds[key] = newOdds;
          }
        }
      } else if (update.selectionOdds) {
        // First time seeing this market — seed previousOdds, no movement
        for (const sel of update.selectionOdds) {
          const key = `${update.marketId}:${sel.selectionId}`;
          const newOdds = sel.odds?.decimal ?? 0;
          if (newOdds > 0) {
            state.previousOdds[key] = newOdds;
          }
        }
      }

      state.values[update.marketId] = update;
    },
    removeMarketUpdate: (state, action: PayloadAction<string>) => {
      const marketId = action.payload;
      // Clean up movements and previousOdds for this market
      for (const key of Object.keys(state.previousOdds)) {
        if (key.startsWith(`${marketId}:`)) {
          delete state.previousOdds[key];
          delete state.movements[key];
        }
      }
      delete state.values[marketId];
    },
    /** Called by UI after flash animation completes (~2s) to clear stale movements */
    clearMovement: (state, action: PayloadAction<string>) => {
      delete state.movements[action.payload];
    },
    clearAllMovements: (state) => {
      state.movements = {};
    },
  },
});

export const { addMarketUpdate, removeMarketUpdate, clearMovement, clearAllMovements } = marketSlice.actions;

// Selectors
export const selectMarkets = (state: RootState) => state.markets.values;
export const selectMovements = (state: RootState) => state.markets.movements;
export const selectMovement = (key: string) => (state: RootState) => state.markets.movements[key];

export default marketSlice.reducer;
