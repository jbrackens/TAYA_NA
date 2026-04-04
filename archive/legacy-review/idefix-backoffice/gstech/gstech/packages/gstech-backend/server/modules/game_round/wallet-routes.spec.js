/* @flow */
const request = require('supertest');
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const app = require('../../wallet-server');
const { createSession } = require('../sessions');
const { createManufacturerSession } = require('../sessions');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');
const Limit = require('../limits/Limit');

describe('Player with limit set', () => {
  let playerId;
  const mSessionId = uuid();

  before(async () => {
    const { john } = await setup.players();
    playerId = john.id;
    await Limit.create({
      playerId,
      permanent: true,
      expires: null,
      reason: 'Player requested for weekly 30€ bet limit',
      type: 'bet',
      limitValue: 3000,
      periodType: 'weekly',
      userId: 1,
    });
    const session = await createSession(john, '1.2.3.4');
    await createManufacturerSession('NE', mSessionId, session.id, 'desktop', {});
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(20000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
  });

  it('Places a bet when limit is not hit', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/bet`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        amount: 2000,
        game: 'junglespirit_not_mobile_sw',
        closeRound: true,
        sessionId: mSessionId,
        gameRoundId: 'game-2',
        transactionId: 'tx-3',
        wins: [{ type: 'win', amount: 0 }],
      })
      .expect((res) => {
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset({
          balance: 18000,
          currencyId: 'EUR',
          ops: [
            {
              balance: 18000,
              realBalance: 18000,
              bonusBalance: 0,
              type: 'bet',
            },
            {
              balance: 18000,
              realBalance: 18000,
              bonusBalance: 0,
              type: 'win',
            },
          ],
        });
      })
      .expect(200));

  it('returns an error when limit is hit', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/bet`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        game: 'junglespirit_not_mobile_sw',
        amount: 2000,
        closeRound: true,
        sessionId: mSessionId,
        gameRoundId: 'game-1',
        transactionId: 'tx-1',
      })
      .expect(400)
      .expect(res => expect(res.body).to.containSubset({
        code: 10008,
      })));
});

describe('Game rounds wallet routes', () => {
  let playerId;
  const mSessionId = uuid();
  let manufacturerSessionId;

  before(async () => {
    const { john } = await setup.players();
    playerId = john.id;
    const session = await createSession(john, '1.2.3.4');
    manufacturerSessionId = await createManufacturerSession('NE', mSessionId, session.id, 'desktop', {});
  });

  it('Places a bet when no balance', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/bet`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        game: 'junglespirit_not_mobile_sw',
        amount: 50,
        closeRound: false,
        sessionId: mSessionId,
        gameRoundId: 'game-1',
        transactionId: 'tx-1',
      })
      .expect(400)
      .expect(res => expect(res.body).to.containSubset({
        code: 10006,
      })));

  it('credits some money to the account', async () => {
    const { transactionKey } = await startDeposit(playerId, 1, 2000);
    await processDeposit(2000, transactionKey, 'FI2112345600008739', null, 'external-id1', 'complete');
  });

  it('Places a bet with balance', async () =>
    request(app)
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
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset({
          balance: 1950,
          currencyId: 'EUR',
        });
      }));

  it('returns game round info', async () =>
    request(app)
      .get(`/api/v1/wallet/player/${playerId}/transactions`)
      .query({
        brandId: 'LD',
        manufacturer: 'NE',
        gameRoundId: 'game-2',
        transactionId: 'tx-2',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset([{
          amount: 50,
          bonusAmount: 0,
          type: 'bet',
          balance: 1950,
          bonusBalance: 0,
          currencyId: 'EUR',
        }]);
      }));

  it('returns game round transactions', async () =>
    request(app)
      .get(`/api/v1/wallet/player/${playerId}/round`)
      .query({
        manufacturer: 'NE',
        gameRoundId: 'game-2',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset([{
          amount: 50,
          bonusAmount: 0,
          subTransactionId: 0,
          type: 'bet',
          balance: 1950,
          bonusBalance: 0,
          currencyId: 'EUR',
        }]);
      }));

  it('Closes the round with empty win', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/win`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        game: 'junglespirit_not_mobile_sw',
        closeRound: false,
        sessionId: mSessionId,
        gameRoundId: 'game-2',
        transactionId: 'tx-3',
        wins: [{ type: 'win', amount: 0 }],
      })
      .expect((res) => {
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset({
          balance: 1950,
          currencyId: 'EUR',
        });
      })
      .expect(200));

  it('Finishes the round with multiple wins', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/win`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        game: 'junglespirit_not_mobile_sw',
        closeRound: false,
        sessionId: mSessionId,
        gameRoundId: 'game-3',
        transactionId: 'tx-4',
        wins: [{ type: 'win', amount: 50 }, { type: 'jackpot', amount: 10000 }, { type: 'freespins', amount: 10 }],
      })
      .expect((res) => {
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset({
          balance: 12010,
          currencyId: 'EUR',
        });
      })
      .expect(200));
  it('Closes the round', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/close`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        gameRoundId: 'game-3',
      })
      .expect((res) => {
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset({
          balance: 12010,
          currencyId: 'EUR',
        });
      })
      .expect(200));

  it('Plays round with big win', async () =>
    request(app)
      .post(`/api/v1/wallet/player/${playerId}/bet`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        amount: 2000,
        game: 'junglespirit_not_mobile_sw',
        closeRound: true,
        sessionId: mSessionId,
        gameRoundId: 'game-4',
        transactionId: 'tx-5',
        wins: [{ type: 'win', amount: 10000000 }],
      })
      .expect((res) => {
        expect(res.body.transactionId).to.not.equal(null);
        expect(res.body.gameRoundId).to.not.equal(null);
        expect(res.body).to.containSubset({
          balance: 10010010,
          currencyId: 'EUR',
        });
      })
      .expect(200));

  it('credits win to long pending round', async () => {
    const externalGameRoundId = uuid();
    const [gR] = await pg('game_rounds')
      .insert({
        manufacturerId: 'NE',
        externalGameRoundId,
        timestamp: '2018-01-01 00:00:00',
        manufacturerSessionId,
      })
      .returning('id');
    expect(gR.id).to.exist();
    await request(app)
      .post(`/api/v1/wallet/player/${playerId}/win`)
      .send({
        brandId: 'LD',
        manufacturer: 'NE',
        game: 'junglespirit_not_mobile_sw',
        closeRound: false,
        createGameRound: false,
        sessionId: mSessionId,
        gameRoundId: externalGameRoundId,
        transactionId: uuid(),
        wins: [{ type: 'win', amount: 50 }],
      })
      .expect((res) => {
        expect(res.body.gameRoundId).to.equal(gR.id);
        expect(res.body).to.containSubset({
          balance: 10010060,
          currencyId: 'EUR',
        });
      })
      .expect(200);
  });
});
