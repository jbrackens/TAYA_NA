/* @flow */
import type { PlayerWithDetails, Player, PlayerDraft, RiskProfile, PlayerWithRisk, SowState, CommunicationMethodStatus } from 'gstech-core/modules/types/player';
import type { Balance } from 'gstech-core/modules/types/backend';
import type { ClientInfo } from 'gstech-core/modules/clients/paymentserver-api-types';

const _ = require('lodash');
const moment = require('moment');
const bcrypt = require('bcrypt');
const pickBy = require('lodash/fp/pickBy');
const pick = require('lodash/pick');
const includes = require('lodash/fp/includes');
const hstore = require('hstore.js');
const isEmpty = require('lodash/fp/isEmpty');
const omit = require('lodash/fp/omit');
const trim = require('lodash/fp/trim');
const mapValues = require('lodash/mapValues');
const contains = require('lodash/fp/contains');
const keys = require('lodash/fp/keys');
const isNil = require('lodash/isNil');
const PhoneNumber = require('gstech-core/modules/phoneNumber');
const complianceApi = require('gstech-core/modules/clients/complianceserver-api');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const Notification = require('../core/notifications');
const EEG = require('../core/notifications-eeg');
const { formatMoney } = require('../core/money');
const { addEvent, addNote } = require('./PlayerEvent');
const { personPlayerIdsQuery, getConnectedPlayers } = require('../persons/Person');
const clean = require('./clean');
const Optimove = require('../core/optimove');

export type AccountStatus = {
  verified: boolean,
  activated: boolean,
  allowGameplay: boolean,
  preventLimitCancel: boolean,
  allowTransactions: boolean,
  loginBlocked: boolean,
  accountClosed: boolean,
  accountSuspended: boolean,
  gamblingProblem: boolean,
  riskProfile: RiskProfile,
  depositLimitReached: ?Date,
  documentsRequested: boolean,
  pep: boolean,
  modified: {
    [key: string]: {
      timestamp: Date,
      name: string,
    },
  },
};

export type AccountStatusDraft = {
  verified?: boolean,
  activated?: boolean,
  allowGameplay?: boolean,
  preventLimitCancel?: boolean,
  allowTransactions?: boolean,
  loginBlocked?: boolean,
  accountClosed?: boolean,
  accountSuspended?: boolean,
  riskProfile?: RiskProfile,
  pep?: boolean,
}

export type BalanceWithGameplay = {
  allowGameplay: boolean,
  accountSuspended: boolean,
  defaultConversion: Money,
} & Balance;

export type LifetimeDepositsAmount = {
  total: number,
}

const CROSS_BRAND_TAGS = ['fail-sow', 'pass-sow'];
const PLAYERS = 'players';
const PLAYER_FIELDS = [
  'id',
  'brandId',
  'username',
  'email',
  'firstName',
  'lastName',
  'address',
  'postCode',
  'city',
  'mobilePhone',
  'countryId',
  'dateOfBirth',
  'languageId',
  'nationalId',
  'currencyId',
  'allowEmailPromotions',
  'allowSMSPromotions',
  'gamblingProblem',
  'accountClosed',
  'accountSuspended',
  'testPlayer',
  'createdAt',
  'activated',
  'verified',
  'tcVersion',
  'placeOfBirth',
  'nationality',
  'additionalFields',
  'affiliateRegistrationCode',
];

const PLAYER_INSERT_FIELDS = [...PLAYER_FIELDS, 'registrationSource', 'emailStatus', 'mobilePhoneStatus', 'tcVersion', 'partial', 'ipAddress', 'hash', 'affiliateId'];

const PLAYER_UPDATE_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'address',
  'postCode',
  'city',
  'mobilePhone',
  'countryId',
  'dateOfBirth',
  'languageId',
  'nationalId',
  'allowEmailPromotions',
  'allowSMSPromotions',
  'activated',
  'testPlayer',
  'emailStatus',
  'mobilePhoneStatus',
  'tcVersion',
  'placeOfBirth',
  'nationality',
  'additionalFields',
  'realityCheckMinutes',
];

const trimWhitespace = (value: string) => trim(value).replace(/\s+/g, ' ');

const cleanWhitespace = (playerDraft: any) =>
  mapValues(playerDraft, (value, key) =>
    contains(key, ['firstName', 'lastName', 'address', 'postCode', 'city'])
      ? trimWhitespace(value)
      : value,
  );

const createRegistrationCommons = async (playerId: Id, playerDraft: PlayerDraft & { brandId: BrandId }) => {
  const { brandId, firstName, lastName, email, password } = playerDraft;
  const result: any = {};
  if (firstName && lastName) {
    const usernameBase = `${brandId}_${clean(firstName)}.${clean(lastName)}`;
    result.username = `${usernameBase.substring(0, 30)}_${playerId}`;
  }
  if (password) {
    if (password.toLowerCase() === email.toLowerCase())
      throw new Error('Invalid password');
    result.hash = await bcrypt.hash(password, 10);
  }
  return result;
};

const checkEmailFraud = async (email: string): Promise<boolean> => {
  try {
    const data = await complianceApi.emailCheck(email);
    if (data) return data.ok;
    return true;
  } catch (err) {
    logger.error('XXX checkEmailFraud', { err });
    return true;
  }
}

const addPlayerCreationEvents = async (playerId: Id, playerDraft: PlayerDraft, tx: Knex$Transaction<void>) => {
  await Notification.playerCheck(playerId, playerDraft.ipAddress);
  await addEvent(playerId, null, 'account', 'players.allowEmailPromotions', { value: playerDraft.allowEmailPromotions }).transacting(tx);
  await addEvent(playerId, null, 'account', 'players.allowSMSPromotions', { value: playerDraft.allowSMSPromotions }).transacting(tx);
  await addEvent(playerId, null, 'account', 'players.tcVersion', { value: playerDraft.tcVersion }).transacting(tx);
};

