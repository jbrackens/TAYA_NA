/* @flow */
import type { PlayerIdentifier } from 'gstech-core/modules/types/player';
import type { Deposit, Withdrawal } from 'gstech-core/modules/types/backend';
import type { RawTransaction } from '../../game_round/GameRound';

const { parse } = require('postgres-array');
const { compact } = require('lodash');

export type PlayerForOptimove = {
  ...PlayerIdentifier,
  createdAt: Date,
  email: string,
  mobilePhone: string,
  dateOfBirth: string,
  allowSMSPromotions: boolean,
  allowEmailPromotions: boolean,
  registrationSource?: string,
  loginBlocked: boolean,
  testPlayer: boolean,
  username: string,
  countryId: string,
  currencyId: string,
  firstName: string,
  lastName: string,
  affiliateId: string,
  languageId: string,
  activated: boolean,
  accountClosed: boolean,
  accountSuspended: boolean,
  gamblingProblem: boolean,
  activeLimits: string[],
  registrationSource: ?string,
  balance?: any,
  reservedBalance?: any,
  bonusBalance?: any,
};

export type GameForOptimove = {
  gameId: Id,
  name: string,
  profile: string,
};

export type GameRoundForOptimove = {
  gameRoundId: Id,
  timestamp: Date,
  playerId: Id,
  game: GameForOptimove,
  brandId?: BrandId,
  transactions: RawTransaction[],
  // transactions: {...RawTransaction, ...}[],
};

const getPlayer = async (id: Id, tx: Knex): Promise<PlayerForOptimove> =>
  tx('players')
    .leftJoin('player_limits', (qb) =>
      qb
        .on('players.id', '=', 'player_limits.playerId')
        .onIn('type', ['exclusion', 'timeout'])
        .on(tx.raw('active = true'))
        .on(tx.raw('(expires > now() or (expires is null and permanent = true))')),
    )
    .first([
      'players.id',
      'players.brandId',
      'players.createdAt',
      'players.email',
      'players.mobilePhone',
      'players.dateOfBirth',
      'players.allowEmailPromotions',
      'players.allowSMSPromotions',
      'players.loginBlocked',
      'players.testPlayer',
      'players.username',
      'players.countryId',
      'players.currencyId',
      'players.firstName',
      'players.lastName',
      'players.affiliateId',
      'players.languageId',
      'players.activated',
      'players.accountClosed',
      'players.accountSuspended',
      'players.gamblingProblem',
      'players.registrationSource',
      'players.balance',
      'players.reservedBalance',
      'players.bonusBalance',
      tx.raw('array_agg(distinct ??) as "activeLimits"', 'player_limits.type'),
    ])
    .where({ 'players.id': id })
    .groupBy('players.id')
    .then((player) => ({ ...player, activeLimits: compact(parse(player.activeLimits)) }));

const getDeposit = (transactionKey: string, tx: Knex): Knex$QueryBuilder<Deposit> =>
  tx('payments')
    .first(
      'payments.transactionKey',
      'payments.id as paymentId',
      'payments.playerId',
      'payments.timestamp',
      'payments.status',
      'payments.amount',
    )
    .where({ transactionKey });

const getWithdrawal = (id: Id, tx: Knex): Knex$QueryBuilder<Withdrawal> =>
  tx('payments')
    .first(
      'payments.transactionKey',
      'payments.id as paymentId',
      'payments.playerId',
      'payments.timestamp',
      'payments.status',
      'payments.amount',
    )
    .where({
      'payments.id': id,
      'payments.paymentType': 'withdraw',
    });

const getGame = (gameId: Id, tx: Knex): Knex$QueryBuilder<GameForOptimove> =>
  tx('brand_game_profiles')
    .leftJoin('games', 'games.id', 'brand_game_profiles.gameId')
    .leftJoin('game_profiles', 'game_profiles.id', 'brand_game_profiles.gameProfileId')
    .first('games.id as gameId', 'games.name', 'game_profiles.name as profile')
    .where('games.id', gameId);

const findRoundTransactions = async (
  gameRoundId: Id,
  playerId: ?Id,
  tx: Knex,
): Promise<RawTransaction[]> =>
  tx('transactions')
    .select(
      'transactions.id as transactionId',
      'transactions.timestamp',
      'transactions.type',
      'transactions.amount',
      'transactions.bonusAmount',
      'transactions.balance',
      'transactions.bonusBalance',
    )
    .where({ gameRoundId })
    .modify((qb) => (playerId ? qb.where({ playerId }) : qb))
    .orderBy('subTransactionId', 'desc');

module.exports = {
  getPlayer,
  getDeposit,
  getWithdrawal,
  getGame,
  findRoundTransactions,
};
