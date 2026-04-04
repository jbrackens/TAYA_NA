/* @flow */
const request = require('supertest');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const app = require('../../index');

const Player = require('./Player');
const { queryPlayerEvents } = require('./PlayerEvent');
const { findOrCreateAccount } = require('../accounts');
const { addTransaction } = require('../payments/Payment');
const { createWithdrawal } = require('../payments/withdrawals/Withdrawal');
const { players: { john } } = require('../../../scripts/utils/db-data');

describe('Player without balance', () => {
  let player;
  beforeEach(async () => {
    const { jack } = await setup.players({ activated: false });
    player = jack;
  });

  it('can suspend player', () =>
    request(app)
      .delete(`/api/v1/player/${player.id}`)
      .send({
        note: 'Requested by player 123',
        accountClosed: false,
        reasons: [],
      })
      .expect(200));

  it('can close player because of gambling problem', () =>
    request(app)
      .delete(`/api/v1/player/${player.id}`)
      .send({
        note: 'Requested by player 123',
        accountClosed: true,
        reasons: ['gambling_problem'],
      })
      .expect(200));

  it('can close player because of gdpr data removal', async () => {
    await request(app)
      .delete(`/api/v1/player/${player.id}`)
      .send({
        note: 'Requested by player 123',
        accountClosed: true,
        reasons: ['data_removal'],
      })
      .expect(200);

    await request(app)
      .get(`/api/v1/player/${player.id}`)
      .expect(res => {
        expect(res.body).to.containSubset({
          firstName: 'Anonymized',
          lastName: 'Anonymized',
          username: `LD_${player.id}`,
          address: 'Anonymized',
          mobilePhone: '0000',
          city: 'Anonymized',
          email: 'anonymized@luckydino.com',
          dateOfBirth: '1900-01-01',
          postCode: '12345',
          countryId: 'XX',
          nationalId: '12334567890',
          placeOfBirth: 'Anonymized',
          nationality: 'XX',
          additionalFields: {},
        });
      })
      .expect(200);
  });

  it('can not close player because of gdpr data removal if player has payments', async () => {
    let headers = {};
    let transactionKey = '';
    await request(app)
      .post('/api/LD/v1/login')
      .send({ email: player.email, password: 'JackSparrow123', ipAddress: '94.222.17.20' })
      .expect(200)
      .expect((res) => {
        headers = { Authorization: `Token ${res.body.token}` };
      });

    await request(app)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
      .set(headers)
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

    await request(app)
      .post(`/api/LD/v1/deposit/${transactionKey}`)
      .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534', status: 'pending', rawTransaction: { id: 123, xxx: 'yyy' } })
      .expect(200);

    await request(app)
      .delete(`/api/v1/player/${player.id}`)
      .send({
        note: 'Requested by player 123',
        accountClosed: true,
        reasons: ['data_removal'],
      })
      .expect((res) =>
        expect(res.body).to.deep.equal({
          code: 564,
          error: 'Bad Request',
          message: 'Unable to anonymize account - player has real transaction',
          statusCode: 400,
        }),
      )
      .expect(400);
  });

  it('fails when trying to suspen player with balance on account', async () => {
      await pg.transaction(tx =>
        addTransaction(player.id, null, 'compensation', 5000, 'Added some money', 1, tx)
      );
      await request(app)
      .delete(`/api/v1/player/${player.id}`)
      .send({
        note: 'Requested by player 123',
        accountClosed: false,
        reasons: [],
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).to.equal(563);
      });
  });
});

