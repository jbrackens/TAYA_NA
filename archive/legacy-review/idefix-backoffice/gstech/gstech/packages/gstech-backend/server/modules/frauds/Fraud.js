/* @flow */
import type { Player, RiskProfile } from 'gstech-core/modules/types/player';
import type { CheckMultipleSanctionResponse } from 'gstech-core/modules/clients/complianceserver-api';

const _ = require('lodash');
const array = require('postgres-array')
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const complianceApi = require('gstech-core/modules/clients/complianceserver-api');
const { getBrandInfo } = require("../settings");
const {
  get: getPlayer,
  withPhoneAndEmail: playerWithPhoneAndEmail,
  withSameEmailDifferentPhone: playerWithSameEmailDifferentPhone,
  withSamePhoneDifferentEmail: playerWithSamePhoneDifferentEmail,
  withSameNameAndDOB: playerWithSameNameAndDOB,
} = require('../players/Player');
const { addEvent } = require('../players/PlayerEvent');
const { emitSidebarStatusChanged } = require('../core/socket');
const { formatMoney } = require('../core/money');
const { personPlayerIdsQuery } = require('../persons/Person');

export type Fraud = {
  id: Id,
  cleared: boolean,
  points: number,
  fraudId: string,
  fraudKey: string,
  title: string,
  description: string,
  details: { key: string, value: string }[],
  riskProfiles?: RiskProfile[],
  content?: string,
};

