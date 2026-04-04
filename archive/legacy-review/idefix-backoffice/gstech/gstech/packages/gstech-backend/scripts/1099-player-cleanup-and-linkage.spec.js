// @flow

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const sample = require('lodash/fp/sample');
const {
  closeSuspendedAccounts,
  linkAccounts,
  syncVerificationStatus,
  handleAbuseAccounts,
  handleGamblingProblemAccounts,
  handlePepAccounts,
  cleanUpPersonIds,
  triggerFraudTasks,
} = require('./1099-player-cleanup-and-linkage-functions');
const {
  players: { testPlayer },
} = require('./utils/db-data');
const { createPlayer } = require('../server/modules/players');
const { startDeposit, processDeposit } = require('../server/modules/payments/deposits/Deposit');
const Fraud = require('../server/modules/frauds/Fraud');

const fakePlayers = [
  { firstName: 'John', lastName: 'Doe', dateOfBirth: '1989-02-01' },
  { firstName: 'John', lastName: 'Doe', dateOfBirth: '1989-02-01' },
  { firstName: 'John', lastName: 'Doe', dateOfBirth: '1989-02-01' },
  { firstName: 'John', lastName: 'Doe', dateOfBirth: '1989-02-01' },
];

describe('IDXD-1081 Implement Cross-Brand Verification Logic for Player Accounts', () => {
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth, verified: index === 0 }));
      }
      const players = await pg('players');
      logger.debug('Players:', players);
      expect(players).to.have.length(fakePlayers.length);
      const verifiedPlayers = players.filter((player) => player.verified);
      expect(verifiedPlayers).to.have.length(1);
    } catch (error) {
      logger.error(error);
    }
  });

  it('Verifies users that are linked with other verified players', async () => {
    await linkAccounts(false);
    await syncVerificationStatus(false);
    const players = await pg('players');
    logger.debug('Players:', players);
    expect(players).to.have.length(fakePlayers.length);
    expect(players.every((player) => player.verified)).to.equal(true);
  });

  it('Do not verify any of the users that are linked with other players if none are verified', async () => {
    for (const [index, player] of fakePlayers.entries()) {
      const { firstName, dateOfBirth } = player;
      const lastName = 'Different';
      logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
      await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth, verified: false }));
    }
    await linkAccounts(false);
    await syncVerificationStatus(false);
    const players = await pg('players');
    logger.debug('Players:', players);
    expect(players).to.have.length(fakePlayers.length * 2);
    const unverifiedPlayers = players.filter((player) => !player.verified);
    expect(unverifiedPlayers).to.have.length(fakePlayers.length);
  });
});

describe('IDXD-1099 Player Clean Up - A1 Historical Account Linkage', () => {
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth, accountClosed: false, accountSuspended: true }));
      }
      const players = await pg('players');
      logger.debug('Players:', players);
      expect(players).to.have.length(fakePlayers.length);
    } catch (error) {
      logger.error(error);
    }
  });

  it('IDXD-1103 Closes accounts that were only suspended', async () => {
    await closeSuspendedAccounts(false);
    const players = await pg('players');
    expect(players).to.have.length(fakePlayers.length);
    const suspendedPlayers = players.filter((player) => player.accountSuspended);
    const closedPlayers = suspendedPlayers.filter((player) => player.accountClosed);
    expect(closedPlayers).to.have.length(fakePlayers.length);
  });

  it('IDXD-1098 A1 Link accounts with same name and date of birth historically', async () => {
    await linkAccounts(false);
    const personIds = await pg('players').distinct('personId').whereNotNull('personId');
    expect(personIds).to.have.length(1);
    const players = await pg('players');
    const { personId } = personIds[0];
    expect(players.every((player) => player.personId === personId)).to.equal(true);
  });
});

describe('IDXD-1099 Player Clean Up - A2 Abuse Accounts', () => {
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        await createPlayer(testPlayer({ brandId: index !== 0 ? 'LD' : 'CJ', firstName, lastName, dateOfBirth }));
      }
      await linkAccounts(false);
      const personIds = await pg('players').distinct('personId').whereNotNull('personId');
      expect(personIds).to.have.length(1);
      const players = await pg('players');
      expect(players).to.have.length(fakePlayers.length);
      const { personId } = personIds[0];
      expect(players.every((player) => player.personId === personId)).to.equal(true);
    } catch (error) {
      logger.error(error);
    }
  });

  it('IDXD-1099 A2 Close and Suspend linked abuse accounts', async () => {
    await handleAbuseAccounts(false);
    const players = await pg('players');
    expect(players).to.have.length(fakePlayers.length);
    const closedAndSuspendedPlayers = players.filter((player) => player.accountClosed && player.accountSuspended);
    expect(closedAndSuspendedPlayers).to.have.length(fakePlayers.length);
  });

  it('IDXD-1099 A2 Does not close accounts that have many accounts in same brand, but only one active', async () => {
    for (const [index, player] of fakePlayers.entries()) {
      logger.info(`[${index}] Creating test player ${index !== 0 ? 'closed' : 'open'}...`, player);
      await createPlayer(testPlayer({ brandId: 'LD', accountClosed: index !== 0 }));
    }
    await handleAbuseAccounts(false);
    const players = await pg('players');
    expect(players).to.have.length(2 * fakePlayers.length);
    const closedAndSuspendedPlayers = players.filter((player) => player.accountClosed && player.accountSuspended);
    expect(closedAndSuspendedPlayers).to.have.length(fakePlayers.length);
  });
});

