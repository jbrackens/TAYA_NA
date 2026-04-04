/* @flow */
import type { PaymentProvider } from '../../modules/constants';
import type { Account, Deposit, Withdrawal, Brand } from '../../modules/types/backend';
import type { Player } from '../../modules/types/player';

export type ClientInfo = { ipAddress: IPAddress, userAgent: string, isMobile: boolean };

export type DepositRequest = {|
  player: Player,
  deposit: Deposit,
  params: any,
  account?: Account,
  brand: Brand,
  urls: URLFork,
  client: ClientInfo,
|};

export type DepositResponse = (URLResponse | HTMLResponse);

export type WithdrawRequest = {|
  player: Player,
  withdrawal: Withdrawal,
  brand: Brand,
  user: {|
    handle: string,
    name: string,
  |},
  client: ClientInfo,
|};

export type WithdrawResponse = {|
  ok: boolean,
  message: string,
  id?: string,
  reject?: boolean,
  complete?: boolean,
  transaction?: any,
  parameters?: mixed,
|};

export type IdentifyRequest = {|
  player: Player,
  identify: {|
    paymentProvider: PaymentProvider,
  |},
  brand: Brand,
  urls: URLFork,
|};

export type IdentifyResponse = (URLResponse | HTMLResponse);

export type RegisterRequest = {|
  player: $Shape<Player>,
  deposit: Deposit,
  brand: Brand,
  urls: URLFork,
  client: ClientInfo,
|};

export type RegisterResponse = (URLResponse | HTMLResponse);
