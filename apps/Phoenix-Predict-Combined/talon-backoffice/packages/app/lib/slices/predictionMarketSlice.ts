import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PredictionMarket, DiscoveryResponse } from '@phoenix-ui/api-client/src/prediction-types';

interface PriceMovement {
  direction: 'up' | 'down';
  timestamp: number;
}

interface PredictionMarketState {
  markets: Record<string, PredictionMarket>;
  discovery: DiscoveryResponse | null;
  priceMovements: Record<string, PriceMovement>; // keyed by marketId
  loading: boolean;
  error: string | null;
}

const initialState: PredictionMarketState = {
  markets: {},
  discovery: null,
  priceMovements: {},
  loading: false,
  error: null,
};

const predictionMarketSlice = createSlice({
  name: 'predictionMarket',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setDiscovery(state, action: PayloadAction<DiscoveryResponse>) {
      state.discovery = action.payload;
      // Index all markets from discovery
      for (const m of [...action.payload.featured, ...action.payload.trending,
                        ...action.payload.closingSoon, ...action.payload.recent]) {
        state.markets[m.id] = m;
      }
    },
    setMarket(state, action: PayloadAction<PredictionMarket>) {
      const m = action.payload;
      const prev = state.markets[m.id];
      // Track price movement
      if (prev && prev.yesPriceCents !== m.yesPriceCents) {
        state.priceMovements[m.id] = {
          direction: m.yesPriceCents > prev.yesPriceCents ? 'up' : 'down',
          timestamp: Date.now(),
        };
      }
      state.markets[m.id] = m;
    },
    setMarkets(state, action: PayloadAction<PredictionMarket[]>) {
      for (const m of action.payload) {
        state.markets[m.id] = m;
      }
    },
    updatePrice(state, action: PayloadAction<{ marketId: string; yesPriceCents: number }>) {
      const { marketId, yesPriceCents } = action.payload;
      const market = state.markets[marketId];
      if (market) {
        const prevPrice = market.yesPriceCents;
        market.yesPriceCents = yesPriceCents;
        market.noPriceCents = 100 - yesPriceCents;
        if (prevPrice !== yesPriceCents) {
          state.priceMovements[marketId] = {
            direction: yesPriceCents > prevPrice ? 'up' : 'down',
            timestamp: Date.now(),
          };
        }
      }
    },
    clearMovement(state, action: PayloadAction<string>) {
      delete state.priceMovements[action.payload];
    },
  },
});

export const {
  setLoading,
  setError,
  setDiscovery,
  setMarket,
  setMarkets,
  updatePrice,
  clearMovement,
} = predictionMarketSlice.actions;

export default predictionMarketSlice.reducer;
