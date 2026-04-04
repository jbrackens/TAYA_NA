/* @flow */
const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../../index');
const { players: { john } } = require('../../../../scripts/utils/db-data');
const Counter = require('../../limits/Counter');
const Fraud = require('../../frauds/Fraud');

describe('Withdrawal routes', () => {
  describe('with an account available', () => {
    let headers;
    let transactionKey;
    let accountId;
    let player;

    before(async () => {
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          player = res.body.player;
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
        .send({ amount: 5000, account: 'FI2112345600008739', externalTransactionId: '243254345543534534', accountHolder: 'John Doe', accountParameters: { token: '123123123312' } })
        .set(headers)
        .expect(200);
    });

    it('allows withdrawal from same account where the deposit came from', async () => {
      await request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          accountId = res.body.accounts[0].id;
          expect(res.body.accounts.length).to.equal(1);
          expect(res.body.accounts[0].method).to.equal('BankTransfer');
        });
    });

    it('can request first withdrawal for free', async () => {
      const [wagerCounter] = await Counter.getActiveCounters(player.id, ['deposit_wager']);
      await Counter.setDepositWageringCounter(wagerCounter.id, 0, pg);
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 3000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 2000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'EUR',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 3000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
            ],
          });
        });
    });
    let transactions;

    it('can request next withdrawal with fee', async () => {
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 1000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          transactions = res.body.withdrawals;
          expect(res.body).to.deep.equal({
            balance: {
              balance: 1000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'EUR',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 3000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 750,
                paymentFee: 250,
                created: res.body.withdrawals[1].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[1].transactionKey,
              },
            ],
          });
        });
    });

    it('can cancel withdrawal and fee is returned', async () => {
      await request(app)
        .delete(`/api/LD/v1/withdrawal/pending/${transactions[1].transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawals.length).to.equal(1);
          expect(res.body.balance.balance).to.equal(2000);
        });
      await request(app)
        .delete(`/api/LD/v1/withdrawal/pending/${transactions[0].transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawals.length).to.equal(0);
          expect(res.body.balance.balance).to.equal(5000);
        });
    });


    it('can request withdrawal for free as previous ones were cancelled', async () => {
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 3000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 2000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'EUR',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 3000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
            ],
          });
        });
    });

    it('when deposit is done from unverified method, withdrawal is not allowed', async () => {
      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Skrill_Skrill', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });

      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 5000, account: 'foo@bar.com', externalTransactionId: '123123' })
        .set(headers)
        .expect(200);

      await request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.accounts.length).to.equal(0);
        });
    });

    it('can fetch withdrawal info by transactionKey', async () => {
      let wdTransactionKey = '';
      await request(app)
        .post('/api/LD/v1/test-withdraw')
        .set(headers)
        .send({
          amount: 500,
          provider: 'Trustly',
        })
        .expect((res) => {
          wdTransactionKey = res.body.transactionKey;
        })
        .expect(200);

      await request(app)
        .get(`/api/XX/v1/withdrawal/${wdTransactionKey}/details`)
        .expect((res) => {
          expect(res.body).to.containSubset({
            withdrawal: {
              transactionKey: wdTransactionKey,
            },
            balance: {
              balance: 7000,
            },
            player: {
              email: 'john.doe@hotmail.com',
            },
          });
        })
        .expect(200);
    });

    it('adds 10€ fee because deposit is not wagered', async () => {
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 7000,
          accountId,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            balance: {
              balance: 0,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'EUR',
              numDeposits: 2,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 6000,
                paymentFee: 1000,
                kycChecked: true,
                name: 'BankTransfer',
              },
            ],
          });
        });
    });
  });

  describe('NOK Withdrawals', () => {
    let headers;
    let transactionKey;
    let accountId;
    let player;
    before(async () => {
      await setup.players({ currencyId: 'NOK' });

      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          player = res.body.player;
          headers = { Authorization: `Token ${res.body.token}` };
        });

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 500000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });

      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 500000, account: 'FI2112345600008739', externalTransactionId: '243254345543534534', accountHolder: 'John Doe', accountParameters: { token: '123123123312' } })
        .set(headers)
        .expect((res) => {
          accountId = res.body.accountId;
          transactionKey = res.body.transactionKey;
        })
        .expect(200);
    });

    it('can request not wagered withdrawal', async () => {
      await request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawalFeeConfiguration).to.deep.equal({
            withdrawalFee: 5,
            withdrawalFeeMax: Number.MAX_SAFE_INTEGER,
            withdrawalFeeMin: 10000,
          });
        });
    });

    it('can request first withdrawal for free', async () => {
      const [wagerCounter] = await Counter.getActiveCounters(player.id, ['deposit_wager']);
      await Counter.setDepositWageringCounter(wagerCounter.id, 0, pg);

      await request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawalFeeConfiguration).to.deep.equal(undefined);
        });

      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 30000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 470000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'NOK',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 30000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
            ],
          });
        });
    });

    it('can request next withdrawal with fee', async () => {
      await request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.withdrawalFeeConfiguration).to.deep.equal({
            withdrawalFee: 3,
            withdrawalFeeMax: 25000,
            withdrawalFeeMin: 2500,
          });

          expect(res.body.accounts[0].minWithdrawal).to.be.equal(25000);
        });

      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 10000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 460000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'NOK',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 30000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 7500,
                paymentFee: 2500,
                created: res.body.withdrawals[1].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[1].transactionKey,
              },
            ],
          });
        });
    });

    it('can request another withdrawal with fee exceeding exceeding min value', async () => {
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 100000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 360000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'NOK',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 30000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 7500,
                paymentFee: 2500,
                created: res.body.withdrawals[1].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[1].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 97000,
                paymentFee: 3000,
                created: res.body.withdrawals[2].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[2].transactionKey,
              },
            ],
          });
        });
    });

    it('can request another withdrawal with explicit no fee flag', async () => {
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 100000,
          accountId,
          noFee: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 260000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'NOK',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 30000,
                paymentFee: 0,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 7500,
                paymentFee: 2500,
                created: res.body.withdrawals[1].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[1].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 97000,
                paymentFee: 3000,
                created: res.body.withdrawals[2].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[2].transactionKey,
              },
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 100000,
                paymentFee: 0,
                created: res.body.withdrawals[3].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[3].transactionKey,
              },
            ],
          });
        });
    });
  });

  describe('not wagered deposit withdrawals', () => {
    let headers;
    let transactionKey;
    let accountId;
    let player;
    before(async () => {
      await setup.players();

      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          player = res.body.player;
          headers = { Authorization: `Token ${res.body.token}` };
        });

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 500000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });

      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 500000, account: 'FI2112345600008739', externalTransactionId: '243254345543534534', accountHolder: 'John Doe', accountParameters: { token: '123123123312' } })
        .set(headers)
        .expect((res) => {
          accountId = res.body.accountId;
          transactionKey = res.body.transactionKey;
        })
        .expect(200);
    });

    it('not wagered withdrawal has min withdraw amount equal to balance', async () => {
      await request(app)
        .get('/api/LD/v1/withdrawal')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.accounts[0].minWithdrawal).to.be.equal(500000);
        });
    });

    it('can request not wagered withdrawal with big not wagered deposit', async () => {
      await request(app)
        .post('/api/LD/v1/withdrawal')
        .set(headers)
        .send({
          amount: 30000,
          accountId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            balance: {
              balance: 470000,
              bonusBalance: 0,
              brandId: 'LD',
              currencyId: 'EUR',
              numDeposits: 1,
            },
            withdrawal: {
              id: res.body.withdrawal.id,
            },
            withdrawals: [
              {
                account: 'FI2112345600008739',
                accountId,
                amount: 28500,
                paymentFee: 1500,
                created: res.body.withdrawals[0].created,
                kycChecked: true,
                name: 'BankTransfer',
                transactionKey: res.body.withdrawals[0].transactionKey,
              },
            ],
          });
        });

        const frauds = await Fraud.getUnchecked(player.id);
        expect(frauds.map(({ fraudKey }) => fraudKey)).to.contain('big_wd_deposit_not_wagered');
    });
  });
});