describe('IDXD-1099 Player Clean Up - A3 Gambling Problem Accounts', () => {
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        await createPlayer(
          testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth, gamblingProblem: index === 0, accountClosed: index === 0, accountSuspended: index === 0 }),
        );
      }
      await linkAccounts(false);
      const personIds = await pg('players').distinct('personId').whereNotNull('personId');
      expect(personIds).to.have.length(1);
      const players = await pg('players');
      expect(players).to.have.length(fakePlayers.length);
      const { personId } = personIds[0];
      expect(players.filter((player) => player.personId === personId)).to.have.length(fakePlayers.length);
    } catch (error) {
      logger.error(error);
    }
  });

  it('IDXD-1099 A3 Close and Suspend linked gambling problem accounts', async () => {
    await handleGamblingProblemAccounts(false);
    const players = await pg('players');
    expect(players).to.have.length(fakePlayers.length);
    logger.debug('IDXD-1099 A3 Close and Suspend linked gambling problem accounts Players:', players);
    expect(players.every((player) => player.accountClosed && player.accountSuspended && player.gamblingProblem)).to.equal(true);
  });
});

describe('IDXD-1099 Player Clean Up - A4 PEP Accounts', () => {
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth }));
      }
      await linkAccounts(false);
      const personIds = await pg('players').distinct('personId').whereNotNull('personId');
      expect(personIds).to.have.length(1);
      const players = await pg('players');
      expect(players).to.have.length(fakePlayers.length);
      const { personId } = personIds[0];
      expect(players.filter((player) => player.personId === personId)).to.have.length(fakePlayers.length);
    } catch (error) {
      logger.error(error);
    }
  });

  it('IDXD-1099 A4 PEP - raise risk of linked accounts', async () => {
    const firstPlayer = await pg('players').first();
    await pg('players').update({ pep: true, riskProfile: 'high' }).where({ id: firstPlayer.id });
    await handlePepAccounts(false);
    const players = await pg('players');
    logger.debug('IDXD-1099 A4 PEP - raise risk of linked accounts Players:', players);
    expect(players).to.have.length(fakePlayers.length);
    expect(players.every((player) => player.pep && player.riskProfile === 'high')).to.equal(true);
  });
});

describe('IDXD-1099 Player Clean Up - Clean up persons table', () => {
  const excessPersonIds = [];
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth }));
      }
      await linkAccounts(false);
      for (let i = 0; i < 10; i += 1) {
        const [{ id }] = await pg('persons').insert({}).returning('id');
        excessPersonIds.push(id);
      }
      const personIds = await pg('players').distinct('personId').whereNotNull('personId');
      expect(personIds).to.have.length(1);
      const players = await pg('players');
      expect(players).to.have.length(fakePlayers.length);
      const { personId } = personIds[0];
      expect(players.filter((player) => player.personId === personId)).to.have.length(fakePlayers.length);
    } catch (error) {
      logger.error(error);
    }
  });

  it('IDXD-1099 Clean up persons table', async () => {
    await cleanUpPersonIds(false);
    const persons = await pg('persons');
    logger.debug('IDXD-1099 Clean up persons table Persons:', persons);
    expect(persons).to.have.length(1);
  });
});

describe('IDXD-1099 Player Clean Up - Trigger Fraud Tasks', () => {
  const playerIds = [];
  const excessPersonIds = [];
  beforeEach(async () => {
    try {
      logger.info(`Cleaning up players database, and loading ${fakePlayers.length} fake players...`, fakePlayers);
      await clean.players();
      await pg('persons').del();
      for (const [index, player] of fakePlayers.entries()) {
        const { firstName, lastName, dateOfBirth } = player;
        logger.info(`[${index}] Creating player ${firstName} ${lastName} (${dateOfBirth})...`, player);
        const { id } = await createPlayer(testPlayer({ brandId: sample(['LD', 'CJ']), firstName, lastName, dateOfBirth }));
        playerIds.push(id);
      }
      const { transactionKey: tx1 } = await startDeposit(playerIds[1], 1, 1000_00);
      const { transactionKey: tx3 } = await startDeposit(playerIds[3], 1, 1000_00);

      await processDeposit(1000_00, tx1, 'FI2112345600008739', null, 'external-id_2k_1', 'complete', 'Message', null, null, null, 2_00);
      await processDeposit(1000_00, tx3, 'FI2112345600008739', null, 'external-id_2k_2', 'complete', 'Message', null, null, null, 2_00);

      await linkAccounts(false);
      for (let i = 0; i < 10; i += 1) {
        const [{ id }] = await pg('persons').insert({}).returning('id');
        excessPersonIds.push(id);
      }
      const personIds = await pg('players').distinct('personId').whereNotNull('personId');
      expect(personIds).to.have.length(1);
      const players = await pg('players');
      expect(players).to.have.length(fakePlayers.length);
      const { personId } = personIds[0];
      expect(players.filter((player) => player.personId === personId)).to.have.length(fakePlayers.length);
      const frauds = await pg('frauds');
      expect(frauds).to.have.length(0);
    } catch (error) {
      logger.error(error);
    }
  });

  it('IDXD-1099 Triggers frauds', async () => {
    const fraudFreePlayerIds = [];
    for (const [index, player] of fakePlayers.entries()) {
      logger.info(`[${index}] Creating extra test player...`, player);
      const { id } = await createPlayer(testPlayer({ brandId: 'LD' }));
      fraudFreePlayerIds.push(id);
    }
    for (const playerId of playerIds) {
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);
    }

    await triggerFraudTasks(false);

    for (const playerId of playerIds) {
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);
    }
    for (const playerId of fraudFreePlayerIds) {
      const frauds = await Fraud.getUnchecked(playerId);
      expect(frauds).to.not.containSubset([{ fraudKey: 'lifetime_deposit_2k', fraudId: `` }]);
    }
  });
});