const frauds = {
  same_email_diff_phone: {
    details: async (details: { [string]: string }) => [
      { key: 'Existing Player Id', value: `${details.existingPlayerId}` },
      { key: 'Existing Player Brand', value: `${(await getBrandInfo(details.existingPlayerBrandId)).name}` },
    ],
  },
  same_phone_diff_email: {
    details: async (details: { [string]: string }) => [
      { key: 'Existing Player Id', value: `${details.existingPlayerId}` },
      { key: 'Existing Player Brand', value: `${(await getBrandInfo(details.existingPlayerBrandId)).name}` },
    ],
  },
  same_details_different_name: {
    details: async (details: { [string]: string }) => [
      { key: 'Existing Player Id', value: `${details.existingPlayerId}` },
      { key: 'Existing Player Brand', value: `${(await getBrandInfo(details.existingPlayerBrandId)).name}` },
    ],
  },
  registration_ip_country_mismatch: {
    details: async (details: { [string]: string }, player: Player) => [
      { key: 'Registration IP', value: `${details.ipAddress} (${details.ipCountry})` },
      { key: 'Registration Country', value: `${player.countryId}` },
    ],
  },
  login_ip_country_mismatch: {
    details: async (details: { [string]: string }, player: Player) => [
      { key: 'Login IP', value: `${details.ipAddress} (${details.ipCountry})` },
      { key: 'Registration Country', value: `${player.countryId}` },
    ],
  },
  login_vpn: {
    details: async (details: { [string]: string }) => [
      { key: 'IP', value: details.ipAddress },
      { key: 'VPN', value: details.vpn ? 'true' : 'false' },
      { key: 'TOR', value: details.tor ? 'true' : 'false' },
      { key: 'Device brand', value: details.device_brand },
      { key: 'Device model', value: details.device_model },
      { key: 'Operating System', value: details.operating_system },
      { key: 'ISP', value: details.ISP },
      { key: 'Host', value: details.host },
    ],
  },
  invalid_email_address: {
    details: async (details: { [string]: string }) => [
      { key: 'Email', value: details.email },
      { key: 'Response', value: details.response },
    ],
  },

  other_source_of_wealth: {
    details: async (details: { [string]: string }) => [
      { key: 'Explanation', value: details.explanation },
    ],
  },

  several_payment_accounts: {
    details: async (details: { [string]: string }) => [
      { key: 'Payment method', value: details.paymentMethodName },
    ],
  },
  registration_phone_number: {
    details: async (details: { [string]: string }) => [
      { key: 'Already existing phone number', value: details.phoneNumber },
    ],
  },
  same_browser_registrations: {
    details: async (details: { [string]: string }) => [
      { key: 'Also registered with same browser', value: `${details.username}` },
    ],
  },
  payment_method_country: {
    details: async (details: { [string]: string }, player: Player) => [
      { key: 'Payment method', value: `${details.paymentMethod}` },
      { key: 'Account', value: `${details.account}` },
      { key: 'Payment method country', value: details.country },
      { key: 'Player registration country', value: `${player.countryId}` },
    ],
  },
  payment_method_owner: {
    details: async (details: { [string]: string }, player: Player) => [
      { key: 'Payment method', value: `${details.paymentMethod}` },
      { key: 'Account', value: `${details.account}` },
      { key: 'Payment method owner', value: details.owner },
      { key: 'Registered player name', value: `${player.firstName} ${player.lastName}` },
    ],
  },
  payment_method_email: {
    details: async (details: { [string]: string }, player: Player) => [
      { key: 'Payment method', value: `${details.paymentMethod}` },
      { key: 'Account', value: `${details.account}` },
      { key: 'Payment method owner', value: details.owner },
      { key: 'Registered email address', value: player.email },
    ],
  },
  payment_method_phone: {
    details: async (details: { [string]: string }, player: Player) => [
      { key: 'Payment method', value: `${details.paymentMethod}` },
      { key: 'Account', value: `${details.account}` },
      { key: 'Payment method owner', value: details.owner },
      { key: 'Registered phone number', value: player.mobilePhone },
    ],
  },
  successive_high_risk_deposits: {
    details: async (details: { [string]: string }) => [
      { key: 'Payment method', value: `${details.paymentMethod}` },
    ],
  },
  sudden_big_deposit: {
    details: async (details: { [string]: string }) => [
      { key: 'Payment method', value: `${details.paymentMethod}` },
    ],
  },
  sanction_list_check: {
    details: async (details: { [string]: string }) => [
      { key: 'Matching list', value: details.list },
      { key: 'Matching name', value: details.match },
    ],
  },
  failed_withdrawal: {
    details: async (details: { [string]: string }) => [
      { key: 'Payment provider', value: `${details.paymentProvider}` },
      { key: 'Payment ID', value: `${details.paymentId}` },
      { key: 'Transaction key', value: `${details.transactionKey}` },
      { key: 'Amount', value: `${formatMoney(Number(details.amount))}` },
    ],
  },
  lifetime_deposit: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}`},
    ],
  },
  cumulative_100k_180days: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}`},
    ],
  },
  lifetime_deposit_75k: {
    details: async (details: { [string]: string }) => [
      { key: 'Industry', value: `${details.industry === "other" ? details.explanation : details.industry}` },
      { key: 'Salary', value: `${details.salary}` },
    ],
  },
  lifetime_deposit_2k: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
    ],
  },
  lifetime_deposit_2k_answered: {
    details: async (details: { [string]: string }) => [
      { key: 'Industry', value: `${details.industry === "other" ? details.explanation : details.industry}` },
      { key: 'Salary', value: `${details.salary}` },
      { key: 'Monthly Deposit', value: `${details.monthlyDeposit}` },
    ],
  },
  lifetime_deposit_100k_30day: {
    details: async (details: { [string]: string }) => [
      { key: 'Industry', value: `${details.industry === "other" ? details.explanation : details.industry}` },
      { key: 'Salary', value: `${details.salary}` },
    ],
  },
  dep500_acc30days: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
      { key: 'Account Created', value: `${details.accountAge}` },
    ],
  },
  dep1000_acc60days: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
      { key: 'Account Created', value: `${details.accountAge}` },
    ],
  },
  dep2500_acc90days: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
      { key: 'Account Created', value: `${details.accountAge}` },
    ],
  },
  velocity_dep3tx_3min: {
    details: async (details: { [string]: string }) => [
      { key: 'Deposits', value: `${details.deposits}` },
      { key: 'Amount', value: `${formatMoney(+details.amount, 'EUR')}` },
    ],
  },
  velocity_dep10tx_24h: {
    details: async (details: { [string]: string }) => [
      { key: 'Deposits', value: `${details.deposits}` },
      { key: 'Amount', value: `${formatMoney(+details.amount, 'EUR')}` },
    ],
  },
  velocity_dep6tx_12min: {
    details: async (details: { [string]: string }) => [
      { key: 'Deposits', value: `${details.deposits}` },
      { key: 'Amount', value: `${formatMoney(+details.amount, 'EUR')}` },
    ],
  },
  no_wagering_between_deps: {
    details: async (details: { [string]: string }) => [
      {
        key: 'Deposited since last Gameplay',
        value: `${formatMoney(+details.amount, 'EUR')}`,
      },
      { key: 'Last Gameplay', value: `${details.lastGameplay}` },
    ],
  },
  cumulative_deposits_5k: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
    ],
  },
  cumulative_deposits_10k: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
    ],
  },
  cumulative_deposits_25k: {
    details: async (details: { [string]: string }) => [
      { key: 'Total Amount Deposited', value: `${formatMoney(+details.total, 'EUR')}` },
    ],
  },
  high_rejection_rate: {
    details: async (details: { [string]: string }) => [
      { key: 'Time Frame', value: details.timeframe },
      { key: 'Rejection Rate', value: details.rejectionRate },
      { key: 'Rejections', value: details.rejections },
    ],
  },
  high_rejection_count: {
    details: async (details: { [string]: string }) => [
      { key: 'Failed Attempts', value: details.fails24h },
    ],
  },
  new_player_possible_linked: {
    details: async (details: { [string]: string }) => [
      { key: 'Existing Player', value: details.username },
      { key: 'First Name', value: details.firstName },
      { key: 'Last Name', value: details.lastName },
      { key: 'Date of Birth', value: details.dateOfBirth },
    ],
  },
  deposit_estimation_doubled: {
    details: async (details: { [string]: string }) => [
      { key: 'Expected Monthly Deposit', value: details.expected },
      { key: 'Amount Deposited Last 30 Days', value: `${formatMoney(+details.total, 'EUR')}` },
    ],
  },
};

