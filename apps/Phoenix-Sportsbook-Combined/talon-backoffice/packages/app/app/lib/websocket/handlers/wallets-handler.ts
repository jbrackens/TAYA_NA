'use client';

import type { AppDispatch } from '../../store/store';
import { WsMessage } from '../websocket-service';
import { setCurrentBalance, setBalanceUpdateNeeded } from '../../store/cashierSlice';

export interface WalletUpdateData {
  balance: number;
  currency?: string;
  [key: string]: unknown;
}

export const walletsHandler = (message: WsMessage, dispatch: AppDispatch) => {
  if (message.event === 'update') {
    const data: WalletUpdateData = message.data;
    dispatch(setCurrentBalance(data.balance));
    dispatch(setBalanceUpdateNeeded(false));
  }
};