const create = async (playerDraft: PlayerDraft & { brandId: BrandId }): Promise<Player> =>
  pg.transaction(async (tx) => {
    const { rows: [{ id }] } = await tx.raw("select nextval('players_id_seq') as id");
    const commons = await createRegistrationCommons(id, playerDraft);

    const fullDraft = { ...playerDraft, ...commons, id };
    delete fullDraft.password;
    const p = cleanWhitespace(pick(fullDraft, PLAYER_INSERT_FIELDS));
    const [player] = await tx(PLAYERS).insert(p, PLAYER_INSERT_FIELDS);
    await addPlayerCreationEvents(id, player, tx);
    return player;
  });

// $FlowFixMe[deprecated-utility]
const createPartial = async (playerDraft: Partial<{ brandId: BrandId, ...PlayerDraft}>): Promise<$Shape<Player>> => pg.transaction(async (tx) => {
  const { rows: [{ id }] } = await tx.raw("select nextval('players_id_seq') as id");
  if (!playerDraft.brandId) throw new Error('Missing required fields');
  // $FlowFixMe[incompatible-call]
  const usernameBase = `${playerDraft.brandId}_${clean(playerDraft.firstName)}.${clean(playerDraft.lastName)}`;
  const username = `${usernameBase.substring(0, 30)}_${id}`;
  const fullDraft = { ...playerDraft, id, partial: true, accountClosed: true, allowGameplay: false, username };
  delete fullDraft.password;
  const [player] = await tx(PLAYERS).insert(cleanWhitespace(fullDraft), PLAYER_INSERT_FIELDS);
  await addEvent(player.id, null, 'account', 'players.tcVersion', { value: playerDraft.tcVersion }).transacting(tx);
  return player;
});

const updatePartial = async (playerId: Id, playerDraft: Partial<PlayerDraft>): Promise<Partial<Player>> => pg.transaction(async (tx) => {
  const player = await tx(PLAYERS).first(PLAYER_INSERT_FIELDS).where({ id: playerId, partial: true });
  const draft = { ...player, ...cleanWhitespace(playerDraft) };
  const commons = await createRegistrationCommons(playerId, draft);
  const fullDraft = { ...draft, ...commons };
  delete fullDraft.password;
  const res = await tx(PLAYERS).update(fullDraft, PLAYER_INSERT_FIELDS).where({ id: playerId, partial: true }).returning('*');
  return res;
});

const completePartial = async (playerId: Id, playerDraft: Partial<PlayerDraft>): Promise<Player> => pg.transaction(async (tx) => {
  const partialPlayer = await tx(PLAYERS).first(PLAYER_INSERT_FIELDS).where({ id: playerId, partial: true });
  const draft = { ...partialPlayer, ...cleanWhitespace(playerDraft) };
  const commons = await createRegistrationCommons(playerId, draft);
  const fullDraft = { ...draft, ...commons, partial: false, accountClosed: false, allowGameplay: true, allowEmailPromotions: playerDraft.allowEmailPromotions, allowSMSPromotions: playerDraft.allowSMSPromotions };
  delete fullDraft.password;
  const [player] = await tx(PLAYERS).update(cleanWhitespace(fullDraft), PLAYER_INSERT_FIELDS).where({ id: playerId, /* partial: true TODO: need to fix pnp tests */ }).returning('*');
  await addPlayerCreationEvents(player.id, player, tx);
  return player;
});

const get = (id: Id): Promise<Player> =>
  pg(PLAYERS).first(PLAYER_FIELDS).where({ id }).then(player => (player || Promise.reject(`Player not found (id ${id})`)));

const update = async (playerId: Id, playerDraft: PlayerDraft, userId: ?Id, reason: ?string): Promise<Player> => {
  const player = { ...playerDraft };
  const mobilePhone = PhoneNumber.tryParse(playerDraft.mobilePhone, playerDraft.countryId);
  if (mobilePhone != null) player.mobilePhone = mobilePhone;
  const result = await pg.transaction(async (tx) => {
    const values = [];
    const updates = [];
    const x: any = player;
    PLAYER_UPDATE_FIELDS.forEach((field) => {
      const value = x[field];
      if (value != null) {
        values.push(value);
        updates.push(`"${field}" = ?`);
      }
    });
    values.push(playerId);
    const r = await tx.raw(`
      UPDATE players x
      SET    ${updates.join(',')}
      FROM  (SELECT * FROM players WHERE id = ? FOR UPDATE) y
      WHERE  x.id = y.id
      RETURNING ${PLAYER_FIELDS.map(n => `y."${n}" as "_${n}"`).join(',')}, ${PLAYER_FIELDS.map(n => `x."${n}" as "${n}"`).join(',')}`, values);

    if (r.rowCount !== 1) throw new Error('Player not found');

    const row = r.rows[0];
    await Promise.all(PLAYER_UPDATE_FIELDS.map(async (key) => {
      const oldValue = row[`_${key}`];
      const value = row[key];
      if (value !== oldValue) {
        const k: any = `players.${key}`;
        await addEvent(playerId, userId, 'account', k, { value, oldValue }, null, reason).transacting(tx);
        if (key === 'mobilePhone')
          await tx('players').update({ mobilePhoneStatus: 'unknown' }).where({ id: playerId });
        else if (key === 'email')
          await tx('players').update({ emailStatus: 'unknown' }).where({ id: playerId });
      }
    }));
    await EEG.notifyPlayerUpdate(playerId, tx);
    await Optimove.notifyPlayerUpdate(playerId, tx);
    // $FlowFixMe[incompatible-call]
    return pickBy((value: any, key: string) => key[0] !== '_')(row);
  });

  await Notification.updatePlayer(playerId);
  return result;
};

