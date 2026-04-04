/* @flow */
const request = require('supertest');
const app = require("./app");

describe('Player update webhook', () => {
  let username;
  let email;

  beforeEach(async () => {
    username = `LD_Jack.Sparrow_${Date.now()}`;
    email = `jack.${Date.now()}@hotmail.com`;
  });

  it('updates player with webhook', async () => {
    await request(app)
      .post('/api/integration/players')
      .send({
        player: {
          id: 3001548,
          brandId: 'LD',
          username,
          email,
          firstName: 'Jack',
          lastName: 'Sparrow',
          address: 'Fugger Strasse 56',
          postCode: '06820',
          city: 'Dessau',
          mobilePhone: '4903950077831',
          countryId: 'FI',
          dateOfBirth: '1989-02-01',
          languageId: 'de',
          currencyId: 'EUR',
          allowEmailPromotions: true,
          allowSMSPromotions: true,
          createdAt: '2019-06-01T07:27:58.422Z',
          activated: true,
          verified: false,
          selfExclusionEnd: null,
          allowGameplay: true,
          allowTransactions: true,
          loginBlocked: false,
          accountClosed: false,
          accountSuspended: false,
          numDeposits: 0,
          testPlayer: false,
          gamblingProblem: false,
          tcVersion: 4,
          partial: false,
          tags: [],
          dd: { flagged: false, locked: false, lockTime: null },
        },
        segments: ['zero_deposit'],
      })
      .expect(200)
      .expect(res => expect(res.body).to.deep.equal({ ok: true }));
  });
});
