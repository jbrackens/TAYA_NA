/* @flow */
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const request = require('supertest');
const nock = require('nock');  
const errorCodes = require('gstech-core/modules/errors/error-codes');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');
const { getActive } = require('../frauds/Fraud');
const { findByPlayerId } = require('../players/query');
const { queryPlayerEvents } = require('../players/PlayerEvent');
const Player = require('../players/Player');

const { players: { john: { email: johnEmail, password: johnPasswd } } } = require('../../../scripts/utils/db-data');

// nock.recorder.rec();
describe('Partial Logins', () => {
  let player;
  const playerRegisterData = {
    languageId: 'en',
    currencyId: 'EUR',
    countryId: 'FI',
    affiliateRegistrationCode: '100010_123123123123',
    ipAddress: '123.123.123.12', // TODO: redundant IP address
    registrationSource: 'lander0',
    tcVersion: 0,
  };
  const playerKYCData = {
    firstName: 'Sirja',
    lastName: 'Hiukka',
    address: 'Jykintie 85',
    postCode: '12345',
    city: 'Helsinki',
    countryId: 'FI',
    dateOfBirth: '1960-02-20',
    nationalId: 'FI200260-662S',
  };

  describe('Partial Login with deposit', () => {
    const transactionKey = uuid();
    let lastLogin;

    before(async () => {
      await clean.players();
    });

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('start partial login', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          bonusId:0,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        }));

    it('create partial player', async () =>{
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        });

      const p = await findByPlayerId(player.id, 1);
      expect(p).to.have.property('lastLogin');
      lastLogin = p?.lastLogin;
    });

    it('does not verify player after creation', () =>
      request(app)
        .get(`/api/v1/player/${player.id}/account-status`)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            verified: false,
          });
        }));

    it('complete partial login', async () => {
      await request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            player: {
              id: player.id,
            },
          });
        });

      const p = await findByPlayerId(player.id, 1);
      // $FlowIgnore[incompatible-call]
      expect(p).to.have.property('lastLogin').that.is.afterTime(lastLogin);
    });

    it('complete partial player', async () => {
      await request(app)
        .post(`/api/FK/v1/partial/player/${player.id}`)
        .send({
          email: 'john@luckydino.com',
          mobilePhone: '37254043091',
          allowSMSPromotions: false,
          allowEmailPromotions: true,
        })
        .expect(200)
        .expect((res) => {
          player = res.body;
        });
        const p = await findByPlayerId(player.id, 1);
        expect(p).to.containSubset({
          verified: true
        });
    });
  });

  // TODO: consider nesting this suite in previous one since it counts on previously created player
  describe('Partial Login with returning player deposit', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('can start partial login', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        }));

    it('create update partial player', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        }));

    it('complete partial login', () =>
      request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            player: {
              id: player.id,
              accountClosed: false,
            },
          });
        }));
  });

  describe('Partial Login with deposit and gambling problem', () => {
    const transactionKey = uuid();
    let gamblingProblemPlayer;

    before(async () => {
      const res = await setup.players({ gamblingProblem: true });
      gamblingProblemPlayer = res.john;
    });

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('start partial login', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        }));

    it('create partial player', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        }));

    it('complete partial login', () =>
      request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            player: {
              id: player.id,
            },
          });
        }));

    it('complete partial player', async () => {
      await request(app)
        .post(`/api/FK/v1/partial/player/${player.id}`)
        .send({
          email: gamblingProblemPlayer.email,
          mobilePhone: gamblingProblemPlayer.mobilePhone,
          allowSMSPromotions: false,
          allowEmailPromotions: true,
        })
        .expect(200);

        const p = await Player.getBalanceWithGameplay(player.id);
        expect(p).to.containSubset({
          allowGameplay: false,
        });
        const frauds = await getActive(player.id);
        expect(frauds).to.containSubset([{
            fraudKey: 'pnp_player_gambling_problem',
        }]);
    })
  });

  // TODO this can probably be replaced by later test "registerPartialPlayerHandler with no deposit"
  describe('Partial Login without deposit', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/login').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('start partial login', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 0,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        }));

    it('create update partial player', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              message: `The player has not deposited yet thus cannot be just logged in.`,
            },
          });
        }));
  });

  describe('Partial Login can\'t make use too old verified logins', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('start partial login', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        }));

    it('create partial player', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        }));

    it('complete partial login fails if login info is too old', async () => {
      await pg('partial_logins')
        .update({ timestamp: moment().subtract({ hour: 3 }) })
        .where({ transactionKey });

      await request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              message: `completePartialLoginHandler [${transactionKey}]: partialLogin is too old`,
            },
          });
        });
    });
  });

  describe('startPartialLoginHandler Error cases', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('does not allow countries not registered with brandId', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: { ...playerRegisterData, countryId: 'NE' }, // example countryId not in pg.countries
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: errorCodes.IP_BLOCKED_COUNTRY.message },
          });
        }));
    // TODO: add case for ipCountry && !ipCountry.registrationAllowed
  });

  describe('completePartialLoginHandler Error cases', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    beforeEach(async () => {
      await clean.players();
      await request(app) // startPartialLogin
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        });
      await request(app) // registerPartialPlayer
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        });
    });

    afterEach(async () => {
      await pg('partial_logins').where({ transactionKey }).del();
    });

    after(async () => {
      await clean.players();
    });

    it('returns error if no verified partial login is found', async () => {
      await pg('partial_logins')
        .where({ transactionKey, status: 'verified' })
        .update({ status: 'started' });
      await request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect(400);
    });

    it('returns error if partial login has no playerId', async () => {
      await pg('partial_logins')
        .where({ transactionKey, status: 'verified' })
        .update({ playerId: null });
      await request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              message: `completePartialLoginHandler [${transactionKey}]: partialLogin has no playerId`,
            },
          });
        });
    });
  });

  describe('registerPartialPlayerHandler Error cases', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/register').times(5).reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    beforeEach(async () => {
      await clean.players();
      await request(app) // startPartialLogin
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        });
    });

    afterEach(async () => {
      await pg('partial_logins').where({ transactionKey }).del();
    });

    after(async () => {
      await clean.players();
    });

    it('returns error if no verified partial login is found', async () => {
      await pg('partial_logins')
        .where({ transactionKey })
        .update({ status: 'failed' });
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: `partialLogin not found for transactionKey: ${transactionKey}` },
          });
        });
    });

    it('returns error on an invalid country', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: { ...playerKYCData, countryId: 'NE' }, // example countryId not in pg.countries
        })
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: errorCodes.IP_BLOCKED_COUNTRY.message },
          });
      }));

    it('returns error for invalid gambling age', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: { ...playerKYCData, dateOfBirth: '2020-02-20'},
        })
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: errorCodes.GAMBLING_AGE.message },
          });
      }));

    it('returns error if matching player is found with gambling problem', async () => {
      await setup.players({
        lastName: playerKYCData.lastName,
        dateOfBirth: playerKYCData.dateOfBirth,
        gamblingProblem: true,
      });
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(500)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: errorCodes.GAMBLING_PROBLEM.message },
          });
      });
    });

    it.skip('logs player fraud if IP country and registration country do not match', async () => {
      // TODO get clarification on handling IP of countries not registered to brandID
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        });
    });

    it('returns error if an invalid payment method is provided', async () => {
      await pg('partial_logins').where({ transactionKey }).update({ paymentMethod: '' })
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: errorCodes.INVALID_PAYMENT_METHOD,
          });
        });
    });
  });

  describe('registerPartialPlayerHandler with no deposit', () => {
    const transactionKey = uuid();

    nock('http://localhost:3007').post('/api/v1/login').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    before(async () => {
      await clean.players()
    })

    it('returns error when registering a player that has not deposited', async () => {
      await request(app) // startPartialLogin
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 0,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        });
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: { message: `The player has not deposited yet thus cannot be just logged in.` },
          });
        });
    });
  })

  describe('registerPartialPlayer with active exclusion', () => {
    const transactionKey = uuid();
    let headers;

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    beforeEach(async () => {
      await clean.players();
      await request(app) // startPartialLogin
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        });
    });

    afterEach(async () => {
      await pg('partial_logins').where({ transactionKey }).del();
    });

    // after(async () => {
    //   await clean.players();
    // });

    it('returns an error if the player has an exclusion set up', async () => {
      const { john } = await setup.players({
        countryId: 'FI',
        languageId: 'en',
        nationalId: 'FI200260-662S',
      });
      headers = await setup.login(app, johnEmail, johnPasswd)
      await request(app)
        .post('/api/LD/v1/exclusions') // FK endpoint returns 403
        .send({ days: 30, reason: 'Player requested for self exclusion.' })
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            result: [{ permanent: false }],
          });
        });
      await pg('players').where({id : john.id}).update({ brandId: "FK" });
      await request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(511);
          expect(res.body.exclusion.permanent).to.equal(false);
      });
      const events = await queryPlayerEvents(john.id);
      expect(events).to.containSubset([
        {
          type: "activity",
          key:"loginExclusionBlocked"
        }
      ])
    })
  })

  describe('completePartialPlayerHandler different name fraud', () => {
    const transactionKey = uuid();
    let differentNameSameDetailsPlayer

    before(async () => {
      await clean.players();
      const res = await setup.players();
      differentNameSameDetailsPlayer = res.john;
    });

    nock('http://localhost:3007').post('/api/v1/register').reply(200, {
      requiresFullscreen: false,
      url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
    });

    it('start partial login', () =>
      request(app)
        .post('/api/FK/v1/partial/login')
        .send({
          transactionKey,
          paymentMethod: 'Trustly',
          amount: 20000,
          player: playerRegisterData,
          urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
          client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            transactionKey,
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
            requiresFullscreen: false,
          });
        }));

    it('create partial player', () =>
      request(app)
        .post('/api/FK/v1/partial/player')
        .send({
          transactionKey,
          player: playerKYCData,
        })
        .expect(201)
        .expect((res) => {
          player = res.body.player;
          expect(res.body).to.containSubset({
            transactionKey,
            player: playerKYCData,
            isDeposit: true,
          });
        }));

    it('complete partial login', () =>
      request(app)
        .post(`/api/FK/v1/partial/login/${transactionKey}`)
        .send({
          ipAddress: '123.123.123.12',
          userAgent: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            player: {
              id: player.id,
            },
          });
        }));

    it('complete partial player', async () => {
      await request(app)
        .post(`/api/FK/v1/partial/player/${player.id}`)
        .send({
          email: differentNameSameDetailsPlayer.email,
          mobilePhone: differentNameSameDetailsPlayer.mobilePhone,
          allowSMSPromotions: false,
          allowEmailPromotions: true,
        })
        .expect(200)

        const frauds = await getActive(player.id);
        expect(frauds).to.containSubset([{
            fraudKey: 'same_details_different_name',
        }]);
    });
  });

  describe('completePartialPlayerHandler similar credentials fraud', () => {
    const tests = [
      {
        args: {
          email: 'john.doe@hotmail.com',
          mobilePhone: '3903944433231',
          allowSMSPromotions: false,
          allowEmailPromotions: true,
        },
        expected: { fraudKey: 'same_email_diff_phone' },
      },
      {
        args: {
          email: 'john.boe@hotmail.com',
          mobilePhone: '4903944433231',
          allowSMSPromotions: false,
          allowEmailPromotions: true,
        },
        expected: { fraudKey: 'same_phone_diff_email' },
      },
    ];

    before(async() => {
      await clean.players();
      await setup.players();
    });

    tests.forEach(({args, expected}) => {
      const transactionKey = uuid();

      nock('http://localhost:3007').post('/api/v1/register').reply(200, {
        requiresFullscreen: false,
        url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
      });

      it('start partial login', () =>
        request(app)
          .post('/api/FK/v1/partial/login')
          .send({
            transactionKey,
            paymentMethod: 'Trustly',
            amount: 20000,
            player: playerRegisterData,
            urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' },
            client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true },
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).to.containSubset({
              transactionKey,
              url: 'https://test.trustly.com/_/orderclient.php?SessionID=8f5c0ebb-037b-429d-9a8c-506ae19a4d34&OrderID=1253739675&Locale=en_FI',
              requiresFullscreen: false,
            });
          }));

      it('create partial player', () =>
        request(app)
          .post('/api/FK/v1/partial/player')
          .send({
            transactionKey,
            player: playerKYCData,
          })
          .expect(201)
          .expect((res) => {
            player = res.body.player;
            expect(res.body).to.containSubset({
              transactionKey,
              player: playerKYCData,
              isDeposit: true,
            });
          }));

      it('complete partial login', () =>
        request(app)
          .post(`/api/FK/v1/partial/login/${transactionKey}`)
          .send({
            ipAddress: '123.123.123.12',
            userAgent: '',
          })
          .expect((res) => {
            expect(res.body).to.containSubset({
              player: {
                id: player.id,
              },
            });
          }));

      it(`complete partial player expecting risk(${expected.fraudKey})`, async () => {
        await request(app)
          .post(`/api/FK/v1/partial/player/${player.id}`)
          .send(args)
          .expect(200)

        const frauds = await getActive(player.id);

        expect(frauds).to.containSubset([expected]);
      })
    });
  });
});