const mapFraud = async (fraud: any) => {
  const f = frauds[fraud.fraudKey];

  if (!f || _.isEmpty(fraud.details) || fraud.details === null) return { ...fraud, details: [] };

  const player = await getPlayer(fraud.playerId);
  const details = await f.details(fraud.details, player);

  return { ...fraud, details };
};

const addFraud = async (tx: Knex, playerId: Id, fraudKey: string, content: string, checked: boolean, userId: Id, fraudId: string): Promise<?Id> => {
  const fraud = await tx('risks')
    .first('fraudKey', 'points', 'title')
    .where({ fraudKey });

  if (!fraud){
    throw Error(`Invalid fraudKey ${fraudKey}`);
  }

  const [{ id }] = await tx('player_frauds')
    .insert({
      playerId,
      fraudKey,
      points: fraud.points,
      checked,
      fraudId,
    })
    .returning('id');

  if (id) {
    await addEvent(playerId, userId, 'fraud', 'fraudAdded', { description: fraud.title }, id, content).transacting(tx);
    emitSidebarStatusChanged();
    return id;
  }
  return null;
}

const addPlayerFraudTx = async (playerId: Id, fraudKey: string, fraudId: string, details: ?mixed, tx: Knex): Promise<?Id> => {
  const p = await tx('players')
    .innerJoin('risks', pg.raw('1'), pg.raw('1'))
    .first('riskProfile', 'riskProfiles', 'points', 'title', 'manualCheck')
    .where({ 'players.id': playerId, fraudKey });

  if (p == null) {
    logger.error(`Invalid fraudKey ${fraudKey}`);
    return null;
  }

  const { points, title, riskProfile, riskProfiles, manualCheck } = p;
  if(riskProfiles != null && !_.includes(array.parse(riskProfiles), riskProfile)) {
    return null;
  }

  const updated = await tx.raw(`
    with ins as (insert into player_frauds
      ("playerId", "fraudKey", "fraudId", "points", "details", "checked")
      values
      (:playerId, :fraudKey, :fraudId, :points, :details, :checked)
      on conflict("playerId", "fraudKey", "fraudId")
      do update set "points" = excluded."points", "details" = excluded."details" returning id)
    select id from player_frauds where "playerId"=:playerId and "fraudId"=:fraudId and "fraudKey"=:fraudKey
    union all
    select id from ins`,
    {
      playerId,
      fraudKey,
      fraudId,
      points,
      details: details != null ? JSON.stringify(details) : null,
      checked: !manualCheck,
    });

  if (updated.rowCount === 1) {
    const { id } = updated.rows[0];
    await addEvent(playerId, null, 'fraud', 'fraudAdded', { description: title }, id).transacting(tx);
    emitSidebarStatusChanged();
    return id;
  }
  if (updated.rowCount === 2) {
    const { id } = updated.rows[0];
    return id;
  }
  return null;
};

