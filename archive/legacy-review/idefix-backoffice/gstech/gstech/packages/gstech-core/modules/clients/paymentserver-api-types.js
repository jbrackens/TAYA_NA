/* @flow */
import type { PaymentProvider } from '../constants';
import type { Account, Deposit, Withdrawal, Brand, PartialLogin } from '../types/backend';
import type { PlayerWithDetails, Player } from '../types/player';

export type ClientInfo = { ipAddress: IPAddress, userAgent: string, isMobile: boolean };

export type DepositRequest = {
  player: PlayerWithDetails,
  deposit: Deposit,
  params: any,
  account?: Account,
  brand: Brand,
  urls: URLFork,
  client: ClientInfo,
};

export type DepositResponse = (URLResponse | HTMLResponse);

export type WithdrawRequest = {
  player: PlayerWithDetails,
  withdrawal: Withdrawal,
  brand: Brand,
  user: {
    handle: string,
    name: string,
  },
  client: ClientInfo,
};

export type WithdrawResponse = {
  ok: boolean,
  message: string,
  id?: string,
  reject?: boolean,
  complete?: boolean,
  transaction?: any,
  parameters?: mixed,
};

export type IdentifyRequest = {
  player: PlayerWithDetails,
  identify: {
    paymentProvider: PaymentProvider,
  },
  brand: Brand,
  urls: URLFork,
};

export type IdentifyResponse = (URLResponse | HTMLResponse);

export type RegisterRequest = {
  // $FlowFixMe[deprecated-utility]
  player: $Shape<Player>,
  deposit: PartialLogin,
  brand: Brand,
  urls: URLFork,
  client: ClientInfo,
};

export type RegisterResponse =
  | URLResponse
  | HTMLResponse
  | { ...URLResponse | HTMLResponse, parameters?: any };

export type LoginRequest = {
  // $FlowFixMe[deprecated-utility]
  player: $Shape<Player>,
  deposit: PartialLogin,
  brand: Brand,
  urls: URLFork,
  client: ClientInfo,
};

export type LoginResponse =
  | URLResponse
  | HTMLResponse
  | { ...URLResponse | HTMLResponse, parameters?: any };
