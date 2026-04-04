/* @flow */
const request = require('supertest');
const app = require('../../index');
const { players: { john } } = require('../../../scripts/utils/db-data');

describe('Bonus routes', () => {
  let headers;
  let transactionKey;

  before(async () => {
    await setup.players();
    await request(app)
      .post('/api/LD/v1/login')
      .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
      .expect(200)
      .expect((res) => {
        headers = { Authorization: `Token ${res.body.token}` };
      });
  });

  it('returns deposit info', () =>
    request(app)
      .get('/api/LD/v1/deposit')
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body.bonuses.length).to.equal(1);
        expect(res.body.bonuses[0].name).to.equal('LD_FIRST_DEPOSIT');
      }));

  it('gives bonus', () =>
    request(app)
      .post('/api/LD/v1/bonuses/DEPOSIT_OFFER_TEST/give')
      .set(headers)
      .expect(200));

  it('returns deposit info with given bonus', () =>
    request(app)
      .get('/api/LD/v1/deposit')
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body.bonuses.length).to.equal(2);
        expect(res.body.bonuses).to.containSubset([
          { id: 1001,
            name: 'LD_FIRST_DEPOSIT',
            playerBonusId: null,
            minAmount: 2000,
            maxAmount: 20000,
            depositMatchPercentage: 100,
            depositBonus: true,
            depositCount: 1,
            wageringRequirementMultiplier: 50,
          },
          {
            id: 1012,
            name: 'DEPOSIT_OFFER_TEST',
            minAmount: 2000,
            maxAmount: 20000,
            depositMatchPercentage: 100,
            depositBonus: true,
            depositCount: null,
            wageringRequirementMultiplier: 5,
          },
        ]);
      }));

  it('deposits with bonus', () =>
    request(app)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'BankTransfer_Entercash', amount: 3500, bonusCode: 'DEPOSIT_OFFER_TEST' })
      .set(headers)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      })
      .expect(200));

  it('processes deposit and credits money on the account', async () => {
    await request(app)
      .post(`/api/LD/v1/deposit/${transactionKey}`)
      .send({ amount: 3500, account: 'XX123213', externalTransactionId: '243254345543534534' })
      .set(headers)
      .expect(200)
      .expect((res) => {
        const { balance: { numDeposits, balance, bonusBalance } } = res.body;
        expect(numDeposits).to.equal(1);
        expect(balance).to.equal(3500);
        expect(bonusBalance).to.equal(3500);
      });
  });

  it('credits bonus and turns it real money straight away', async () => {
    await request(app)
      .post('/api/LD/v1/bonuses/LD_AFF5E/credit')
      .set(headers)
      .expect(200)
      .expect((res) => {
        const { balance: { balance, bonusBalance } } = res.body;
        expect(balance).to.equal(4000);
        expect(bonusBalance).to.equal(3500);
      });
  });

  it('returns an error when invalid bonusCode is given', async () => {
    await request(app)
      .post('/api/LD/v1/bonuses/AFF5E/credit')
      .set(headers)
      .expect(400);
  });
});
