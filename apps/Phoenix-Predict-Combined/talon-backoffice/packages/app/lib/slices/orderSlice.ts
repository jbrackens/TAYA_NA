import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PredictionOrder, Position, PortfolioSummary } from '@phoenix-ui/api-client/src/prediction-types';

interface OrderState {
  orders: PredictionOrder[];
  positions: Position[];
  portfolioSummary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  positions: [],
  portfolioSummary: null,
  loading: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setOrders(state, action: PayloadAction<PredictionOrder[]>) {
      state.orders = action.payload;
    },
    addOrder(state, action: PayloadAction<PredictionOrder>) {
      state.orders.unshift(action.payload);
    },
    updateOrder(state, action: PayloadAction<PredictionOrder>) {
      const idx = state.orders.findIndex(o => o.id === action.payload.id);
      if (idx >= 0) {
        state.orders[idx] = action.payload;
      }
    },
    setPositions(state, action: PayloadAction<Position[]>) {
      state.positions = action.payload;
    },
    setPortfolioSummary(state, action: PayloadAction<PortfolioSummary>) {
      state.portfolioSummary = action.payload;
    },
  },
});

export const {
  setLoading: setOrderLoading,
  setError: setOrderError,
  setOrders,
  addOrder,
  updateOrder,
  setPositions,
  setPortfolioSummary,
} = orderSlice.actions;

export default orderSlice.reducer;