describe('Player Routes', () => {
  let player;
  before(async () => {
    const { jack } = await setup.players({ activated: false });
    player = jack;
  });

  it('can get set of players by ids', () =>
    request(app)
      .get('/api/v1/player')
      .query({ playerIds: [player.id, '0'] })
      .expect((res) => {
        expect(res.body).to.containSubset([{
          id: player.id,
        }]);
      }));

  it('can set player\'s sticky note', () =>
    request(app)
      .post(`/api/v1/player/${player.id}/notes/sticky`)
      .send({
        content: 'Imma sticky note',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
        });
      }));

  it('can get player\'s sticky note', () =>
    request(app)
      .get(`/api/v1/player/${player.id}/notes/sticky`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          content: 'Imma sticky note',
        });
      }));

  it('can set player as a test player when player has no transactions', async () => {
    await request(app)
      .put(`/api/v1/player/${player.id}`)
      .send({ testPlayer: true, reason: 'test player' })
      .expect(200);

    const events = await queryPlayerEvents(player.id);
    expect(events).to.containSubset([
      {
        type: 'account',
        key: 'players.testPlayer',
        content: 'test player',
        title: 'Player flagged as test player',
      }
    ]);
  });

  it('can update player', async () => {
    await request(app)
      .put(`/api/v1/player/${player.id}`)
      .send({ city: 'Dublin' })
      .expect(200);
  });

  let transactionKey;
  let playerId;

  it('can get player\'s withdrawals', async () => {
    await clean.players();
    playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
    const accountId = await pg.transaction(async (tx) => {
      const acc = await findOrCreateAccount(playerId, 4, '444444xxxxxxxxx4444', null, 1, { paymentIqAccountId: 'bfd1fd22-134e-472b-865e-fb6bd7e269a2', provider: 'SafeCharge' }, tx);
      await addTransaction(playerId, null, 'compensation', 5000, 'Added some money', 1, tx);
      return acc;
    });
    transactionKey = await createWithdrawal(playerId, null, accountId, 2500);

    await request(app)
      .post('/api/v1/player/search/withdrawals')
      .send({
        query: '',
        brandId: 'LD',
        filters: { },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body[0].withdrawals).to.deep.equal([{
          amount: 2500,
          canAcceptWithDelay: true,
          delayedAcceptTime: null,
          id: transactionKey,
          timestamp: res.body[0].withdrawals[0].timestamp,
        }]);
      });
  });

  it('can get player\'s withdrawals that cant be no longer accepted with delay', async () => {
    await pg('payments').update({ timestamp: moment().subtract({ hours: 3 }) }).where({ transactionKey });

    await request(app)
      .post('/api/v1/player/search/withdrawals')
      .send({
        query: '',
        brandId: 'LD',
        filters: { },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body[0].withdrawals).to.deep.equal([{
          amount: 2500,
          canAcceptWithDelay: false,
          delayedAcceptTime: null,
          id: transactionKey,
          timestamp: res.body[0].withdrawals[0].timestamp,
        }]);
      });
  });

  it('cannot set player as a test player when player has transactions', async () => {
    await request(app)
      .put(`/api/v1/player/${playerId}`)
      .send({ testPlayer: true, reason: 'test player' })
      .expect((res) => {
        expect(res.body.message).to.deep.equal(errorCodes.PLAYER_HAS_TRANSACTIONS.message);
      })
      .expect(400);

  });

  it('can update player', async () => {
    await request(app)
      .put(`/api/v1/player/${playerId}`)
      .send({ city: 'Dublin' })
      .expect(200);
  });

  it('can get player\'s withdrawals that are accepted with delay', async () => {
    await request(app)
      .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}/delay`)
      .send({ paymentProviderId: 1, amount: 3000, parameters: { staticId: 123 } })
      .expect(200);

    await request(app)
      .post('/api/v1/player/search/withdrawals')
      .send({
        query: '',
        brandId: 'LD',
        filters: { },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body[0].withdrawals).to.deep.equal([{
          amount: 2500,
          canAcceptWithDelay: false,
          delayedAcceptTime: res.body[0].withdrawals[0].delayedAcceptTime,
          id: transactionKey,
          timestamp: res.body[0].withdrawals[0].timestamp,
        }]);

        expect(res.body[0].withdrawals[0].delayedAcceptTime).to.not.equal(undefined);
      });
  });

  it('can register player with gambling problem', async () => {
    await request(app)
      .post(`/api/v1/player/gamblingproblem`)
      .send({
        player: {
          email: 'someone@gmail.com',
          firstName: 'John',
          lastName: 'Smith',
          address: 'Misery Boulevard 13',
          postCode: '66666',
          city: 'Sadtown',
          countryId: 'FI',
          dateOfBirth: '1990-01-01',
          mobilePhone: '3588327463',
          nationalId: '78594789375983',
        },
        note: 'Extra note',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

    await request(app)
      .post('/api/LD/v1/login')
      .send({ email: 'someone@gmail.com', password: 'dummy_password', ipAddress: '94.222.17.20' })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).to.deep.equal(errorCodes.INVALID_LOGIN_DETAILS);
      });
  });

  it('can get error when register player with gambling problem that already exists', async () => {
    await request(app)
      .post(`/api/v1/player/gamblingproblem`)
      .send({
        player: {
          email: 'someone@gmail.com',
          firstName: 'John',
          lastName: 'Smith',
          address: 'Misery Boulevard 13',
          postCode: '66666',
          city: 'Sadtown',
          countryId: 'FI',
          dateOfBirth: '1990-01-01',
          mobilePhone: '3588327463',
          nationalId: '78594789375983',
        },
      })
      .expect((res) => {
        expect(res.body).to.containSubset({
          message: 'This email address is already registered.',
        });
      })
      .expect(400);
  });

  it('can register minimal player with gambling problem', async () => {
    await request(app)
      .post(`/api/v1/player/gamblingproblem`)
      .send({
        player: {
          email: 'someone2@gmail.com',
          firstName: 'John',
          lastName: 'Smith',
        },
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

    await request(app)
      .post('/api/LD/v1/login')
      .send({ email: 'someone2@gmail.com', password: 'dummy_password', ipAddress: '94.222.17.20' })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).to.deep.equal(errorCodes.INVALID_LOGIN_DETAILS);
      });
  });
});
