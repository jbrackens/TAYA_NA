'use client';

import { WsMessage } from '../websocket-service';
import { addMarketUpdate, removeMarketUpdate } from '../../store/marketSlice';
import type { AppDispatch } from '../../store/store';

export interface MarketUpdateData {
  marketId: string;
  marketName: string;
  marketStatus: string;
  marketType: string;
  selectionOdds: Array<{ selectionId: string; selectionName: string; odds: { decimal: number; american: string; fractional: string } }>;
  specifiers?: Record<string, unknown>;
}

export const marketsHandler = (message: WsMessage, dispatch: AppDispatch) => {
  if (message.event === 'update') {
    // Live odds update - handles market updates with selection odds
    const data: MarketUpdateData = message.data;
    dispatch(addMarketUpdate({
      marketId: data.marketId,
      marketName: data.marketName,
      marketStatus: {
        changeReason: { status: data.marketStatus, type: 'update' },
        type: data.marketStatus
      },
      marketType: data.marketType,
      selectionOdds: data.selectionOdds,
      specifiers: {
        variant: data.specifiers?.variant as string | undefined,
        way: data.specifiers?.way as string | undefined,
      }
    }));
  } else if (message.event === 'unsubscribe:success') {
    // Remove market from updates when unsubscribed
    const marketId = message.data?.marketId;
    if (marketId) {
      dispatch(removeMarketUpdate(marketId));
    }
  }
};
