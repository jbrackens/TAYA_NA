/* @flow */
const request = require('supertest');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');
const { players: mockPlayers } = require('../../../scripts/utils/db-data');
const { cleanUpPlayers } = require('../../../scripts/utils/db');
const { addTag, getLifetimeDeposits } = require('./Player');
const Person = require('../persons/Person');
const Fraud = require('../frauds/Fraud');
const { startDeposit, processDeposit } = require('../payments/deposits/Deposit');

const { john, testPlayer } = mockPlayers;

describe('players', () => {
  describe('Player with invalid affiliate code', () => {
    let player;

    before(async () => {
      const { jack } = await setup.players({ affiliateRegistrationCode: '10123_12312312123132' });
      player = jack;
    });

    it('sets btag but affiliateId is null', async () =>
      request(app)
        .get(`/api/v1/player/${player.id}/registration-info`)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            affiliateId: null,
            affiliateName: null,
            affiliateRegistrationCode: '10123_12312312123132',
            registrationCountry: 'DE',
            ipAddress: '195.163.47.141',
            registrationIP: '195.163.47.141 (GB)',
          });
        }));
  });
  describe('GET /player', () => {
    let player;

    before(async () => {
      const { jack } = await setup.players({ activated: false });
      player = jack;
    });

    it('returns player with specified id', async () =>
      request(app)
        .get(`/api/v1/player/${player.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).to.equal(player.id);
          expect(res.body).to.containSubset({
            activated: false,
            address: 'Fugger Strasse 56',
            allowEmailPromotions: true,
            allowSMSPromotions: true,
            brandId: 'LD',
            city: 'Dessau',
            countryId: 'DE',
            nationalId: '36589852554745',
            currencyId: 'EUR',
            dateOfBirth: '1989-02-01',
            email: 'jack.sparrow@gmail.com',
            firstName: 'Jack',
          });
        }));

    it('returns player financial info with specified id', async () =>
      request(app)
        .get(`/api/v1/player/${player.id}/financial-info`)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            balance: '€0.00',
            bonusBalance: '€0.00',
            totalBalance: '€0.00',
            totalBetAmount: '€0.00',
            totalWinAmount: '€0.00',
            rtp: '-',
            depositCount: 0,
            withdrawalCount: 0,
            totalDepositAmount: '€0.00',
            totalWithdrawalAmount: '€0.00',
          });
        }));

    it('returns player registration info with specified id', async () =>
      request(app)
        .get(`/api/v1/player/${player.id}/registration-info`)
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            affiliateId: '100010',
            affiliateName: 'Test Affiliate',
            affiliateRegistrationCode: '100010_123123123123',
            registrationCountry: 'DE',
            ipAddress: '195.163.47.141',
            registrationIP: '195.163.47.141 (GB)',
          });
        }));
  });

  describe('Register a player, sms activation', () => {
    before(async () => clean.players());
    let pinCode;

    it('can fail request player registration without mobilePhone', async () =>
      request(app)
        .post('/api/LD/v1/register/request')
        .send({ })
        .expect(500)
        .expect(({ body }) => expect(body.error.message).to.contain('requestPlayerRegistrationHandler schema validation failed')));

    it('request player registration', async () =>
      request(app)
        .post('/api/LD/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200));

    it('can fail complete player registration with wrong pinCode', async () =>
      request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: john, mobilePhone: john.mobilePhone, pinCode: '123456' })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.message).to.equal('Pin code is invalid or no longer active. Please try again or request a new one.')));

    it('can fail complete player registration with wrong mobilePhone', async () =>
      request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: john, mobilePhone: '37254050540', pinCode })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.message).to.equal('Pin code is invalid or no longer active. Please try again or request a new one.')));

    it('can fail complete player registration with missing player data', async () =>
      request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: { }, mobilePhone: john.mobilePhone, pinCode })
        .expect(400)
        .expect(({ body }) => expect(body.error.message).to.contain('Invalid input')));

    it('complete player registration', async () =>
      request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: john, mobilePhone: john.mobilePhone, pinCode })
        .expect(201)
        .expect((res) => {
          expect(res.body).to.containSubset({
            player: {
              firstName: 'John',
              lastName: 'Doe',
              testPlayer: false,
            },
          });
        }));
  });

  describe('Register a player', () => {
    let player;
    before(async () => clean.players());

    it('creates player', async () =>
      request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(201)
        .expect((res) => { player = res.body.player; })
        .expect(res => expect(res.body.player).to.containSubset({
          firstName: 'John',
          lastName: 'Doe',
        })));

    it('returns an error when trying to create player with duplicate email', async () =>
      request(app)
        .post('/api/LD/v1/players')
        .send(testPlayer({ email: john.email.toUpperCase() }))
        .expect(400)
        .expect(res => expect(res.body.error).to.containSubset({
          code: 461,
          message: 'This email address is already registered.',
        })));

    it('returns an error when trying to create player with duplicate mobile phone number', async () =>
      request(app)
        .post('/api/LD/v1/players')
        .send(testPlayer({ mobilePhone: john.mobilePhone }))
        .expect(400)
        .expect(res => expect(res.body.error).to.containSubset({
          code: 482,
          message: 'Phone number already exists',
        })));

    it('returns an error when trying to create player with identical details', async () =>
      request(app)
        .post('/api/LD/v1/players')
        .send({ ...john, firstName: `${john.firstName} ` })
        .expect(400)
        .expect(res => expect(res.body.error).to.contain({
          code: 481,
          message: 'Player already exists',
        })));

    it('returns an error when trying to create player with identical details with whitespace in address', async () =>
      request(app)
        .post('/api/LD/v1/players')
        .send({ ...john, email: 'mack.sparrow@gmail.com', mobilePhone: '490394573231', address: 'Knesebeckstraße  98' })
        .expect(400)
        .expect(res => expect(res.body.error).to.contain({
          code: 481,
          message: 'Player already exists',
        })));

    it('returns an error when trying to create player with identical details with whitespace in the end of address', async () =>
      request(app)
        .post('/api/LD/v1/players')
        .send({ ...john, email: 'mack.sparrow@gmail.com', mobilePhone: '490394573231', address: 'Knesebeckstraße 98 ' })
        .expect(400)
        .expect(res => expect(res.body.error).to.contain({
          code: 481,
          message: 'Player already exists',
        })));


    it('returns bad request error if body does not contain firstName', () => {
      const badPlayerDraft = testPlayer({ firstName: '' });
      return request(app)
        .post('/api/LD/v1/players')
        .send(badPlayerDraft)
        .expect(400);
    });

    it('returns bad request error if phone number is invalid', () => {
      const badPlayerDraft = testPlayer({ mobilePhone: '555' });
      return request(app)
        .post('/api/LD/v1/players')
        .send(badPlayerDraft)
        .expect(400);
    });

    it('returns an error when trying to register with ip from blocked country', () => {
      const badPlayerDraft = testPlayer({ ipAddress: '8.8.4.4' });

      return request(app)
        .post('/api/LD/v1/players')
        .send(badPlayerDraft)
        .expect(400)
        .expect(res => expect(res.body.error).to.contain({
          code: 495,
          message: 'Restricted country IP address, registration disallowed',
        }));
    });

    it('returns an error when player does not meet age requirements for country', () => {
      // Hi future person! This test will fail year 2024!
      const badPlayerDraft = testPlayer({ countryId: 'EE', dateOfBirth: '2005-01-14' });

      return request(app)
        .post('/api/LD/v1/players')
        .send(badPlayerDraft)
        .expect(400);
    });

    it('allows closure of player account', async () =>
      request(app)
        .put(`/api/v1/player/${player.id}/account-status`)
        .send({ accountClosed: true })
        .expect(200)
        .expect(res => expect(res.body).deep.contain({
          activated: true,
          allowGameplay: true,
          allowTransactions: true,
          verified: false,
          loginBlocked: false,
          accountClosed: true,
        })));
    it('disallows login of closed account', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: john.ipAddress })
        .expect(400));

    it('allows registration with same details', () =>
      request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(201)
        .expect(res => expect(res.body.player.id).to.not.equal(player.id))
        .expect(res => expect(res.body.player).to.contain({
          firstName: 'John',
          lastName: 'Doe',
        })));

    it('returns an error when trying to enable disabled account when new player exists with same details', () =>
      request(app)
        .put(`/api/v1/player/${player.id}/account-status`)
        .send({ accountClosed: false })
        .expect(400)
        .expect(res => expect(res.body).deep.contain({
          activated: true,
          allowGameplay: true,
          allowTransactions: true,
          verified: false,
          loginBlocked: false,
          accountClosed: true,
        })));
  });

  describe('Register a test player', () => {
    before(async () => clean.players());
    let pinCode;

    it('request player registration', async () =>
      request(app)
        .post('/api/LD/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200));

    it('complete test player registration if player email ends with @luckydino.com', async () =>
      request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: { ...john, email: john.email.replace('hotmail.com', 'luckydino.com') }, mobilePhone: john.mobilePhone, pinCode })
        .expect(201)
        .expect((res) => {
          expect(res.body).to.containSubset({
            player: {
              firstName: 'John',
              lastName: 'Doe',
              testPlayer: true,
            },
          });
        }));
  });

  describe('Register same person player', () => {
    before(async () => clean.players());
    let pinCode;

    it('request player registration', async () =>
      request(app)
        .post('/api/LD/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200));

    it('complete test player registration', async () => {
      let playerId = 0;
      await request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: { ...john, email: john.email }, mobilePhone: john.mobilePhone, pinCode })
        .expect(201)
        .expect((res) => {
          playerId = res.body.player.id;
          expect(res.body).to.containSubset({
            player: {
              firstName: 'John',
              lastName: 'Doe',
            },
          });
        });

        const person = await Person.getConnectedPlayers(pg, playerId);
        expect(person.length).to.be.equal(0);
      });

    it('request player registration on different brand', async () =>
      request(app)
        .post('/api/CJ/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200));

    it('complete test player registration on different brand', async () => {
      let playerId = 0;
      await request(app)
        .post('/api/CJ/v1/register/complete')
        .send({
          playerDraft: { ...john, email: john.email },
          mobilePhone: john.mobilePhone,
          pinCode,
        })
        .expect(201)
        .expect((res) => {
          playerId = res.body.player.id;
          expect(res.body).to.containSubset({
            player: {
              firstName: 'John',
              lastName: 'Doe',
            },
          });
        });

        const person = await Person.getConnectedPlayers(pg, playerId);
        expect(person).to.containSubset([{
          email: 'john.doe@hotmail.com',
          firstName: 'John',
          lastName: 'Doe',
        }]);
      });
  });

  describe('Register same person player, but different name', () => {
    before(async () => clean.players());
    let pinCode;

    it('request player registration', async () =>
      request(app)
        .post('/api/LD/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200));

    it('complete test player registration', async () => {
      let playerId = 0;
      await request(app)
        .post('/api/LD/v1/register/complete')
        .send({ playerDraft: { ...john, email: john.email }, mobilePhone: john.mobilePhone, pinCode })
        .expect(201)
        .expect((res) => {
          playerId = res.body.player.id;
          expect(res.body).to.containSubset({
            player: {
              firstName: 'John',
              lastName: 'Doe',
            },
          });
        });

        const person = await Person.getConnectedPlayers(pg, playerId);
        expect(person.length).to.be.equal(0);
      });

    it('request player registration on different brand', async () =>
      request(app)
        .post('/api/CJ/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200));

    it('complete test player registration on different brand', async () => {
      let playerId = 0;
      await request(app)
        .post('/api/CJ/v1/register/complete')
        .send({
          playerDraft: { ...john, firstName: 'Joe', email: john.email },
          mobilePhone: john.mobilePhone,
          pinCode,
        })
        .expect(201)
        .expect((res) => {
          playerId = res.body.player.id;
          expect(res.body).to.containSubset({
            player: {
              firstName: 'Joe',
              lastName: 'Doe',
            },
          });
        });

        const person = await Person.getConnectedPlayers(pg, playerId);
        expect(person.length).to.be.equal(1);

        const points2 = await Fraud.getUnchecked(playerId);
        expect(points2).to.containSubset([
          {
            fraudKey: 'same_details_different_name',
          }
        ]);
      });
  });

  describe('Register same person with same mail but different mobilePhone', () => {
    beforeEach(async () => setup.players());
    afterEach(async () => clean.players())

    const tests = [
      {
        args: {
          playerDraft: { ...john, email: 'john.boe@hotmail.com' },
          mobilePhone: john.mobilePhone
        },
        expected: { fraudKey: 'same_phone_diff_email' },
      },
      {
        args: {
          playerDraft: { ...john, mobilePhone: '4903944433239' },
          mobilePhone: '4903944433239'
        },
        expected: { fraudKey: 'same_email_diff_phone' },
      },
    ];

    tests.forEach(({args, expected}) => {
      let pinCode;
      let playerId;

      it(`complete test player registration expecting risk(${expected.fraudKey})`, async () => {
        await request(app)
          .post('/api/LD/v1/register/request')
          .send({ mobilePhone: args.mobilePhone })
          .expect((res) => {
            pinCode = res.body.pinCode;
          })
          .expect(200);

        await request(app)
          .post('/api/CJ/v1/register/complete')
          .send({ ...args, pinCode })
          .expect((res) => {
            playerId = res.body.player.id
            expect(res.body).to.containSubset({
              player: {
                firstName: john.firstName,
                lastName: john.lastName,
              },
            });
          })
          .expect(201);

        const points2 = await Fraud.getUnchecked(playerId);
        expect(points2).to.containSubset([ expected ]);
      });
    });
  });

  describe('gambling problem', () => {
    let player;
    before(async () => {
      await clean.players();
      await request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(201)
        .expect((res) => { player = res.body.player; })
        .expect(res => expect(res.body.player).to.contain({
          firstName: 'John',
          lastName: 'Doe',
        }));
      await request(app)
        .delete(`/api/v1/player/${player.id}`)
        .send({ reasons: ['gambling_problem'], accountClosed: false, note: 'Self exclusion' });
    });

    it('disallows login of closed account', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: john.ipAddress })
        .expect(400));

    it('disallows registration with same details to other brand', () =>
      request(app)
        .post('/api/CJ/v1/players')
        .send(john)
        .expect(400)
        .expect(res => expect(res.body.error.code).to.equal(512)));
  });

  describe('clousure with fraudulent', () => {
    let player;
    before(async () => {
      await clean.players();
      await request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(201)
        .expect((res) => { player = res.body.player; })
        .expect(res => expect(res.body.player).to.contain({
          firstName: 'John',
          lastName: 'Doe',
        }));
      await request(app)
        .delete(`/api/v1/player/${player.id}`)
        .send({ reasons: ['fraudulent'], accountClosed: true, note: 'Note' });
    });

    it('disallows registration with same details to same brand', () =>
      request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(400)
        .expect(res => expect(res.body.error.code).to.equal(499)));

    it('disallows registration with same details to other brand', () =>
      request(app)
        .post('/api/CJ/v1/players')
        .send(john)
        .expect(400)
        .expect(res => expect(res.body.error.code).to.equal(499)));
  });

  describe('gambling problem with account closed', () => {
    let player;
    before(async () => {
      await clean.players();
      await request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(201)
        .expect((res) => { player = res.body.player; })
        .expect(res => expect(res.body.player).to.contain({
          firstName: 'John',
          lastName: 'Doe',
        }));
      await request(app)
        .delete(`/api/v1/player/${player.id}`)
        .send({ reasons: ['gambling_problem'], accountClosed: true, note: 'Gambling problem' });
    });

    it('disallows login of closed account', () =>
      request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: john.ipAddress })
        .expect(400));

    it('disallows registration with same details to other brand', () =>
      request(app)
        .post('/api/CJ/v1/players')
        .send(john)
        .expect(400)
        .expect(res => expect(res.body.error.code).to.equal(512)));
  });


  describe('gambling problem', () => {
    let player;
    before(async () => {
      await clean.players();
      await request(app)
        .post('/api/LD/v1/players')
        .send(john)
        .expect(201)
        .expect((res) => { player = res.body.player; });
      await request(app)
        .post('/api/CJ/v1/players')
        .send(john)
        .expect(201);
      await request(app)
        .delete(`/api/v1/player/${player.id}`)
        .send({ reasons: ['gambling_problem'], accountClosed: false, note: 'Self exclusion' })
        .expect(200);
    });

    it('disallows login to account on other brand', () =>
      request(app)
        .post('/api/CJ/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: john.ipAddress })
        .expect(400));
  });

  describe('PUT /players', () => {
    it('updates specified fields', async () => {
      const players = await setup.players();

      const { body: player } = await request(app)
        .put(`/api/v1/player/${players.john.id}`)
        .send({ firstName: 'Bob' })
        .expect(200);

      expect(player).to.containSubset({
        firstName: 'Bob',
      });
    });
  });

  describe('POST /player/search/all', () => {
    let player;

    before(async () => {
      const { jack } = await setup.players();
      player = jack;
    });

    it('returns player when searching with username', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: player.username })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([{
            id: player.id,
          }]);
        }));

    it('returns player when searching with email', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: player.email })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([{
            id: player.id,
          }]);
        }));

    it('returns player when searching with brand id', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: '', brandId: player.brandId })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([{
            id: player.id,
          }]);
        }));

    it('does not return player when searching with invalid brand id', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: '', brandId: 'XX' })
        .expect(200)
        .expect((res) => {
          expect(res.body.length).to.equal(0);
        }));

    it('returns player when searching with NetEnt id', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: `LD_${player.id}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body).to.containSubset([{
            id: player.id,
          }]);
        }));

    it('returns player when searching with mobile phone number', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: `+${player.mobilePhone}` })
        .expect(200)
        .expect((res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body).to.containSubset([{
            id: player.id,
          }]);
        }));

    it('returns players matching query that includes name and part of last name', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: 'John D' })
        .expect(200)
        .expect((res) => {
          expect(res.body[0]).to.containSubset({
            firstName: 'John',
            lastName: 'Doe',
          });
        }));

    it('returns players matching query that almost matches name', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: 'jak sorrow' })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([
            { firstName: 'Jack', lastName: 'Sparrow' },
          ]);
        }));

    it('returns empty array if query does not match any players', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: 'Edward' })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([]);
        }));

    it('returns all players if query is empty', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: '' })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([
            { firstName: 'John', lastName: 'Doe' },
            { firstName: 'Jack', lastName: 'Sparrow' },
          ]);
        }));
  });

  describe('POST /player/search/all (blocked country)', () => {
    before(() => setup.players({ countryId: 'US' }));

    it('do not return blocker countries if filters property is not set', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: '' })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([]);
        }));

    it('do not return blocker countries if closed is false', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: '', filters: { closed: false } })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([]);
        }));

    it('returns all players if closed is true', () =>
      request(app)
        .post('/api/v1/player/search/all')
        .send({ query: '', filters: { closed: true } })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([
            { firstName: 'John', lastName: 'Doe' },
            { firstName: 'Jack', lastName: 'Sparrow' },
          ]);
        }));
  });

  describe('Non-logged in player', () => {
    let player;
    let pinCode;

    before(async () => {
      const { jack } = await setup.players();
      player = jack;
    });

    it('requests password reset code', async () => {
      await request(app)
        .post('/api/LD/v1/reset-password')
        .send({ email: player.email })
        .expect(200)
        .expect(({ body }) => {
          pinCode = body.passwordResetCode;
        });
    });

    it('sets new password with reset code', async () =>
      await request(app)
        .post(`/api/LD/v1/reset-password/${pinCode}`)
        .send({ newPassword: 'foobar333' })
        .expect(200));

    it('returns an error if same reset code is used for second time', async () =>
      await request(app)
        .post(`/api/LD/v1/reset-password/${pinCode}`)
        .send({ newPassword: 'foobar321' })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.code).to.equal(472)));

    it('can fail requests password reset with wrong mobilePhone and dob combination', async () => {
      await request(app)
        .post('/api/LD/v1/password/reset/request')
        .send({ mobilePhone: '37254050540', dateOfBirth: player.dateOfBirth })
        .expect(404)
        .expect(({ body: { error } }) => expect(error.code).to.equal(515));
    });

    it('requests password reset pin code (mobilePhone)', async () => {
      await request(app)
        .post('/api/LD/v1/password/reset/request')
        .send({ mobilePhone: player.mobilePhone, dateOfBirth: player.dateOfBirth })
        .expect(200)
        .expect(({ body }) => {
          pinCode = body.pinCode;
        });
    });

    it('returns an error if pin code not match mobilePhone', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ mobilePhone: '37254050540', pinCode, newPassword: 'foobar321' })
        .expect(404)
        .expect(({ body: { error } }) => expect(error.code).to.equal(515)));

    it('returns an error if pin code is wrong (mobilePhone)', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ mobilePhone: player.mobilePhone, pinCode: '1234', newPassword: 'foobar321' })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.code).to.equal(473)));

    it('sets new password with reset pin code (mobilePhone)', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ mobilePhone: player.mobilePhone, pinCode, newPassword: 'foobar333' })
        .expect(200)
        .expect(({ body }) => expect(body).to.deep.equal({
          ok: true,
          mobilePhone: player.mobilePhone,
        })));

    it('returns an error if same reset pin code is used for second time (mobilePhone)', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ mobilePhone: player.mobilePhone, pinCode, newPassword: 'foobar321' })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.code).to.equal(473)));

    it('can fail request password reset with wrong email and dob combination', async () => {
      await request(app)
        .post('/api/LD/v1/password/reset/request')
        .send({ email: 'nonexisting@gmail.com', dateOfBirth: player.dateOfBirth })
        .expect(404)
        .expect(({ body: { error } }) => expect(error.code).to.equal(515));
    });

    it('requests password reset pin code (email)', async () => {
      await request(app)
        .post('/api/LD/v1/password/reset/request')
        .send({ email: player.email, dateOfBirth: player.dateOfBirth })
        .expect(200)
        .expect(({ body }) => {
          pinCode = body.pinCode;
        });
    });

    it('returns an error if pin code not match email', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ email: 'nonexisting@gmail.com', pinCode, newPassword: 'foobar321' })
        .expect(404)
        .expect(({ body: { error } }) => expect(error.code).to.equal(515)));

    it('returns an error if pin code is wrong (email)', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ email: player.email, pinCode: '1234', newPassword: 'foobar321' })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.code).to.equal(473)));

    it('sets new password with reset pin code (email)', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ email: player.email, pinCode, newPassword: 'foobar333' })
        .expect(200)
        .expect(({ body }) => expect(body).to.deep.equal({
          ok: true,
          mobilePhone: player.mobilePhone,
        })));

    it('returns an error if same reset pin code is used for second time (email)', async () =>
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ email: player.email, pinCode, newPassword: 'foobar321' })
        .expect(400)
        .expect(({ body: { error } }) => expect(error.code).to.equal(473)));

    it('can fail password reset request if neither email nor mobile phone provided', async () => {
      await request(app)
        .post('/api/LD/v1/password/reset/request')
        .send({ })
        .expect(500)
        .expect(res => expect(res.body.error.message).to.equal('requestPasswordResetHandler schema validation failed:\n{\n  "email": "Email is required",\n  "mobilePhone": "Mobile phone is required"\n}'));
    });

    it('can fail password reset complete if neither email nor mobile phone provided', async () => {
      await request(app)
        .post('/api/LD/v1/password/reset/complete')
        .send({ })
        .expect(500)
        .expect(res => expect(res.body.error.message).to.equal('completePasswordResetHandler schema validation failed:\n{\n  "email": "Email is required",\n  "pinCode": "Pin code is required",\n  "newPassword": "New password is required",\n  "mobilePhone": "Mobile phone is required"\n}'));
    });

    it('logs in with new password', async () => {
      await setup.login(app, player.email, 'foobar333');
    });
  });

  describe('non-activated player', () => {
    let headers;
    let activationCode;
    let activationCode2;
    let playerId;
    before(async () => {
      await cleanUpPlayers();
      const { body } = await request(app).post('/api/LD/v1/players').send({ ...mockPlayers.john, activated: false });
      activationCode = body.activationCode;
      playerId = body.player.id;
    });

    it('can log in when account is not activated', async () => {
      headers = await setup.login(app, john.email, john.password);
    });

    it('returns an error when invalid activation code given', () =>
      request(app)
        .post('/api/LD/v1/activate/xasjdjasdkljaskjdljaskkjlads')
        .expect(500));

    it('activates player without logging in', () =>
      request(app)
        .post(`/api/LD/v1/activate/${activationCode}`)
        .expect(200));

    it('can log in', async () => {
      headers = await setup.login(app, john.email, john.password);
    });

    it('fetches activated player', async () => {
      await request(app)
        .get('/api/LD/v1/details')
        .set(headers)
        .expect(200)
        .expect(res =>
          expect(res.body).to.containSubset({
            activated: true,
          }));
    });

    it('resets activation state', () => pg('players').update({ activated: false }).where({ id: playerId }));
    it('fetches activated player', async () => {
      await request(app)
        .get('/api/LD/v1/details')
        .set(headers)
        .expect(200)
        .expect(res =>
          expect(res.body).to.containSubset({
            activated: false,
          }));
    });
    it('can request new activation code', () =>
      request(app)
        .get('/api/LD/v1/activate')
        .set(headers)
        .expect(200)
        .expect((res) => {
          activationCode2 = res.body.activationToken;
        }));

    it('activates player with new token', () =>
      request(app)
        .post(`/api/LD/v1/activate/${activationCode2}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.activated).to.equal(true);
        }));

    it('allows password change', async () => {
      await request(app)
        .post('/api/LD/v1/password')
        .send({ oldPassword: john.password, newPassword: 'foobar123' })
        .set(headers)
        .expect(200);
    });

    it('can log in with new password', async () => {
      await setup.login(app, john.email, 'foobar123');
    });

    it('login fails with old password', async () => {
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(400);
    });
  });

  describe('Logged in player', () => {
    let headers;

    before(async () => {
      await cleanUpPlayers();
      await request(app).post('/api/LD/v1/players').send(mockPlayers.john);
      headers = await setup.login(app, john.email, john.password);
    });

    it('password change fails with invalid password', async () => {
      await request(app)
        .post('/api/LD/v1/password')
        .send({ oldPassword: 'xxxx123123', newPassword: 'foobar123' })
        .set(headers)
        .expect(400)
        .expect((res) => {
          expect(res.body.code).to.equal(480);
        });
    });

    it('fetches player details', async () => {
      await request(app)
        .get('/api/LD/v1/details')
        .set(headers)
        .expect(200)
        .expect(res =>
          expect(res.body).to.containSubset({
            activated: true,
            firstName: 'John',
            lastName: 'Doe',
          }));
    });

    it('can leave a note to player', () =>
      request(app)
        .post('/api/LD/v1/notes')
        .send({ content: 'Hello this is a note.' })
        .set(headers)
        .expect(200));

    it('allows password change', async () => {
      await request(app)
        .post('/api/LD/v1/password')
        .send({ oldPassword: john.password, newPassword: 'foobar123' })
        .set(headers)
        .expect(200);
    });

    it('prevent set a password for an already registered player', async () => {
      await request(app)
        .post('/api/LD/v1/password/set')
        .send({ newPassword: 'foobar123' })
        .set(headers)
        .expect(400);
    });

    it('can log in with new password', async () => {
      await setup.login(app, john.email, 'foobar123');
    });

    it('login fails with old password', async () => {
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(400);
    });

    it('can log in with authenticated mobile phone number', async () => {
      await request(app)
        .post('/api/LD/v1/login/mobile')
        .send({ mobilePhone: mockPlayers.john.mobilePhone, ipAddress: '94.222.17.20' })
        .expect(200);
    });
  });

  describe('Regular players', () => {
    let headers;

    before(async () => {
      await cleanUpPlayers();
      await request(app).post('/api/LD/v1/players').send(mockPlayers.john);
      headers = await setup.login(app, john.email, john.password);
    });

    it('can add a tag to player', async () => {
      await request(app)
        .post('/api/LD/v1/tags')
        .send({ tag: 'foobar' })
        .set(headers)
        .expect(200)
        .expect((res) => expect(res.body).to.deep.equal(['foobar']));
    });

    it('can remove a tag from player', async () => {
      await request(app)
        .delete('/api/LD/v1/tags/foobar')
        .set(headers)
        .expect(200)
        .expect((res) => expect(res.body).to.deep.equal([]));
    });

    it('can report bounced email address', async () => {
      await request(app)
        .post('/api/LD/v1/details')
        .send({ emailStatus: 'failed' })
        .set(headers)
        .expect(200);
    });

    it('reports bounced email address as not email allowed', async () => {
      await request(app)
        .get('/api/LD/v1/details')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.allowEmailPromotions).to.equal(false);
        });
    });
  });

  describe('SOW rejected players', () => {
    let player;
    let pinCode;
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

    it('does not allow register with matching email of player with rejected SOW', async () => {
      await addTag(player.id, 'fail-sow');
      await request(app)
        .post('/api/CJ/v1/register/request')
        .send({ mobilePhone: john.mobilePhone })
        .expect((res) => {
          pinCode = res.body.pinCode;
        })
        .expect(200);

      await request(app)
        .post('/api/CJ/v1/register/complete')
        .send({
          playerDraft: { ...john, email: john.email },
          mobilePhone: john.mobilePhone,
          pinCode,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              code: 498,
            },
          });
        });
    });
  });
});
