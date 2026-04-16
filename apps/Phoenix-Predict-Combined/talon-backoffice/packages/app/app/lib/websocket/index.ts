'use client';

// Export WebSocket service
export { wsService, default } from './websocket-service';
export type { WsEventType, WsMessage, MessageHandler } from './websocket-service';

// Export React hook
export { useWebSocket } from './useWebSocket';
export type { UseWebSocketOptions, UseWebSocketReturn } from './useWebSocket';

// Export response data manager
export { ResponseDataManager } from './response-data-manager';

// Export channels map
export { channelsMap, getChannelHandler } from './channels-map';

// Export handler types
export type { MarketUpdateData } from './handlers/markets-handler';
export type { BetUpdateData } from './handlers/bets-handler';
export type { FixtureUpdateData } from './handlers/fixtures-handler';
export type { WalletUpdateData } from './handlers/wallets-handler';
