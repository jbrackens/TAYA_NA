/* @flow */
import type { Player } from '../types/player';
import type { ClientInfo } from './paymentserver-api-types';
import type { GameProvider } from '../constants';

export type Game = {
  // TODO: this should DB type
  id: Id,
  gameId: string,
  name: string,
  manufacturerId: GameProvider,
  manufacturerGameId: string,
  mobileGame: boolean,
  permalink: string,
};

export type Session = {
  sessionId: string,
  type?: string,
  parameters?: mixed,
  manufacturerId?: string,
};

export type GameLaunchInfo = {
  game: {
    html?: string,
    parameters?: mixed,
    url?: string,
    ...
  },
};

export type DemoGameLaunchInfo = {
  session?: Session,
  ...Partial<GameLaunchInfo>
}

export type RealGameLaunchInfo = {
  session?: Session,
  ...GameLaunchInfo,
};

export type GameLaunchResult = {
  game: {
    html: string,
  },
  session?: Session,
};

export type GameInfo = {
  manufacturerGameId: string,
  gameId: string,
};

export type GameLaunchOptions = {
  lobbyUrl: string,
  gameUrl: string,
  bankingUrl: string,
  mobile: boolean,
  forceIframe: boolean,
  options: {
    [key: string]: boolean | string,
  },
};

export type LaunchGameRequest = {
  player: Player,
  game: Game,
  sessions: Session[],
  sessionId: Id,
  parameters: GameLaunchOptions,
  playTimeInMinutes: number,
  client: ClientInfo,
};

export type LaunchDemoGameRequest = {
  languageId: string,
  currencyId: string,
  game: Game,
  parameters: GameLaunchOptions,
  client: ClientInfo,
};

export type CreditFreeSpinsRequest = {
  player: Player,
  sessionId: Id,
  bonusCode: string,
  metadata?: {
    [key: string]: any,
  },
  spinValue?: ?Money,
  spinType?: ?string,
  spinCount?: ?number,
  id: string,
  client: ClientInfo,
  games: {
    manufacturerGameId: string,
    mobileGame: boolean,
  }[],
};

export type CreditFreeSpinsResponse = {
  ok: boolean,
  externalId?: string,
  expires?: Date
};

export type CreateFreeSpinsRequest = {
  bonusCode: string,
  tableId: string,
};

export type CreateFreeSpinsResponse = {
  campaignId: string,
}

export type GetJackpotsRequest = {
  games: GameInfo[],
  currencies: string[],
};

export type GetJackpotsResponse = {
  game: string,
  currencies: {
    amount: string,
    currency: string,
  }[],
}[];

export type GetLeaderBoardResponse = {
  bet: { amount: string, amountCurrencyISOCode: string },
  qualified: boolean,
  rounds: number,
  score: string,
  userName: string,
  win: { amount: string, amountCurrencyISOCode: string },
}[];
