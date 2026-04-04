/* @flow */
const request = require('supertest');
const promiseLimit = require('promise-limit');
const app = require('../../index');
const { players: { john, jack, testPlayer } } = require('../../../scripts/utils/db-data');
const { create, addTag, getLifetimeDeposits } = require('../players/Player');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');

describe('session', () => {
  describe('Without active session', () => {
    let player;

    beforeEach(async () => {
      const { john: p } = await setup.players();
      player = p;
    });

    it('allows query with adhoc token', () =>
      request(app)
        .get('/api/LD/v1/balance')
        .set('Authorization', `Bearer ${player.username}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance).to.equal(0);
        }));

    it('existence of player can be checked with email address', async () =>
      request(app)
        .get('/api/LD/v1/players')
        .query({ email: john.email.toUpperCase() })
        .expect(200)
        .expect((res) => {
          expect(res.body.exists).to.equal(true);
        }));

    it('existence of player can be checked with mobile phone number', async () =>
      request(app)
        .get('/api/LD/v1/players')
        .query({ mobilePhone: `+${john.mobilePhone}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.exists).to.equal(true);
        }));

    it('returns false when nonexistent email is given', async () =>
      request(app)
        .get('/api/LD/v1/players')
        .query({ email: 'foo@bar.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.exists).to.equal(false);
        }));

    it('returns player and session token with valid login credentials', async () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({
          email: john.email,
          password: john.password,
          ipAddress: '94.222.17.20',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.player.firstName).to.equal(john.firstName);
          expect(res.body.token).to.not.equal(null);
        }));

    it('returns an error when trying to log in from blocked country', async () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '8.8.4.4' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(425);
        }));

    it('returns an error when trying to log in with invalid password', async () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: 'xxxxxxxx', ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(515);
        }));

    it('returns an error when trying to log in with invalid email', async () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: 'foo@bar.com', password: 'xxxxxxxx', ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(515);
        }));

    it('sets temporary blocking after four invalid login attempts', async () => {
      const login = (password: any | string) =>
        request(app)
          .post('/api/LD/v1/login')
          .send({ email: john.email, password, ipAddress: '94.222.17.20' });

      await Promise.all([
        login('xxxxxxxx').expect(400),
        login('xxxxxxxx').expect(400),
        login('xxxxxxxx').expect(400),
        login('xxxxxxxx').expect(400),
      ]);
      await login(john.password)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(521);
        });
    });

    it('operation with invalid token returns an error', () =>
      request(app)
        .get('/api/LD/v1/balance')
        .set(
          'Authorization',
          'Token Qn3DE8UIRwHryyhI2SqPq8peQgNKPgHY3yE1n4kQ6b1KJBk9q3fYS6bZiyjytmqz',
        )
        .expect(403));
  });

  describe('With rejected SOW', () => {
    let player;
    const limit = promiseLimit(1);
    const fakeDeposit = async (playerId: Id, amount: number) => {
      const { transactionKey: tx1 } = await startDeposit(playerId, 1, amount);
      await processDeposit(
        amount,
        tx1,
        `FI${407000000 + (Date.now() % 1000000)}`,
        null,
        `FI${407000000 + (Date.now() % 1000000)}`,
        'complete',
        'Message',
        null,
        null,
        null,
        200,
      );
    };

    before(async () => {
      const { john: p } = await setup.players();
      player = p;

      const ops = Array(20).fill(() => limit(() => fakeDeposit(player.id, 500000))); // 5000
      await Promise.all(ops.map((o) => o()));
      const { total } = await getLifetimeDeposits(player.id);
      expect(total).to.equal(10000000);
    });

    it('still allows login if SOW is pending review', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({
          email: john.email,
          password: john.password,
          ipAddress: '94.222.17.20',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.player.firstName).to.equal(john.firstName);
          expect(res.body.token).to.not.equal(null);
        }));

    it('disallows login for player if their SOW is rejected', async () => {
      await addTag(player.id, 'fail-sow');
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              code: 498,
            },
          });
        });
    });
  });

  describe('With blocked country', () => {
    let player;

    beforeEach(async () => {
      player = await create(testPlayer({ brandId: 'LD', countryId: 'US', currencyId: 'SEK' }));
    });

    it('disallows login for players registered with invalid country', async () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: player.email, password: jack.password, ipAddress: '94.222.17.20' })
        .expect(400)
        .expect((res) =>
          expect(res.body).to.containSubset({
            error: {
              code: 425,
            },
          }),
        ));
  });

  describe('with active session', () => {
    let headers;
    let player;
    let pinCode;

    beforeEach(async () => {
      const { john: p } = await setup.players();
      player = p;
      headers = await setup.login(app, john.email, john.password);
    });

    it('allows query with adhoc token', () =>
      request(app)
        .get('/api/LD/v1/balance')
        .set('Authorization', `Bearer ${player.username}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance).to.equal(0);
        }));

    it('session balance can be fetched with token', () =>
      request(app)
        .get('/api/LD/v1/balance')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance).to.equal(0);
        }));

    it('returns session statistics', () =>
      request(app)
        .get('/api/LD/v1/session')
        .set(headers)
        .expect(200)
        .expect((res) => {
          const { statistics } = res.body;
          expect(statistics.playTimeInMinutes).to.equal(0);
          expect(statistics.amountWin).to.equal(0);
          expect(statistics.amountLost).to.equal(0);
          expect(statistics.amountBet).to.equal(0);
        }));

    it('balance request fails after logout', async () => {
      await request(app).post('/api/LD/v1/logout').set(headers).expect(200);
      return request(app).get('/api/LD/v1/balance').set(headers).expect(403);
    });

    it('can request pin code login (mobilePhone)', async () =>
      request(app)
        .post('/api/LD/v1/login/request')
        .send({ mobilePhone: player.mobilePhone })
        .expect(200)
        .expect((res) => {
          pinCode = res.body.pinCode;
          expect(res.body.pinCode.toString().length).to.equal(6);
        }));

    it('can fail complete login with wrong code (mobilePhone)', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ mobilePhone: player.mobilePhone, pinCode: '12345', ipAddress: '94.222.17.20' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).to.equal(
            'Pin code is invalid or no longer active. Please try again or request a new one.',
          );
        }));

    it('can complete pin code login (mobilePhone)', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ mobilePhone: player.mobilePhone, pinCode, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          expect(res.body.player.id).to.equal(player.id);
        }));

    it('can fail when using same code twice (mobilePhone)', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ mobilePhone: player.mobilePhone, pinCode, ipAddress: '94.222.17.20' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).to.equal(
            'Pin code is invalid or no longer active. Please try again or request a new one.',
          );
        }));

    it('can request pin code login (email)', async () =>
      request(app)
        .post('/api/LD/v1/login/request')
        .send({ mobilePhone: player.mobilePhone })
        .expect(200)
        .expect((res) => {
          pinCode = res.body.pinCode;
          expect(res.body.pinCode.toString().length).to.equal(6);
        }));

    it('can fail complete login with wrong code (email)', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ email: player.email, pinCode: '12345', ipAddress: '94.222.17.20' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).to.equal(
            'Pin code is invalid or no longer active. Please try again or request a new one.',
          );
        }));

    it('can complete pin code login (email)', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ email: player.email, pinCode, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          expect(res.body.player.id).to.equal(player.id);
        }));

    it('can fail when using same code twice (email)', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ email: player.email, pinCode, ipAddress: '94.222.17.20' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).to.equal(
            'Pin code is invalid or no longer active. Please try again or request a new one.',
          );
        }));

    it('can fail login request when no mobilePhone neither email', async () =>
      request(app)
        .post('/api/LD/v1/login/request')
        .send({})
        .expect(500)
        .expect((res) => {
          expect(res.body.error.message).to.equal(
            'requestLoginHandler schema validation failed:\n{\n  "email": "Email is required",\n  "mobilePhone": "Mobile phone is required"\n}',
          );
        }));

    it('can fail login complete when no mobilePhone neither email', async () =>
      request(app)
        .post('/api/LD/v1/login/complete')
        .send({ pinCode, ipAddress: '94.222.17.20' })
        .expect(500)
        .expect((res) => {
          expect(res.body.error.message).to.equal(
            'completeLoginHandler schema validation failed:\n{\n  "email": "Email is required",\n  "mobilePhone": "Mobile phone is required"\n}',
          );
        }));

    it('can fail login request with invalid email', async () =>
      request(app)
        .post('/api/LD/v1/login/request')
        .send({ email: 'nonexisting@gmail.com' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).to.equal('Invalid login details');
        }));

    it('can fail login request with invalid mobilePhone', async () =>
      request(app)
        .post('/api/LD/v1/login/request')
        .send({ mobilePhone: '37254050540' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error.message).to.equal('Invalid login details');
        }));
  });
});
