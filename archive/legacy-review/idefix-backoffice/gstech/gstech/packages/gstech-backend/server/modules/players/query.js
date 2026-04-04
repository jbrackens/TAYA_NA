/* @flow */
const omit = require('lodash/fp/omit');
const sumBy = require('lodash/fp/sumBy');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const phoneNumber = require('gstech-core/modules/phoneNumber');
const { formatMoney } = require('../core/money');
const { PLAYERS, PLAYER_FIELDS } = require('./Player');
const { getUserRoles } = require('../users/User');
const { WITHDRAWAL_CAN_ACCEPT_DELAY_HOURS, WITHDRAWAL_ACCEPT_DELAY_HOURS } = require('../payments/withdrawals/constants');

export type Tab = 'all' | 'docs' | 'frauds' | 'withdrawals' | 'online' | 'tasks';
export type SearchQuery = {
  text: string,
  type?: string,
  brandId: ?string,
  filters?: {
    closed: boolean,
  },
}

const idQuery = (query: SearchQuery) => (q: Knex$QueryBuilder<any>) => {
  const [brandId, playerId] = query.text.split('_');
  const id = Number(playerId);
  return Number.isNaN(id) ? false : q.where({ 'players.brandId': brandId, 'players.id': id });
};

const tagQuery = (query: SearchQuery) => (q: Knex$QueryBuilder<any>) => {
  if (!/^#/.test(query.text)) {
    return false;
  }
  const tag = query.text.replace(/^#/, '');
  return q.where(pg.raw('exist_inline("tags", ?)', tag));
};

const usernameRE = /^[A-Z]{2}_(.*)\.(.*)_(.*)$/;

const usernameQuery = (query: SearchQuery) => (q: Knex$QueryBuilder<any>) => {
  if (!usernameRE.test(query.text)) {
    return false;
  }
  return q.where(pg.raw('username ilike ?', query.text));
};

const phonenumberQuery = (query: SearchQuery) => (q: Knex$QueryBuilder<any>) => {
  if (!query.text || query.text === '') {
    return false;
  }
  const formatted = phoneNumber.tryParse(query.text);
  if (formatted != null) {
    return q.where('mobilePhone', formatted);
  }
  if (query.text[0] === '+') {
    try {
      const formatted2 = phoneNumber.format(query.text);
      return q.where('mobilePhone', formatted2);
    } catch (e) {
      // Ignore
    }
  }
  return false;
};

const emailQuery = (query: SearchQuery) => (q: Knex$QueryBuilder<any>) => {
  if (query.text.indexOf('@') === -1) {
    return false;
  }
  return q.where(pg.raw('lower(players."email") = ?', query.text.toLowerCase()));
};

const nameQuery = (query: SearchQuery) => (q: Knex$QueryBuilder<any>) => {
  if (query.text === '') {
    return false;
  }
  const tokens = query.text.split('"');
  if (tokens.length === 3) {
    return q.whereRaw('"firstName" || \' \' || "lastName" ilike ?', tokens[1]);
  }
  return q.whereRaw('("firstName" || \' \' || "lastName" <-> ?) < 0.75', query.text).orderBy(pg.raw('"firstName" || \' \' || "lastName" <-> ?', query.text));
};

const closedQuery = (query: SearchQuery, q: Knex$QueryBuilder<any>) => {
  if (query.filters == null || query.filters.closed === false) {
    return q.where('players.accountClosed', false)
            .where('players.accountSuspended', false)
            .where('countries.blocked', false);
  }
  return q;
};

const brandQuery = (query: SearchQuery, q: Knex$QueryBuilder<any>) => {
  if (query.brandId !== undefined) {
    q.where('players.brandId', query.brandId);
  }
};
const docJoins = { 'players.id': 'kyc_documents.playerId', 'kyc_documents.status': pg.raw('\'new\'') };
const fraudJoins = (userRoles: string[]): Knex$QueryBuilderFn<any> => (qb) =>
  qb
    .on('players.id', 'player_frauds.playerId')
    .on('player_frauds.checked', pg.raw('?', false))
    .onIn(
      'fraudKey',
      pg('risks').select('fraudKey').whereIn('requiredRole', userRoles).where({ active: true }),
    );
const paymentJoins = { 'players.id': 'payments.playerId', 'payments.status': pg.raw('\'pending\''), 'payments.paymentType': pg.raw('\'withdraw\'') };
const pendingDepositsJoins = { 'players.id': 'deposits.playerId', 'deposits.status': pg.raw('\'pending\''), 'deposits.paymentType': pg.raw('\'deposit\'') };

const createQuery = (userRoles: string[]) =>
  pg(PLAYERS)
    .leftOuterJoin('kyc_documents', docJoins)
    .leftOuterJoin('player_frauds', fraudJoins(userRoles))
    .leftOuterJoin('payments', paymentJoins);

const findByPlayerId = async (playerId: Id, userId: Id): Promise<?any> => {
  const userRoles = await getUserRoles(userId);
  const player = await createQuery(userRoles).first([
    ...PLAYER_FIELDS.map(field => `${PLAYERS}.${field}`),
    'lastLogin',
    pg.raw('array_agg(DISTINCT jsonb_build_object(\'id\', "kyc_documents"."id", \'name\', "kyc_documents"."name")) as "kycDocuments"'),
    pg.raw('array_agg(DISTINCT jsonb_build_object(\'id\', "payments"."transactionKey", \'amount\', "payments"."amount")) as "withdrawals"'),
    pg.raw('array_remove(array_agg(distinct "player_frauds"."id"), NULL) as "fraudIds"'),
  ])
    .groupBy('players.id')
    .where('players.id', playerId);
  if (player == null) {
    return null;
  }
  const newPlayer = omit(['withdrawals', 'kycDocuments'], player);
  const withdrawals = player.withdrawals.filter(({ id }) => id != null).map(({ id, amount }) => ({ id, amount: formatMoney(amount, player.currencyId) }));
  const kycDocuments = player.kycDocuments.filter(({ id }) => id != null);
  return { ...newPlayer, withdrawals, kycDocuments };
};

const formatPlayer = (player: { withdrawals: Array<{ id: Id, ... }>, currencyId: string, ... }) => {
  const newPlayer = omit(['withdrawals'], player);
  const withdrawals = player.withdrawals.filter(({ id }) => id != null);
  const totalAmount = sumBy('amount', withdrawals);
  return {
    ...newPlayer,
    totalAmount: totalAmount > 0 ? formatMoney(totalAmount, player.currencyId) : 0,
    withdrawals,
  };
};

const findByPlayerIds = async (playerIds: Id[], userId: Id): Promise<any> => {
  const userRoles = await getUserRoles(userId);
  const players = await createQuery(userRoles)
    .leftOuterJoin(pg.raw('(select distinct "playerId" as "playerId" from sessions where "endReason" is null) sessions on players.id = sessions."playerId"'))
    .select([
      ...PLAYER_FIELDS.map(field => `${PLAYERS}.${field}`),
      'lastLogin',
      pg.raw('(count(sessions."playerId") > 0) as online'),
      pg.raw('array_remove(array_agg(distinct "kyc_documents"."id"), NULL) as "kycDocumentIds"'),
      pg.raw('array_remove(array_agg(distinct "player_frauds"."id"), NULL) as "fraudIds"'),
      pg.raw(`array_agg(DISTINCT jsonb_build_object(
        'id', "payments"."transactionKey",
        'amount', "payments"."amount",
        'timestamp', "payments"."timestamp",
        'canAcceptWithDelay', ("payments"."paymentProviderId" IS NULL AND "payments"."timestamp" > now() - (? || ' hours')::interval),
        'delayedAcceptTime', (CASE WHEN "payments"."paymentProviderId" IS NOT NULL THEN "logs"."timestamp" + (? || ' hours')::interval ELSE NULL END)
      )) as "withdrawals"`, [WITHDRAWAL_CAN_ACCEPT_DELAY_HOURS, WITHDRAWAL_ACCEPT_DELAY_HOURS]),
    ])
    .leftJoin(pg.raw('(select distinct on (payment_event_logs."paymentId") payment_event_logs."paymentId", payment_event_logs.timestamp from payment_event_logs where "userId" is not null and status = \'pending\' order by payment_event_logs."paymentId", payment_event_logs.timestamp desc) as logs on logs."paymentId" = payments.id'))
    .groupBy('players.id')
    .whereIn('players.id', playerIds)
    .orderBy(pg.raw('min(payments.timestamp)'));
  return players.map(formatPlayer);
};

const searchPlayers = (q: Knex$QueryBuilder<any>, query: SearchQuery, amount: boolean = false, defaultSorting: boolean = false) => {
  q.select(
    'players.id',
    pg.raw('(count(sessions."playerId") > 0) as online'),
    pg.raw('(count(deposits."playerId") > 0) as "pendingDeposits"'),
    pg.raw('array_remove(array_agg(distinct "kyc_documents"."id"), NULL) as "kycDocumentIds"'),
    pg.raw(`array_agg(DISTINCT jsonb_build_object(
      'id', "payments"."transactionKey",
      'amount', "payments"."amount",
      'timestamp', "payments"."timestamp",
      'canAcceptWithDelay', ("payments"."paymentProviderId" IS NULL AND "payments"."timestamp" > now() - (? || ' hours')::interval),
      'delayedAcceptTime', (CASE WHEN "payments"."paymentProviderId" IS NOT NULL THEN "logs"."timestamp" + (? || ' hours')::interval ELSE NULL END)
    )) as "withdrawals"`, [WITHDRAWAL_CAN_ACCEPT_DELAY_HOURS, WITHDRAWAL_ACCEPT_DELAY_HOURS]),
    pg.raw('array_remove(array_agg(distinct "player_frauds"."id"), NULL) as "fraudIds"'),
    'players.brandId',
    'players.username',
    'players.firstName',
    'players.lastName',
    'players.email',
    'players.currencyId',
    'players.accountSuspended',
    'players.accountClosed',
    'players.gamblingProblem',
  );
  if (amount) {
    q.select(pg.raw('sum("payments"."amount") as "totalAmount"'));
  }

  q.leftJoin(pg.raw('(select distinct on (payment_event_logs."paymentId") payment_event_logs."paymentId", payment_event_logs.timestamp from payment_event_logs where "userId" is not null and status = \'pending\' order by payment_event_logs."paymentId", payment_event_logs.timestamp desc) as logs on logs."paymentId" = payments.id'));
  q.leftJoin('countries', 'countries.id', 'players.countryId');

  const exactMatch = [
    emailQuery(query),
    phonenumberQuery(query),
    idQuery(query),
    usernameQuery(query),
  ].some(op => op(q) !== false);

  if (!exactMatch) {
    closedQuery(query, q);
    const queryMatch = [
      tagQuery(query),
      nameQuery(query),
    ].some(op => op(q) !== false);
    if (!queryMatch && defaultSorting) {
      q.orderBy('players.id', 'desc');
    }
  }

  brandQuery(query, q);
  return q.groupBy('players.id');
};

const doSearch = async (userId: Id, tab: Tab, query: SearchQuery) => {
  const userRoles = await getUserRoles(userId);
  if (tab === 'docs') {
    const q = pg(PLAYERS)
      .innerJoin('kyc_documents', docJoins)
      .leftOuterJoin('player_frauds', fraudJoins(userRoles))
      .leftOuterJoin('payments', paymentJoins)
      .leftOuterJoin('payments as deposits', pendingDepositsJoins)
      .leftOuterJoin(pg.raw('(select distinct "playerId" as "playerId" from sessions where "endReason" is null) sessions on players.id = sessions."playerId"'));
    return searchPlayers(q, query).orderBy(pg.raw('min(kyc_documents."createdAt")'), 'desc').limit(500);
  }
  if (tab === 'frauds' || tab === 'tasks') {
    const q = pg(PLAYERS)
      .leftOuterJoin('kyc_documents', docJoins)
      .innerJoin('player_frauds', fraudJoins(userRoles))
      .innerJoin('risks', 'player_frauds.fraudKey', 'risks.fraudKey')
      .innerJoin('users', 'users.id', pg.raw('?', userId))
      .leftOuterJoin('payments', paymentJoins)
      .leftOuterJoin('payments as deposits', pendingDepositsJoins)
      .leftOuterJoin(pg.raw('(select distinct "playerId" as "playerId" from sessions where "endReason" is null) sessions on players.id = sessions."playerId"'));

    if(query.type) {
      q.where('risks.type', query.type);
    }
    return searchPlayers(q, query)
      .orderBy(pg.raw('max(risks."requiredRole")'))
      .orderBy(pg.raw('min(player_frauds."createdAt")'), 'desc')
      .limit(150);
  }
  if (tab === 'withdrawals') {
    const q = pg(PLAYERS)
      .leftOuterJoin('kyc_documents', docJoins)
      .leftOuterJoin('player_frauds', fraudJoins(userRoles))
      .innerJoin('payments', paymentJoins)
      .leftOuterJoin('payments as deposits', pendingDepositsJoins)
      .leftOuterJoin(pg.raw('(select distinct "playerId" as "playerId" from sessions where "endReason" is null) sessions on players.id = sessions."playerId"'));
    return searchPlayers(q, query).orderBy('pendingDeposits').orderBy(pg.raw('min(payments.timestamp)'));
  }
  if (tab === 'online') {
    const q = pg(PLAYERS)
      .innerJoin('sessions', (qb) =>
        qb.on('sessions.playerId', 'players.id').onNull('sessions.endReason'),
      )
      .leftOuterJoin('kyc_documents', docJoins)
      .leftOuterJoin('player_frauds', fraudJoins(userRoles))
      .leftOuterJoin('payments', paymentJoins)
      .leftOuterJoin('payments as deposits', pendingDepositsJoins);
    return searchPlayers(q, query).orderBy(pg.raw('max(sessions.timestamp)'), 'desc');
  }
  const q = pg(PLAYERS)
    .leftOuterJoin('kyc_documents', docJoins)
    .leftOuterJoin('player_frauds', fraudJoins(userRoles))
    .leftOuterJoin('payments', paymentJoins)
    .leftOuterJoin('payments as deposits', pendingDepositsJoins)
    .leftOuterJoin(pg.raw('(select distinct "playerId" as "playerId" from sessions where "endReason" is null) sessions'), 'players.id', 'sessions.playerId');
  return searchPlayers(q, query, false, true).groupBy('players.id').limit(150);
};

const search = async (userId: Id, tab: Tab, query: SearchQuery): Promise<any> => {
  logger.debug('search', tab, query, userId);
  const result = await doSearch(userId, tab, query);
  return result.map(formatPlayer);
};

module.exports = { search, findByPlayerId, findByPlayerIds };
