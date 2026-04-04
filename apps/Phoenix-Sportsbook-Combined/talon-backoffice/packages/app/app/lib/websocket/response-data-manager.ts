'use client';

import type { AppDispatch } from '../store/store';
import { WsMessage } from './websocket-service';
import { getChannelHandler } from './channels-map';
import { logger } from '../logger';

export class ResponseDataManager {
  private dispatch: AppDispatch;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  handleMessage(message: WsMessage): void {
    // Route update events through the channels map
    if (message.event === 'update') {
      const handler = getChannelHandler(message.channel);
      if (handler) {
        handler(message, this.dispatch);
      } else {
        logger.warn('WS', 'No handler found for channel', { channel: message.channel });
      }
    } else {
      // Handle other event types (subscribe:success, unsubscribe:success, error, etc.)
      const handler = getChannelHandler(message.channel);
      if (handler) {
        handler(message, this.dispatch);
      }
    }
  }

  setDispatch(dispatch: AppDispatch): void {
    this.dispatch = dispatch;
  }
}
