'use client';

import { WsMessage } from '../websocket-service';
import {
  wsBetUpdateOpened,
  wsBetUpdateCancelled,
  wsBetUpdateSettled,
  wsBetUpdateFailed
} from '../../store/betSlice';
import type { AppDispatch } from '../../store/store';
import { logger } from '../../logger';

export interface BetUpdateData {
  betId: string;
  state: 'OPENED' | 'CANCELLED' | 'SETTLED' | 'FAILED';
  selectionId?: string;
  brandMarketId?: string;
  selectionName?: string;
  marketName?: string;
  fixtureName?: string;
  fixtureId?: string;
  odds?: { decimal: number; american: string; fractional: string };
  reason?: string;
}

function toBet(data: BetUpdateData) {
  return {
    selectionId: data.selectionId || '',
    brandMarketId: data.brandMarketId || '',
    selectionName: data.selectionName || '',
    marketName: data.marketName || '',
    fixtureName: data.fixtureName || '',
    fixtureId: data.fixtureId || '',
    odds: data.odds || { decimal: 0, american: '0', fractional: '0/0' },
    betId: data.betId,
    status: data.state.toLowerCase(),
  };
}

export const betsHandler = (message: WsMessage, dispatch: AppDispatch) => {
  if (message.event === 'update') {
    const data: BetUpdateData = message.data;

    switch (data.state) {
      case 'OPENED':
        dispatch(wsBetUpdateOpened(toBet(data)));
        break;
      case 'CANCELLED':
        dispatch(wsBetUpdateCancelled({ betId: data.betId }));
        break;
      case 'SETTLED':
        dispatch(wsBetUpdateSettled(toBet(data)));
        break;
      case 'FAILED':
        dispatch(wsBetUpdateFailed({ betId: data.betId, reason: data.reason || '' }));
        break;
      default:
        logger.warn('WS:Bets', 'Unknown bet state', { state: data.state });
    }
  }
};
