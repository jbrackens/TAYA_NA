'use client';

import type { AppDispatch } from '../../store/store';
import { WsMessage } from '../websocket-service';
import { addFixtureUpdate, removeFixtureUpdate } from '../../store/fixtureSlice';

export interface FixtureUpdateData {
  fixtureId: string;
  score?: {
    homeScore: number;
    awayScore: number;
  };
  status: string;
  startTime: string;
  [key: string]: unknown;
}

export const fixturesHandler = (message: WsMessage, dispatch: AppDispatch) => {
  if (message.event === 'update') {
    const data: FixtureUpdateData = message.data;
    // fixtureSlice expects { id, name, score: { home, away }, status, startTime }
    dispatch(addFixtureUpdate({
      id: data.fixtureId,
      name: data.fixtureId, // WS doesn't always send name; use ID as fallback
      score: data.score ? { home: data.score.homeScore, away: data.score.awayScore } : { home: 0, away: 0 },
      status: data.status,
      startTime: data.startTime,
    }));
  } else if (message.event === 'unsubscribe:success') {
    // Remove fixture from updates when unsubscribed
    // removeFixtureUpdate expects a plain string (the fixture ID)
    const fixtureId = message.data?.fixtureId;
    if (fixtureId) {
      dispatch(removeFixtureUpdate(fixtureId));
    }
  }
};
