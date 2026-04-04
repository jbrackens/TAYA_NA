/* @flow */
import type { Player } from '../../modules/clients/backend-wallet-api';
import type { GameProvider } from '../../modules/constants';

export type Game = {| // TODO: this should DB type
  id: Id,
  gameId: string,
  name: string,
  manufacturerId: GameProvider,
  manufacturerGameId: string,
  mobileGame: boolean,
  permalink: string,
|};

export type Session = {|
  sessionId: string,
  type?: string,
  parameters?: mixed,
  manufacturerId?: string,
|};

export type GameLaunchInfo = {
  game: {
    html?: string,
    parameters?: mixed,
    url?: string,
  },
};

export type DemoGameLaunchInfo = {
} & GameLaunchInfo;

export type RealGameLaunchInfo = {
  session?: Session,
} & GameLaunchInfo;

export type GameLaunchResult = {
  game: {
    html: string
  },
  session?: Session,
};

export type GameInfo = {
  manufacturerGameId: string,
  gameId: string,
};

export type LaunchGameRequest = {
  player: Player,
  game: Game,
  sessions: Session[],
  sessionId: Id,
  parameters: any,
  playTimeInMinutes: number,
  client: ClientInfo,
};

export type LaunchDemoGameRequest = {
  languageId: string,
  currencyId: string,
  game: Game,
  parameters: any,
  client: ClientInfo,
};

export type CreditFreeSpinsRequest = {|
  player: Player,
  sessionId: Id,
  bonusCode: string,
  id: string,
  client: ClientInfo,
|};

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