const findPlayerByNameDOB = async (brandId: BrandId, player: PlayerDraft): Promise<any> => {
  const { firstName, lastName, dateOfBirth } = player;
  const results = await pg(PLAYERS)
    .first(PLAYER_FIELDS)
    .where({ brandId, accountClosed: false, dateOfBirth })
    .whereRaw(`"firstName" || ' ' || "lastName" ilike ?`, `${firstName} ${lastName}`);
  return results;
};

const findPlayerByNamePostCode = async (brandId: BrandId, player: PlayerDraft): Promise<any> => {
  const { firstName, lastName, postCode } = player;
  const results = await pg(PLAYERS)
    .first(PLAYER_FIELDS)
    .where({ brandId, accountClosed: false })
    .whereRaw(`"firstName" || ' ' || "lastName" ilike ?`, `${firstName} ${lastName}`)
    .whereRaw(`replace("postCode", ' ', '') ilike ?`, `${postCode}`.replace(/\s/g, ''));
  return results;
};

const findPlayerByNameAddress = async (brandId: BrandId, player: PlayerDraft): Promise<any> => {
  const { firstName, lastName, address } = player;
  const results = await pg(PLAYERS)
    .first(PLAYER_FIELDS)
    .where({ brandId, accountClosed: false })
    .whereRaw(`"firstName" || ' ' || "lastName" ilike ?`, `${firstName} ${lastName}`)
    .whereRaw(`replace("address", ' ', '') ilike ?`, `${address}`.replace(/\s/g, ''));
  return results;
};

const getBalance = (id: Id): Knex$QueryBuilder<Balance> =>
  pg(PLAYERS)
    .first('balance', 'bonusBalance', 'currencyId', 'numDeposits', 'brandId')
    .where({ id });

