/* @flow */
const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../../index');
const { players: { john } } = require('../../../../scripts/utils/db-data');
const { findOrCreateAccount, updateAccount } = require('../../accounts');
const { addTransaction } = require("../Payment");
const Player = require('../../players/Player');

describe('Withdrawal routes', () => {
  describe('with active bonus balance and no KYCd accounts', () => {
    let headers;

    beforeEach(async () => {
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });

      const { body: { transactionKey } } = await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, bonusId: 1001 })
        .set(headers)
        .expect(200);

      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'FI2112345600008739', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200);
    });

    it('returns withdrawal info', () =>
      request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawalAllowed).to.equal(false);
          expect(res.body.wagering.wageringRequirement).to.equal(225000);
          expect(res.body.wagering.wagered).to.equal(0);
          expect(res.body.wagering.completed).to.equal(0);
          expect(res.body.accounts).to.deep.equal([]);
        }));
  });

  describe('with real money on account and KYC completed', () => {
    let headers;
    let playerId;
    let accountId;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        await findOrCreateAccount(playerId, 1, '', null, 1, { }, tx);
        const id = await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx);
        await updateAccount(playerId, id, { kycChecked: true }, 1, tx);
        return id;
      });
      await Player.updateAccountStatus(playerId, { verified: true });
      await pg.transaction(tx =>
        addTransaction(playerId, null, 'compensation', 5000, 'Play money', 1, tx));
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });
    });

    it('returns withdrawal info', () =>
      request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawalAllowed).to.equal(true);
          expect(res.body.accounts.length).to.equal(1);
          expect(res.body.accounts[0].id).to.equal(accountId);
        }));

    it('allows withdrawal request', () =>
      request(app)
        .post('/api/LD/v1/withdrawal')
        .send({ amount: 3000, accountId })
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance.balance).to.equal(2000);
          expect(res.body.balance.bonusBalance).to.equal(0);
          expect(res.body.withdrawals.length).to.equal(1);
          expect(res.body.withdrawals[0].account).to.equal('FI2112345600008739');
          expect(res.body.withdrawals[0].amount).to.equal(3000);
        }));

    it('returns an error when trying to create a withdrawal with not enough balance', () =>
      request(app)
        .post('/api/LD/v1/withdrawal')
        .send({ amount: 5000, accountId })
        .set(headers)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(560);
        }));

    let transactionKey;

    it('lists pending withdrawals', () =>
      request(app)
        .get('/api/LD/v1/withdrawal/pending')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawals.length).to.equal(1);
          expect(res.body.withdrawals[0].account).to.equal('FI2112345600008739');
          expect(res.body.withdrawals[0].amount).to.equal(3000);
          expect(res.body.balance.balance).to.equal(2000);
          expect(res.body.balance.bonusBalance).to.equal(0);
          transactionKey = res.body.withdrawals[0].transactionKey;
        }));

    it('cancels pending withdrawal and balance is returned', () =>
      request(app)
        .delete(`/api/LD/v1/withdrawal/pending/${transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawals.length).to.equal(0);
          expect(res.body.balance.balance).to.equal(5000);
          expect(res.body.balance.bonusBalance).to.equal(0);
        }));
  });
  describe('with pending SEPA withdrawal with valid account', () => {
    let headers;
    let playerId;
    let accountId;
    let transactionKey;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        const id = await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx);
        await updateAccount(playerId, id, { kycChecked: true }, 1, tx);
        return id;
      });
      await Player.updateAccountStatus(playerId, { verified: true });
      await pg.transaction(tx =>
        addTransaction(playerId, null, 'compensation', 5000, 'Play money', 1, tx));
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .send({ amount: 3000, accountId })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.withdrawal.id;
        });
    });

    it('can get withdrawal info', async () =>
      request(app)
        .get(`/api/v1/player/${playerId}/withdrawals`)
        .expect((res) => {
          expect(res.body).to.containSubset({
            withdrawalFeeConfiguration: {
              withdrawalFee: 3,
              withdrawalFeeMax: 2500,
              withdrawalFeeMin: 250,
            },
          });
        })
        .expect(200));

    it('can accept withdrawal with delay', async () =>
      request(app)
        .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}/delay`)
        .send({ paymentProviderId: 1, amount: 3000, parameters: { staticId: 123 } })
        .expect(200));

    it('can accept withdrawal', async () =>
      request(app)
        .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}`)
        .send({ paymentProviderId: 1, amount: 3000, parameters: { staticId: 123 } })
        .expect(200));
    it('has no longer pending withdrawals', () =>
      request(app)
        .get('/api/LD/v1/withdrawal/pending')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawals.length).to.equal(0);
        }));
  });
  describe('with pending SEPA withdrawal with bic missing', () => {
    let headers;
    let playerId;
    let accountId;
    let transactionKey;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        const id = await findOrCreateAccount(playerId, 1, 'FI2112345600008739', null, 1, { }, tx);
        await updateAccount(playerId, id, { kycChecked: true }, 1, tx);
        return id;
      });
      await Player.updateAccountStatus(playerId, { verified: true });
      await pg.transaction(tx =>
        addTransaction(playerId, null, 'compensation', 5000, 'Play money', 1, tx));
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .send({ amount: 3000, accountId })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.withdrawal.id;
        });
    });

    it('withdrawal accept failed', async () =>
      request(app)
        .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}`)
        .send({ paymentProviderId: 1, amount: 3000, parameters: { staticId: 123 } })
        .expect(400));
  });

  describe('with pending swedish withdrawal', () => {
    let headers;
    let playerId;
    let accountId;
    let transactionKey;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        const id = await findOrCreateAccount(playerId, 1, '55505 / 90-310555555', null, 1, { }, tx);
        await updateAccount(playerId, id, { kycChecked: true }, 1, tx);
        return id;
      });
      await Player.updateAccountStatus(playerId, { verified: true });
      await pg.transaction(tx =>
        addTransaction(playerId, null, 'compensation', 5000, 'Play money', 1, tx));
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .send({ amount: 3000, accountId })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.withdrawal.id;
        });
    });

    it('can accept withdrawal with delay', async () =>
      request(app)
        .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}/delay`)
        .send({ paymentProviderId: 1, amount: 3000, parameters: { staticId: 123 } })
        .expect(200));

    it('can accept withdrawal', async () =>
      request(app)
        .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}`)
        .send({ paymentProviderId: 1, amount: 3000, parameters: { staticId: 123 } })
        .expect(200));
  });

  describe('can accept pending withdrawal', () => {
    let headers;
    let playerId;
    let accountId;
    let transactionKey;
    let externalTransactionId;

    before(async () => {
      await clean.players();
      playerId = await Player.create({ brandId: 'LD', ...john }).then(({ id }) => id);
      accountId = await pg.transaction(async (tx) => {
        const id = await findOrCreateAccount(playerId, 1, '55505 / 90-310555555', null, 1, { }, tx);
        await updateAccount(playerId, id, { kycChecked: true }, 1, tx);
        return id;
      });
      await Player.updateAccountStatus(playerId, { verified: true });
      externalTransactionId = await pg.transaction(tx =>
        addTransaction(playerId, null, 'compensation', 5000, 'Play money', 1, tx));
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .send({ amount: 3000, accountId })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.withdrawal.id;
        });

      await pg('payments').where({ transactionKey }).update({ status: 'processing', paymentProviderId: 1 }).returning('*');
    });

    it('can confirm withdrawal', async () =>
      request(app)
        .put(`/api/v1/player/${playerId}/withdrawals/${transactionKey}/confirm`)
        .send({ externalTransactionId })
        .expect(({ body }) => {
          expect(body).to.deep.equal({ complete: true })
        })
        .expect(200));
  });
});