const addPlayerFraud = async (playerId: Id, fraudKey: string, fraudId: string, details: ?mixed): Promise<?Id> =>
  pg.transaction(tx => addPlayerFraudTx(playerId, fraudKey, fraudId, details, tx));

const checkSameEmailDifferentPhoneFraud = async (player: Player) => {
  const playersUsingSameEmailDifferentPhone = await playerWithSameEmailDifferentPhone({
    mobilePhone: player.mobilePhone,
    email: player.email,
  });

  for (const playerUsingSameEmailDifferentPhone of playersUsingSameEmailDifferentPhone) {
    await addPlayerFraud(
      player.id,
      'same_email_diff_phone',
      playerUsingSameEmailDifferentPhone.mobilePhone,
      {
        existingPlayerId: playerUsingSameEmailDifferentPhone.id,
        existingPlayerBrandId: playerUsingSameEmailDifferentPhone.brandId
      }
    );
  }
}

const checkSamePhoneDifferentEmailFraud = async (player: Player) => {
  const playersUsingSamePhoneDifferentEmail = await playerWithSamePhoneDifferentEmail({
    mobilePhone: player.mobilePhone,
    email: player.email,
  });

  for (const playerUsingSamePhoneDifferentEmail of playersUsingSamePhoneDifferentEmail) {
    await addPlayerFraud(
      player.id,
      'same_phone_diff_email',
      playerUsingSamePhoneDifferentEmail.email,
      {
        existingPlayerId: playerUsingSamePhoneDifferentEmail.id,
        existingPlayerBrandId: playerUsingSamePhoneDifferentEmail.brandId
      }
    );
  }
}

const checkSameDetailsDifferentNameFraud = async (player: Player) => {
  const formatName = (name: string) => name.toLowerCase().replace(/\s/g, '');

  const existingSameDetailPlayers = (
    await playerWithPhoneAndEmail({
      mobilePhone: player.mobilePhone,
      email: player.email,
    })
  ).filter(({ id }) => id !== player.id);

  const offendingPlayers = existingSameDetailPlayers.filter(
    ({ firstName, lastName }) =>
      formatName(firstName) !== formatName(player.firstName) ||
      formatName(lastName) !== formatName(player.lastName),
  );

  for (const offendingPlayer of offendingPlayers) {
    await addPlayerFraud(player.id, 'same_details_different_name', `${offendingPlayer.id}`, {
      existingPlayerId: offendingPlayer.id,
      existingPlayerBrandId: offendingPlayer.brandId,
    });
  }
};

const checkSameNameAndDOB = async (player: Player) => {
  const playerToFilterIds = _.map<{ playerIds: Id }, Id>(
    await personPlayerIdsQuery(pg, player.id),
    'playerIds',
  );

  const existingSimilarPlayers = await playerWithSameNameAndDOB({
    fullName: `${player.firstName} ${player.lastName}`,
    dateOfBirth: player.dateOfBirth,
  });

  const existingSimilarPlayersWithoutCurrent = _.filter(
    existingSimilarPlayers,
    (p) => !_.includes(playerToFilterIds, p.id),
  );

  await Promise.all(
    existingSimilarPlayersWithoutCurrent.map(({ username, firstName, lastName, dateOfBirth }) =>
      addPlayerFraud(player.id, 'new_player_possible_linked', username, {
        username,
        firstName,
        lastName,
        dateOfBirth,
      }),
    ),
  );
};

const checkRegistrationFrauds = async (player: Player) => {
  await checkSameEmailDifferentPhoneFraud(player);
  await checkSamePhoneDifferentEmailFraud(player);
  await checkSameDetailsDifferentNameFraud(player);
  await checkSameNameAndDOB(player);
}

const getUnchecked = async (playerId: Id): Promise<Fraud[]> => await pg('player_frauds')
  .innerJoin('risks', 'risks.fraudKey', 'player_frauds.fraudKey')
  .select(
    'player_frauds.id',
    'player_frauds.fraudKey',
    'fraudId',
    'player_frauds.points',
    'title',
    'description',
  )
  .where({ playerId, checked: false });

const getActive = async (playerId: Id): Promise<Fraud[]> => await pg('player_frauds')
  .innerJoin('risks', 'risks.fraudKey', 'player_frauds.fraudKey')
  .select(
    'player_frauds.id',
    'player_frauds.fraudKey',
    'fraudId',
    'player_frauds.points',
    'title',
    'description',
  )
  .where({ playerId, cleared: false });

