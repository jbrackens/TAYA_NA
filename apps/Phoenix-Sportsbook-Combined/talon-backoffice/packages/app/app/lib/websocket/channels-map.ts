'use client';

import type { AppDispatch } from '../store/store';
import { WsMessage } from './websocket-service';
import { marketsHandler } from './handlers/markets-handler';
import { betsHandler } from './handlers/bets-handler';
import { fixturesHandler } from './handlers/fixtures-handler';
import { walletsHandler } from './handlers/wallets-handler';

type ChannelHandler = (message: WsMessage, dispatch: AppDispatch) => void;

export const channelsMap: Record<string, ChannelHandler> = {
  'market': marketsHandler,
  'bets': betsHandler,
  'fixture': fixturesHandler,
  'wallets': walletsHandler
};

export const getChannelHandler = (channel: string): ChannelHandler | undefined => {
  return channelsMap[channel];
};
