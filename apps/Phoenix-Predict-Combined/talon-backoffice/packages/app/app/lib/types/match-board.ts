export interface BoardEvent {
  eventId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  sportKey: string;
  leagueKey: string;
  startTime: string;
  status: string;
  hasMarkets: boolean;
}

export interface LiveBoardMatch extends BoardEvent {
  homeScore: number;
  awayScore: number;
  sportName: string;
}

export type UpcomingBoard = Record<string, BoardEvent[]>;
export type LiveBoard = Record<string, LiveBoardMatch[]>;