const getFraudPoints = async (playerId: Id): Promise<number> => {
  const [{ points }] = await pg('player_frauds')
    .innerJoin('risks', 'risks.fraudKey', 'player_frauds.fraudKey')
    .select(pg.raw('sum(player_frauds.points) as points'))
    .where({ playerId, cleared: false, active: true });
  return Number(points);
};

const check = async (id: Id, userId: Id, cleared: boolean, resolution?: string): Promise<any> =>
  pg.transaction(async (tx) => {
    const [fraudUpdate] = await tx('player_frauds')
      .update({ cleared, checked: true, checkedBy: userId, checkedAt: pg.raw('now()') })
      .where({ id })
      .returning('playerId');
    if (fraudUpdate.playerId != null) {
      const { title } = await tx('player_frauds')
        .innerJoin('risks', 'risks.fraudKey', 'player_frauds.fraudKey')
        .first('player_frauds.fraudKey', 'title')
        .where({ 'player_frauds.id': id });
      await addEvent(
        fraudUpdate.playerId,
        userId,
        'fraud',
        cleared ? 'fraudCleared' : 'fraudConfirmed',
        { description: title },
        id,
        resolution,
      ).transacting(tx);
      emitSidebarStatusChanged();
      return { ok: true };
    }
    return { ok: false };
  });

const checkIpFraud = async (playerId: Id, ipAddress: IPAddress) => {
  try {
    const { matched, ...details } = await complianceApi.checkIp(ipAddress);
    logger.debug('checkIpFraud', { ipAddress, matched, details });
    if (matched) {
      await addPlayerFraud(playerId, 'login_vpn', ipAddress, { ipAddress, ...details });
    }
  } catch (e) {
    logger.error('checkIpFraud failed', { playerId, ipAddress }, e);
  }
};

const getById = async (playerFraudId: Id): Promise<Fraud> => {
  const fraud = await pg('player_frauds')
    .first(
      'player_frauds.id',
      'player_frauds.fraudKey',
      'player_frauds.fraudId',
      'player_frauds.points',
      'player_frauds.details',
      'player_frauds.playerId',
      'title',
      'description',
      'content',
      'users.handle'
      )
    .innerJoin('risks', 'risks.fraudKey', 'player_frauds.fraudKey')
    .leftOuterJoin('player_events', {
      'player_events.fraudId': 'player_frauds.id',
      'player_events.playerId': 'player_frauds.playerId'
    })
    .leftOuterJoin('users', 'users.id', 'player_events.userId')
    .where({ 'player_frauds.id': playerFraudId })
    .orderBy('player_events.createdAt', 'DESC');

  return await mapFraud(fraud);
};

const applyMultipleSanction = async (playerId: Id, sanctionCheckResult: CheckMultipleSanctionResponse): Promise<any> => {
  if (!sanctionCheckResult.matched) return;
  const fraudKey = 'sanction_list_check';
  const player = await getPlayer(playerId);
  const { matches, metadata } = sanctionCheckResult;
  const existingFrauds = await pg('player_frauds').select('fraudId').where({ playerId, fraudKey });
  const newMatches = matches?.filter(({ reference }) => !existingFrauds.find((fraud) => fraud.fraudId === reference));
  if (!newMatches || newMatches?.length === 0) return;
  for (const newMatch of newMatches) {
    const { list, name, reference: fraudId, addresses, dateOfBirths } = newMatch;
    if (dateOfBirths.length > 0 && !dateOfBirths.find((dob) => dob.date === player.dateOfBirth)) return;
    if (addresses.length > 0 && !addresses.find((address) => address.country === player.countryId)) return;
    const details = { list, match: name, metadata };
    await addPlayerFraud(playerId, fraudKey, fraudId, details);
  }
  await pg('players')
    .update({
      allowTransactions: false,
      allowGameplay: false,
      loginBlocked: true,
    })
    .where({ id: playerId });
};

module.exports = {
  getUnchecked,
  getActive,
  getById,
  getFraudPoints,
  check,
  checkIpFraud,
  checkRegistrationFrauds,
  addFraud,
  addPlayerFraud,
  addPlayerFraudTx,
  applyMultipleSanction,
};
