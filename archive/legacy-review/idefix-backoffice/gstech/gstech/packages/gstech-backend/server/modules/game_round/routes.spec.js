/* @flow */
const request = require('supertest');
const { v1: uuid } = require('uuid');
const app = require('../../index');
const walletApp = require('../../wallet-server');
const { createSession } = require('../sessions');
const { createManufacturerSession } = require('../sessions');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');

describe('Game rounds wallet routes', () => {
  let playerId;
  const mSessionId = uuid();
  let roundId;

  before(async () => {
    const { john } = await setup.players();
    playerId = john.id;
    const session = await createSession(john, '1.2.3.4');
    await createManufacturerSession('NE', mSessionId, session.id, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
  });

  it('plays a bet', async () =>
    request(walletApp)
      .post(`/api/v1/wallet/player/${playerId}/bet`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        game: 'junglespirit_not_mobile_sw',
        amount: 50,
        closeRound: false,
        sessionId: mSessionId,
        gameRoundId: 'game-2',
        transactionId: 'tx-2',
      })
      .expect(200)
      .expect((res) => {
        roundId = res.body.gameRoundId;
      }));

  it('cancels and refunds open round', async () =>
    request(app)
      .put(`/api/v1/game-rounds/${roundId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          closed: true,
        });
      }));
});