const getBalanceWithGameplay = (id: Id): Knex$QueryBuilder<BalanceWithGameplay> =>
  pg('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .first('balance', 'bonusBalance', 'currencyId', 'numDeposits', 'brandId', 'allowGameplay', 'accountSuspended', 'defaultConversion')
    .where({ 'players.id': id });

const getBalanceWithGameplayForUpdate = async (tx: Knex, id: Id): Promise<BalanceWithGameplay> => {
  const { rows } = await tx.raw(`
    select "balance", "bonusBalance", "currencyId", "numDeposits", "brandId", "allowGameplay", "accountSuspended", "defaultConversion"
      from players
      join base_currencies on players."currencyId"=base_currencies.id
      where players.id=?
    for update of players
      limit 1`, [id]);
  if (rows.length === 0) return Promise.reject(walletErrorCodes.PLAYER_NOT_FOUND);
  return rows[0];
};

const currentBalance = (id: Id) =>
  pg(PLAYERS)
    .first('currencyId', 'reservedBalance', 'balance as realBalance', 'bonusBalance', pg.raw('("balance" + "bonusBalance") as "totalBalance"'))
    .where({ id })
    .then(player => (player || Promise.reject(`Player not found (id ${id})`)))
    .then(({ currencyId, reservedBalance, realBalance, bonusBalance, totalBalance }) => (
      {
        currencyId,
        reservedBalance,
        realBalance,
        bonusBalance,
        totalBalance,
        formatted: {
          reservedBalance: formatMoney(reservedBalance),
          realBalance: formatMoney(realBalance),
          bonusBalance: formatMoney(bonusBalance),
          totalBalance: formatMoney(totalBalance),
        },
      }
    ));

const currentStatus = async (
  id: Id,
): Promise<{
  balance: any,
}> => ({
  balance: await currentBalance(id),
});

const raiseRiskProfileTx = async (playerId: Id, riskProfile: 'medium' | 'high', reason: string, tx: Knex) => {
  const riskProfiles = ['low', 'medium', 'high'];
  const index = riskProfiles.indexOf(riskProfile);
  const riskProfileCheck = riskProfiles.splice(0, index);
  const updated = await tx(PLAYERS).update({ riskProfile }).where({ id: playerId }).whereIn('riskProfile', riskProfileCheck);
  if (updated) await addNote(playerId, null, reason).transacting(tx);
};

const raiseRiskProfile = (playerId: Id, riskProfile: 'medium' | 'high', reason: string): any => pg.transaction(tx => raiseRiskProfileTx(playerId, riskProfile, reason, tx));

const updateAccountStatusTx = async (
  id: Id,
  accountStatusDraft: { ...AccountStatusDraft, reason?: string },
  userId: ?Id,
  tx: Knex$Transaction<any>,
): Promise<Array<boolean>> => {
  const newAccountStatusDraft = omit(['reason'], accountStatusDraft);
  return Promise.all(
    Object.entries(newAccountStatusDraft).map(async ([key, value]: [string, any]) => {
      let u;
      let extraUpdates = {};
      if (key === 'loginBlocked' && value === false) extraUpdates = { badLoginCount: 0 };

      if (key === 'riskProfile')
        u = tx(PLAYERS)
          .update({ [key]: value, ...extraUpdates })
          .where({ id });
      else
        u = tx(PLAYERS)
          .update({ [key]: value, ...extraUpdates })
          .where({ id, [key]: !value });

      const updates: number = await u;
      if (
        (updates === 1 || (['riskProfile', 'verified', 'pep'].includes(key) && !isNil(value))) &&
        userId !== null
      ) {
        const v: any = value;
        const eventKey: any = `${key}.${v}`;
        await addEvent(id, userId, 'account', eventKey, accountStatusDraft).transacting(tx);
        return true;
      }
      return false;
    }),
  );
};

const updateAccountStatus = async (id: Id, accountStatusDraft: { ...AccountStatusDraft, reason?: string }, userId: ?Id): Promise<any> => {
  const result = await pg.transaction(async tx => {
    const status = await updateAccountStatusTx(id, accountStatusDraft, userId, tx);
    await EEG.notifyPlayerUpdate(id, tx);
    await Optimove.notifyPlayerUpdate(id, tx);
    return status;
  });
  await Notification.updatePlayer(id);
  return result;
};

const activate = async (id: Id, IPAddress: IPAddress, tx: Knex$Transaction<any>): Promise<boolean> => {
  const updated: number = await tx(PLAYERS).update({ activated: true }).where({ id, activated: false });
  if (updated === 1) {
    await addEvent(id, undefined, 'account', 'accountActivated', { IPAddress }).transacting(tx);
    await Notification.updatePlayer(id);
    await EEG.notifyPlayerUpdate(id, tx);
    await Optimove.notifyPlayerUpdate(id, tx);
    return true;
  }
  return false;
};

const addTag = async (playerId: Id, tag: string, ts?: string, tx?: Knex$Transaction<any>) => {
  const playerIds = CROSS_BRAND_TAGS.includes(tag)
    ? _.map<{ playerIds: Id }, Id>(await personPlayerIdsQuery(tx || pg, playerId), 'playerIds')
    : [playerId];
  for (const pId of playerIds) {
    await (tx || pg).raw(
      `update players set tags = coalesce(tags, '') || hstore(?, ${
        ts ? `'${ts}'` : `to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS"Z')`
      }) where "id"=?`,
      [tag, pId],
    );
    await Notification.updatePlayer(pId);
    await EEG.notifyPlayerUpdate(pId, pg);
    await Optimove.notifyPlayerUpdate(pId, pg);
  }
};

const removeTag = async (playerId: Id, tag: string, tx?: Knex$Transaction<any>) => {
  const playerIds = CROSS_BRAND_TAGS.includes(tag)
    ? _.map<{ playerIds: Id }, Id>(await personPlayerIdsQuery(tx || pg, playerId), 'playerIds')
    : [playerId];
  for (const pId of playerIds) {
    await (tx || pg).raw('update players set tags = delete(tags, ?) where "id"=?', [tag, pId]);
    await Notification.updatePlayer(pId);
    await EEG.notifyPlayerUpdate(pId, pg);
    await Optimove.notifyPlayerUpdate(pId, pg);
  }
};

const getTags = async (playerId: Id): Promise<any> => {
  const { tags } = await pg(PLAYERS).first('tags').where({ id: playerId });
  return tags == null ? {} : hstore.parse(tags);
};

const getLifetimeDeposits = async (
  playerId: Id,
  tx?: Knex,
  crossBrand: boolean = true,
): Promise<LifetimeDepositsAmount> =>
  (tx || pg)('players')
    .modify((qb) => (crossBrand ? qb.with('person', personPlayerIdsQuery(pg, playerId)) : qb))
    .first(pg.raw('sum("amount" / conversion_rates."conversionRate") as total'))
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .where({ paymentType: 'deposit' })
    .modify((qb) =>
      crossBrand
        ? qb.whereIn('playerId', pg('person').select('playerIds'))
        : qb.where({ playerId }),
    )
    .whereIn('status', ['complete', 'pending']);

const getRecentCumulativeDeposits = async (
  playerId: Id,
  dateSince: ?Date,
  tx?: Knex,
): Promise<LifetimeDepositsAmount> =>
  (tx || pg)('players')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .first(pg.raw('coalesce(sum("amount" / conversion_rates."conversionRate"), 0) as total'))
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .where({ paymentType: 'deposit' })
    .whereIn('playerId', pg('person').select('playerIds'))
    .whereIn('status', ['complete', 'pending'])
    .modify(qb => {
      if (dateSince) return qb.where( 'payments.timestamp', '>', dateSince);
      return qb
        .with('last_pass_sow', (qb) =>
          qb
            .first({ ts: pg.raw(`(tags->'pass-sow')::timestamp`) })
            .from('players')
            .whereIn('id', pg('person').select('playerIds'))
            .orderByRaw('ts desc NULLS LAST'),
        )
        .where(
          'payments.timestamp',
          '>',
          pg.raw(`GREATEST((select ts from last_pass_sow), now() - interval '6 months')`),
        );
    })

const getSowClearanceState = async (playerId: Id, tx?: Knex$Transaction<any>): Promise<SowState> => {
  const sowLimit = 10000000;
  const { total: lifetimeDeposits } = await getLifetimeDeposits(playerId, tx);
  const sowTagsQuery = (tx || pg)('players')
    .select({ key: 'keys' })
    .max({ value: pg.raw(`?? -> ??`, ['players.tags', 'keys']) })
    .with('person', personPlayerIdsQuery(pg, playerId))
    .joinRaw(`join lateral unnest(akeys("tags")) "keys" on "keys" in ('pass-sow', 'fail-sow')`)
    .whereIn('id', pg('person').select('playerIds'))
    .groupBy('keys');

  const sowTags = _.fromPairs(_.map(await sowTagsQuery, ({ key, value }) => [key, value]));
  if (_.has(sowTags, 'fail-sow')) return 'FAIL';
  if (lifetimeDeposits < sowLimit) return 'CLEAR';
  const cumulativeDepositsDateSince = moment
    .max(moment(sowTags['pass-sow'] || 0), moment().subtract(6, 'month'))
    .toDate();
  const { total: recentCumulativeDeposits } = await getRecentCumulativeDeposits(
    playerId,
    cumulativeDepositsDateSince,
    tx,
  );
  return recentCumulativeDeposits >= sowLimit ? 'PENDING' : 'CLEAR';
};

const getPlayersWithTag = async (
  tag: string,
  tx?: Knex$Transaction<any>,
): Promise<Array<{ id: Id, tags: { [string]: string } }>> => {
  // eslint-disable-next-line no-useless-escape
  const results = await (tx || pg)(PLAYERS).whereRaw(`tags \\\? '${tag}'`);
  return results.map(({ id, tags }) => ({
    id,
    tags: hstore.parse(tags),
  }));
};

const getAccountStatus = (id: Id): Knex$QueryBuilder<AccountStatus> => {
  // Add statistics fields to this array
  const fields = ['pep', 'verified', 'riskProfile'];
  const fieldValues = {
    pep: ['pep.true', 'pep.false'],
    verified: ['verified.true', 'verified.false'],
    riskProfile: ['riskProfile.low', 'riskProfile.medium', 'riskProfile.high'],
  }
  const selectFields = [
    'activated',
    'allowGameplay',
    'preventLimitCancel',
    'allowTransactions',
    'verified',
    'loginBlocked',
    'accountClosed',
    'accountSuspended',
    'gamblingProblem',
    'riskProfile',
    'depositLimitReached',
    'pep',
    pg.raw('(kyc_documents.id is not null) as "documentsRequested"'),
    pg.raw(`json_build_object(
      ${fields.reduce(
        (prev, curr, i) =>
          `${
            i > 0 ? `${prev},\n` : ''
          }'${curr}', json_build_object('timestamp', "${curr}"."createdAt", 'name', "${curr}".handle)`,
        '',
      )}
    ) as modified`),
  ];

  const q = pg(PLAYERS).select(selectFields)
    .leftOuterJoin('kyc_documents', {
      'kyc_documents.playerId': 'players.id',
      'kyc_documents.status': pg.raw('?', ['requested']),
    })
    .where({ 'players.id': id }).first();
  fields.forEach((field) => {
    q
    .leftJoin(field, `${field}.playerId`, 'players.id')
    .with(
      field,
      pg
        .select('player_events.*', 'users.handle')
        .from('player_events')
        .leftJoin('users', 'users.id', 'player_events.userId')
        .where({ playerId: id })
        .whereIn('key', fieldValues[field])
        .orderBy('createdAt', 'desc')
        .first(),
    );
  });
  return q;
};

const getRegistrationInfo = async (playerId: Id): Promise<
    ?{
      affiliateId: any,
      affiliateName: any,
      affiliateRegistrationCode: any,
      createdAt: any,
      ipAddress: any,
      lastLogin: any,
      registrationCountry: any,
    }> => {
  const result = await pg(PLAYERS)
    .first('affiliateId', 'affiliates.name as affiliateName', 'affiliateRegistrationCode', 'ipAddress', 'countryId', 'createdAt', 'lastLogin')
    .leftOuterJoin('affiliates', 'players.affiliateId', 'affiliates.id')
    .where({ 'players.id': playerId });
  if (result == null) return null;
  const { affiliateId, affiliateRegistrationCode, affiliateName, ipAddress, countryId, createdAt, lastLogin } = result;
  return {
    affiliateName,
    affiliateId,
    affiliateRegistrationCode,
    ipAddress,
    createdAt,
    registrationCountry: countryId,
    lastLogin,
  };
};

const getEmailVerificationStatus = async (
  id: Id,
  tx?: Knex$Transaction<any>,
): Promise<{ emailStatus: CommunicationMethodStatus }> =>
  (tx || pg)(PLAYERS).first('emailStatus').where({ id });

const getByIds = (playerIds: Id[]): Knex$QueryBuilder<Player[]> =>
  pg(PLAYERS).select(PLAYER_FIELDS).whereIn('id', playerIds);
const findByUsername = (brandId: BrandId, username: string): Knex$QueryBuilder<Player> =>
  pg(PLAYERS).first(PLAYER_FIELDS).where({ brandId, username });

const findByNationalId = (brandId: BrandId, countryId: string, nationalId: string): Knex$QueryBuilder<Player> =>
  pg(PLAYERS)
    .first(PLAYER_FIELDS)
    .where({ brandId, countryId })
    .where(qb => qb.where({ accountClosed: false, partial: false }).orWhere({ partial: true }))
    .modify((qb) => {
      if (countryId === 'FI')
        qb.where('nationalId', '~', `^(${countryId})?${_.trimStart(nationalId, 'FI')}`);
      else qb.where({ nationalId });
    })
    .orderBy([{column: 'partial', order: 'asc'}, {column: 'createdAt', order: 'desc'}]);

const findPlayer = (brandId: BrandId, query: { mobilePhone?: ?string, email?: ?string, dateOfBirth?: string }): Knex$QueryBuilder<Player> => {
  const q = pg(PLAYERS).first(PLAYER_FIELDS).where({ brandId, accountClosed: false });
  if (isEmpty(query)) return q.where({ id: 0 }); // Hacky way to always return knex query
  if (query.mobilePhone != null) q.where('mobilePhone', query.mobilePhone);
  if (query.email != null) q.whereRaw('lower("email") = ?', query.email.toLowerCase());
  if (query.dateOfBirth != null) q.where('dateOfBirth', query.dateOfBirth);
  return q;
};

const findMatchingPlayers = (query: { mobilePhone?: ?string, email?: ?string }): Knex$QueryBuilder<Player[]> => {
  const q = pg(PLAYERS).select(PLAYER_FIELDS);
  if (query.mobilePhone != null) q.where('mobilePhone', query.mobilePhone);
  if (query.email != null) q.whereRaw('lower("email") = ?', query.email.toLowerCase());
  return q;
};

const getPlayerWithDetails = async (id: Id): Promise<PlayerWithDetails> => {
  const player = await pg(PLAYERS)
    .with('person', personPlayerIdsQuery(pg, id))
    .leftOuterJoin('player_limits', (qb) =>
      qb
        .onIn('playerId', pg.select('playerIds').from('person'))
        .on('active', pg.raw('?', true))
        .on('type', pg.raw('?', 'exclusion'))
        .andOn((qb) =>
          qb.on(pg.raw('expires > now()')).orOn(pg.raw('(expires is null and permanent=true)')),
        ),
    )
    .first([
      ...PLAYER_FIELDS.map((field) => `players.${field}`),
      'players.registrationSource',
      pg.raw(
        'max(case when player_limits.expires is null and player_limits.permanent then \'2999-01-01\' else player_limits.expires end) as "selfExclusionEnd"',
      ),
      'allowGameplay',
      'preventLimitCancel',
      'allowTransactions',
      'loginBlocked',
      'accountClosed',
      'gamblingProblem',
      'accountSuspended',
      'numDeposits',
      'activated',
      'emailStatus',
      'mobilePhoneStatus',
      'tcVersion',
      'tags',
      'partial',
      pg.raw('case when hash is null then true else false end as pnp'),
      pg.raw(`"lastLogin"<now()-'2 years'::interval as "marketingExpired"`),
      pg.raw('("depositLimitReached" is not null) as flagged'),
      pg.raw('(("depositLimitReached" + \'30 days\'::interval) < now()) as locked'),
      pg.raw('("depositLimitReached" + \'30 days\'::interval) as "lockTime"'),
      'realityCheckMinutes',
    ])
    .groupBy('players.id')
    .where({ 'players.id': id });
  if (id == null) return Promise.reject(walletErrorCodes.PLAYER_NOT_FOUND);
  const {
    id: playerId,
    brandId,
    username,
    email,
    firstName,
    lastName,
    address,
    postCode,
    city,
    mobilePhone,
    countryId,
    dateOfBirth,
    languageId,
    nationalId,
    currencyId,
    allowEmailPromotions,
    allowSMSPromotions,
    createdAt,
    activated,
    verified,
    selfExclusionEnd,
    allowGameplay,
    preventLimitCancel,
    allowTransactions,
    loginBlocked,
    accountClosed,
    accountSuspended,
    gamblingProblem,
    numDeposits,
    testPlayer,
    emailStatus,
    mobilePhoneStatus,
    tcVersion,
    tags,
    flagged,
    locked,
    lockTime,
    partial,
    marketingExpired,
    placeOfBirth,
    nationality,
    additionalFields,
    registrationSource,
    affiliateRegistrationCode,
    pnp,
    realityCheckMinutes,
  } = player;

  const deactivated = selfExclusionEnd != null || accountClosed || accountSuspended || gamblingProblem || marketingExpired;
  const result: PlayerWithDetails = {
    id: playerId,
    brandId,
    username,
    email,
    firstName,
    lastName,
    address,
    postCode,
    city,
    mobilePhone,
    countryId,
    dateOfBirth,
    languageId,
    nationalId,
    currencyId,
    allowEmailPromotions: allowEmailPromotions && !deactivated && emailStatus !== 'failed',
    allowSMSPromotions: allowSMSPromotions && !deactivated && mobilePhoneStatus !== 'failed',
    createdAt,
    activated,
    verified,
    selfExclusionEnd,
    allowGameplay,
    preventLimitCancel,
    allowTransactions,
    loginBlocked,
    accountClosed,
    accountSuspended,
    numDeposits,
    testPlayer,
    gamblingProblem,
    tcVersion,
    partial,
    pnp,
    tags: tags ? keys(hstore.parse(tags)) : [],
    dd: {
      flagged: flagged && !verified,
      locked: flagged && !!locked && !verified,
      lockTime,
    },
    placeOfBirth,
    nationality,
    additionalFields,
    registrationSource,
    affiliateRegistrationCode,
    realityCheckMinutes,
  };
  return result;
};

const getPlayerFromOtherBrands = async (tx: Knex$Transaction<any>, playerId: Id): Promise<{ id: Id, firstName: string, lastName: string, brandId: BrandId, email: string, username: string }[]> => {
  const { mobilePhone, email } = await tx(PLAYERS).first('mobilePhone', 'email').where({ id: playerId });
  const query = await pg.raw(`SELECT
    id,
    players."firstName",
    players."lastName",
    players."brandId",
    email,
    username
    FROM "players"
    WHERE "players"."id" <> ?
    AND ("players"."mobilePhone" = ? OR "players"."email" = ?)`, [playerId, mobilePhone, email]);
  return query.rows;
};

const suspendAccount = async (playerId: Id, accountClosed: boolean, reasons: string[], note: string, userId: Id): Promise<any> => {
  const updated = await pg.transaction(async (tx) => {
    const updateIds = [];
    const suspendUpdated = await tx(PLAYERS).update({ accountSuspended: true }).where({ id: playerId, accountSuspended: false });
    if (suspendUpdated) {
      updateIds.push(playerId);
      const closedUpdated = await tx(PLAYERS).update({ accountClosed: true }).where({ id: playerId, accountClosed: !accountClosed });
      if (closedUpdated && accountClosed)
        await addEvent(playerId, userId, 'account', 'accountClosed.true', { accountClosed, reasons });
      else
        await addEvent(playerId, userId, 'account', 'accountSuspended.true', { accountClosed, reasons });

      if (includes('gambling_problem', reasons)) {
        const gamblingProblemUpdated = await tx(PLAYERS).update({ gamblingProblem: true }).where({ id: playerId, gamblingProblem: false });

        if (gamblingProblemUpdated) {
          const otherBrandsPlayers = await getPlayerFromOtherBrands(tx, playerId);
          const personPlayers = await getConnectedPlayers(tx, playerId);

          const gamblingProblemIds = [...otherBrandsPlayers, ...personPlayers].map((p) => p.id);
          const updatedPlayers = await tx(PLAYERS)
            .update({ gamblingProblem: true, accountSuspended: true, accountClosed: true })
            .where({ gamblingProblem: false })
            .whereIn('id', gamblingProblemIds)
            .returning('id')
            .then((u) => u.map(({ id }) => id));
          await Promise.all(updatedPlayers.map(id => addEvent(id, userId, 'account', 'accountSuspended.true', { accountClosed, reasons })));
          updateIds.push(...updatedPlayers);
        }
      }

      if (includes('data_removal', reasons)) {
        const p = await get(playerId);
        await tx(PLAYERS)
          .update({
            firstName: 'Anonymized',
            lastName: 'Anonymized',
            username: `${p.brandId}_${playerId}`,
            address: 'Anonymized',
            mobilePhone: '0000',
            city: 'Anonymized',
            email: 'anonymized@luckydino.com',
            ipAddress: '127.0.0.1',
            dateOfBirth: '1900-01-01',
            postCode: '12345',
            countryId: 'XX',
            nationalId: '12334567890',
            placeOfBirth: 'Anonymized',
            nationality: 'XX',
            additionalFields: {},
          })
          .where({ id: playerId });
      }

      await tx('player_closure_reasons').where({ playerId }).delete();
      if (reasons.length > 0)
        await tx('player_closure_reasons').insert(
          reasons.map((type) => ({
            playerId,
            type,
            userId,
          })),
        );
    }
    if (note !== '') await addNote(Number(playerId), userId, note, tx);
    return updateIds;
  });
  await Promise.all(updated.map(id => Notification.updatePlayer(id)));
  await Promise.all(updated.map(id => EEG.notifyPlayerUpdate(id, pg)));
  await Promise.all(updated.map(id => Optimove.notifyPlayerUpdate(id, pg)));

  return updated;
};

const getSidebarStatus = async (): Promise<any> => {
  const ret = await pg.raw(`
  WITH
  tasks AS (
    SELECT "brandId",
    array_agg(json_build_object(
      'type', r.type,
      'requiredRole', r."requiredRole",
      'count', r.count
    )) AS t
    FROM (
      SELECT players."brandId", risks.type AS type, risks."requiredRole", count(*) AS COUNT
      FROM risks
      LEFT OUTER JOIN player_frauds ON player_frauds."fraudKey"=risks."fraudKey" AND player_frauds.checked = FALSE AND risks."active" = TRUE
      LEFT OUTER JOIN players ON player_frauds."playerId"=players.id AND "accountSuspended"=FALSE
      GROUP BY players."brandId", risks.type, risks."requiredRole"
    ) r
    GROUP BY r."brandId"
  ),
  docs AS (
    SELECT "brandId", count(*) as "count" FROM kyc_documents JOIN players ON kyc_documents."playerId"=players.id WHERE kyc_documents.status='new' GROUP BY players."brandId"
  ),
  withdrawals AS (
    SELECT "brandId", count(*) as "count" FROM payments JOIN players ON payments."playerId"=players.id WHERE "paymentType"='withdraw' AND "status"='pending' GROUP BY players."brandId"
  ),
  sessions AS (
    SELECT "brandId", count(*) as "count" FROM sessions JOIN players ON sessions."playerId"=players.id WHERE sessions."endReason" IS NULL AND "accountSuspended"=FALSE GROUP BY players."brandId"
  )

  SELECT
    brands.id AS "brandId",
    coalesce(tasks.t, '{}') AS "tasks",
    coalesce(docs.count::int, 0) AS "docs",
    coalesce(withdrawals.count::int, 0) AS "withdrawals",
    coalesce(sessions.count::int, 0) AS "online"
  FROM
  brands
  LEFT JOIN tasks ON tasks."brandId"=brands.id
  LEFT JOIN docs ON docs."brandId"=brands.id
  LEFT JOIN withdrawals ON withdrawals."brandId"=brands.id
  LEFT JOIN sessions ON sessions."brandId"=brands.id`);
  return ret.rows.map((row) =>
    ({ ...row, frauds: row.tasks.map(x => x.count).reduce((a, b) => a + b, 0) }) // TODO: this can be removed when UI has been updated
  );
};

const findPlayersWithGamblingProblem = async (playerDraft: PlayerDraft): Promise<any> =>
  pg(PLAYERS).select(PLAYER_FIELDS)
    .where({ gamblingProblem: true })
    .whereRaw(pg.raw('(lower(email)=? or "mobilePhone"=?)', [playerDraft.email.toLowerCase(), playerDraft.mobilePhone]));

const fingPlayerWithClosureReason = async (playerDraft: PlayerDraft, reason: string): Promise<any> =>
  pg(PLAYERS).select(PLAYER_FIELDS)
    .innerJoin('player_closure_reasons', 'players.id', 'player_closure_reasons.playerId')
    .where({ type: reason })
    .whereRaw(pg.raw('(lower(email)=? or "mobilePhone"=?)', [playerDraft.email.toLowerCase(), playerDraft.mobilePhone]));

const findPartialPlayersWithGamblingProblem = async (playerDraft: PlayerDraft): Promise<any> =>
  pg(PLAYERS).select(PLAYER_FIELDS)
    .where({ gamblingProblem: true })
    .whereRaw(pg.raw('(lower("lastName")=? and "dateOfBirth"=?)', [playerDraft.lastName.toLowerCase(), playerDraft.dateOfBirth]));

const getRiskFlags = async (playerId: Id): Promise<{ potentialGamblingProblem: boolean }> => {
  const [{ potentialGamblingProblem }] = await pg('players')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .select({ potentialGamblingProblem: pg.raw('count(??) > 0', 'players.id') })
    .where({ accountSuspended: false, gamblingProblem: false, id: playerId })
    .whereIn(
      'id',
      pg('player_frauds')
        .select('playerId')
        .where('playerId', playerId)
        .whereIn('fraudKey', ['cumulative_deposits_over_amount', 'huge_deposit']),
    )
    .whereNotIn(
      'id',
      pg('player_limits')
        .select('playerId')
        .whereIn('player_limits.playerId', (qb) => qb.select('playerIds').from('person'))
        .where({ type: 'exclusion' })
        .where({ active: true })
        .where('cancelled', '=', null)
        .where('expires', '>', 'now'),
    )
    .whereIn(
      'id',
      pg.union([
        pg('player_limits')
          .crossJoin({ p: 'person' })
          .select('p.playerIds')
          .where((qb) =>
            qb
              .where({ active: false })
              .orWhere('cancelled', '!=', null)
              .orWhere('expires', '<', 'now'),
          )
          .where((qb) => {
            qb.where({ type: 'exclusion' }).whereIn('player_limits.playerId', (qb) =>
              qb.select('playerIds').from('person'),
            );
          }),
        pg('player_limits')
          .select('playerId')
          .where('playerId', playerId)
          .where((qb) =>
            qb
              .where({ active: false })
              .orWhere('cancelled', '!=', null)
              .orWhere('expires', '<', 'now'),
          )
          .whereIn('type', ['deposit_amount', 'bet', 'loss', 'session_length']),
      ]),
    );
  return { potentialGamblingProblem };
};

const getPlayerWithRisk = async (playerId: Id): Promise<PlayerWithRisk> => {
  const [player, { potentialGamblingProblem }] = await Promise.all([
    getPlayerWithDetails(playerId),
    getRiskFlags(playerId),
  ]);
  return { ...player, potentialGamblingProblem };
}

const getRequireDueDiligenceFlags = async (playerId: Id): Promise<{ lockTime: ?Date, flagged: boolean, locked: boolean, verified: boolean }> => {
  const query = pg('players')
    .first(
      pg.raw('("depositLimitReached" is not null) as flagged'),
      pg.raw('(("depositLimitReached" + \'30 days\'::interval) < now()) as locked'),
      pg.raw('("depositLimitReached" + \'30 days\'::interval) as "lockTime"'),
      'riskProfile',
      'verified',
    )
    .where('players.id', playerId);
  const { flagged, locked, verified, lockTime } = await query;
  const result = {
    flagged,
    locked: (!verified && locked) || false,
    verified,
    lockTime: flagged ? lockTime : undefined,
  };
  return result;
};

const getClientInfo = async (playerId: Id): Promise<ClientInfo> =>
  pg('sessions')
    .first('ipAddress', 'userAgent', 'mobileDevice as isMobile')
    .where({ playerId })
    .orderBy('timestamp', 'desc');

const getStickyNote = async (playerId: Id, tx?: Knex$Transaction<any>): Promise<?string> => {
  const notes = await (tx || pg)('players')
    .select('player_events.content')
    .innerJoin('player_events', 'player_events.id', 'players.stickyNoteId')
    .where({ 'players.id': playerId, 'player_events.archived': false });

  return notes && notes[0] && notes[0].content;
};

const setStickyNote = (playerId: Id, playerEventId: ?Id, tx?: Knex$Transaction<any>): Promise<void> =>
  (tx || pg)('players').where({ id: playerId }).update({ stickyNoteId: playerEventId });

const getIdefixUrl = (username: string, brandId: BrandId): string => {
  const uurl = `${config.ui.idefix}/api/v1/player/go/${brandId}/${username}`;
  return `<${uurl}|${username}>`;
};

const withSameEmailDifferentPhone = (query: {
  mobilePhone: string,
  email: string,
}): Knex$QueryBuilder<Player[]> =>
  pg(PLAYERS)
    .select(PLAYER_FIELDS)
    .whereRaw('lower("email") = ?', query.email.toLowerCase())
    .whereNot('mobilePhone', query.mobilePhone);

const withSamePhoneDifferentEmail = (query: {
  mobilePhone: string,
  email: string,
}): Knex$QueryBuilder<Player[]> =>
  pg(PLAYERS)
    .select(PLAYER_FIELDS)
    .where('mobilePhone', query.mobilePhone)
    .whereRaw('lower("email") != ?', query.email.toLowerCase());

const withPhoneAndEmail = (query: {
  mobilePhone: string,
  email: string,
}): Knex$QueryBuilder<Player[]> =>
  pg(PLAYERS)
    .select(PLAYER_FIELDS)
    .where('mobilePhone', query.mobilePhone)
    .whereRaw('lower("email") = ?', query.email.toLowerCase());

const withSameNameAndDOB = ({
  fullName,
  dateOfBirth,
}: {
  fullName: string,
  dateOfBirth: string,
}): Knex$QueryBuilder<Player[]> =>
  pg(PLAYERS)
    .select(PLAYER_FIELDS)
    .whereRaw(`"firstName" || ' ' || "lastName" ilike ?`, fullName)
    .where({ dateOfBirth, loginBlocked: false, activated: true, accountClosed: false });

module.exports = {
  PLAYERS,
  PLAYER_FIELDS,
  checkEmailFraud,
  create,
  createPartial,
  updatePartial,
  completePartial,
  get,
  getBalance,
  getBalanceWithGameplay,
  currentStatus,
  update,
  findPlayer,
  findMatchingPlayers,
  findPlayerByNameDOB,
  findPlayerByNamePostCode,
  findPlayerByNameAddress,
  findByUsername,
  findByNationalId,
  getAccountStatus,
  updateAccountStatus,
  updateAccountStatusTx,
  getRegistrationInfo,
  getByIds,
  activate,
  addTag,
  removeTag,
  getTags,
  getPlayersWithTag,
  getPlayerWithDetails,
  getLifetimeDeposits,
  getRecentCumulativeDeposits,
  getSowClearanceState,
  suspendAccount,
  getSidebarStatus,
  getPlayerFromOtherBrands,
  getEmailVerificationStatus,
  findPlayersWithGamblingProblem,
  findPartialPlayersWithGamblingProblem,
  fingPlayerWithClosureReason,
  getRequireDueDiligenceFlags,
  raiseRiskProfile,
  raiseRiskProfileTx,
  getRiskFlags,
  getPlayerWithRisk,
  getClientInfo,
  getStickyNote,
  setStickyNote,
  getBalanceWithGameplayForUpdate,
  getIdefixUrl,
  withSameEmailDifferentPhone,
  withSamePhoneDifferentEmail,
  withPhoneAndEmail,
  withSameNameAndDOB,
};
