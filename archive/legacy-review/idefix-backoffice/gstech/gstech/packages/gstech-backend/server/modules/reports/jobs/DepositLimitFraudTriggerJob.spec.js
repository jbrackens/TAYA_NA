/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const Player = require('../../players/Player');
const DepositLimitFraudTriggerJob = require('./DepositLimitFraudTriggerJob');
const Fraud = require('../../frauds/Fraud');
const { players: { testPlayer } } = require('../../../../scripts/utils/db-data');

describe('DepositLimitFraudTriggerJob', () => {
  let playerId;
  before(async () => {
    playerId = await Player.create(testPlayer({ brandId: 'LD' })).then(({ id }) => id);
  });

  it('can trigger fraud task for player with deposit limit reached', async () => {
    const points = await Fraud.getFraudPoints(playerId);
    expect(points).to.be.equal(0);

    await pg('players').update({ depositLimitReached: moment().add(-40, 'day') }).where({ id: playerId }).whereNull('depositLimitReached');
    await DepositLimitFraudTriggerJob.update();
    const points2 = await Fraud.getFraudPoints(playerId);
    expect(points2).to.be.equal(40);
  });
});
