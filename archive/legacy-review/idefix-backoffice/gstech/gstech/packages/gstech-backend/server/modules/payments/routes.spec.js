/* @flow */
const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');
const { players: { john } } = require('../../../scripts/utils/db-data');
const Limit = require('../limits');

describe('Payments REST API', () => {
  describe('with active session', () => {
    let headers;
    let transactionKey;
    let playerId;
    let paymentId;
    let accountId;

    beforeEach(async () => {
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          playerId = res.body.player.id;
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
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200)
        .expect((res) => {
          paymentId = res.body.depositId;
          accountId = res.body.accountId;
        });
    });

    it('returns account statement of current player', () =>
      request(app)
        .get('/api/LD/v1/statement')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.statement.length).to.equal(1);
          expect(res.body.statement).to.containSubset([{
            amount: 4500,
            paymentType: 'deposit',
            paymentMethod: 'BankTransfer',
            account: 'XX123213',
            externalTransactionId: '243254345543534534',
          }]);
        }));

    it('returns latest deposits of current player', () =>
      request(app)
        .get('/api/LD/v1/deposits')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.deposits.length).to.equal(1);
          expect(res.body.deposits).to.containSubset([{
            amount: 4500,
            value: 4500,
            index: 0,
          }]);
        }));

    it('can complete deposit explicitly', async () => {
      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });

      await request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.deposit.status).to.equal('created');
        });

      await request(app)
        .post(`/api/v1/player/${playerId}/transactions/${transactionKey}/complete`)
        .set(headers)
        .send({
          reason: 'Manual deposit completion',
          externalTransactionId: '123456789',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            ok: true,
          });
        });

      await request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.deposit.status).to.equal('complete');
        });
    });

    it('can create withdrawals (first without a fee, then with a fee)', async () => {
      await request(app)
        .post(`/api/v1/player/${playerId}/transactions`)
        .set(headers)
        .send({
          type: 'withdraw',
          accountId,
          amount: 1000,
          reason: 'Manual withdrawal',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            update: {
              balance: {
                bonusBalance: 0,
                currencyId: 'EUR',
                formatted: {
                  bonusBalance: '0.00',
                  realBalance: '35.00',
                  reservedBalance: '10.00',
                  totalBalance: '35.00',
                },
                realBalance: 3500,
                reservedBalance: 1000,
                totalBalance: 3500,
              },
            },
          });
        });

      await request(app)
        .post(`/api/v1/player/${playerId}/transactions`)
        .set(headers)
        .send({
          type: 'withdraw',
          accountId,
          amount: 1000,
          reason: 'Manual withdrawal',
          noFee: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            update: {
              balance: {
                bonusBalance: 0,
                currencyId: 'EUR',
                formatted: {
                  bonusBalance: '0.00',
                  realBalance: '25.00',
                  reservedBalance: '10.00',
                  totalBalance: '25.00',
                },
                realBalance: 2500,
                reservedBalance: 1000,
                totalBalance: 2500,
              },
            },
          });
        });
    });

    it('can set new value for deposit wagering requirement', async () => {
      const { id } = await pg('player_counters').first('id').where({ playerId, active: true, type: 'deposit_wager' });

      await request(app)
        .put(`/api/v1/player/${playerId}/counters/${id}`)
        .send({
          wageringRequirement: 123,
        })
        .set(headers)
        .expect((res) => {
          expect(res.body.ok).to.equal(true);
        })
        .expect(200);

      const { limit } = await pg('player_counters').first('limit').where({ id });
      expect(limit).to.equal(123);
    });

    it('can clear wagering requirement by setting value to 0', async () => {
      const { id } = await pg('player_counters').first('id').where({ playerId, active: true, type: 'deposit_wager' });

      await request(app)
        .put(`/api/v1/player/${playerId}/counters/${id}`)
        .send({
          wageringRequirement: 0,
        })
        .set(headers)
        .expect((res) => {
          expect(res.body.ok).to.equal(true);
        })
        .expect(200);
      const { limit } = await pg('player_counters').first('limit').where({ id, active: false });
      expect(limit).to.equal(4500);
    });

    it('can fetch payment list for player', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/payments`)
        .set(headers)
        .expect((res) => {
          expect(res.body).to.containSubset([{
            key: transactionKey,
            type: 'deposit',
            status: 'complete',
            provider: 'BankTransfer/Entercash',
            amount: '€45.00',
            rawAmount: 4500,
            paymentFee: '-',
            rawPaymentFee: 0,
            transactionId: '243254345543534534',
          }]);
        })
        .expect(200);
    });

    it('can fetch payment list for player with paging', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/payments?pageSize=3`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.equal(1);
        })
        .expect(200);
    });

    it('can fetch payment list for player with selected statuses', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/payments?pageSize=3&status=cancelled&status=created`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.equal(0);
        })
        .expect(200);
    });


    it('can fetch payment list for player with paging', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/payments?pageIndex=0&pageSize=3`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.containSubset(1);
        })
        .expect(200);
    });

    it('can fetch payment list for player with search query', async () => {
      let transactionId = "";

      await request(app)
        .get(`/api/v1/player/${playerId}/payments`)
        .set(headers)
        .expect((res) => {
          if (res.body.length !== 0) {
            transactionId = res.body[0].transactionId;
          }
        });

      await request(app)
        .get(`/api/v1/player/${playerId}/payments?text=${transactionId}`)
        .set(headers)
        .expect((res) => {
          expect(res.body.length).to.containSubset(1);
        })
        .expect(200);
    });

    it('can fetch events for paymentId', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/payments/${paymentId}/events`)
        .set(headers)
        .expect((res) => {
          expect(res.body).to.containSubset([
            { status: 'complete' },
          ]);
        })
        .expect(200);
    });
  });

  describe('two deposits with campaign wagering', () => {
    let headers;
    let transactionKey;
    let transactionKey2;
    let playerId;

    beforeEach(async () => {
      const players = await setup.players();
      playerId = players.john.id;
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
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
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200);

      await request(app)
        .put(`/api/LD/v1/deposit/${transactionKey}/wager`)
        .send({ wageringRequirement: 8000 })
        .set(headers)
        .expect(200);

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey2 = res.body.transactionKey;
        });
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey2}`)
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534535' })
        .set(headers)
        .expect(200);

      await request(app)
        .put(`/api/LD/v1/deposit/${transactionKey2}/wager`)
        .send({ wageringRequirement: 8000 })
        .set(headers)
        .expect(200);
    });

    it('has 5x wagering requirement active for two deposits', async () => {
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 16000, type: 'deposit_campaign' });
    });

    it('returns financial summary for player', async () => {
      await request(app)
        .get(`/api/v1/player/${playerId}/financial-info`)
        .set(headers)
        .expect((res) => {
          expect(res.body).to.deep.equalInAnyOrder({
            balance: '€90.00',
            bonusBalance: '€0.00',
            totalBalance: '€90.00',
            totalBetAmount: '€0.00',
            totalWinAmount: '€0.00',
            rtp: '-',
            depositCount: 2,
            withdrawalCount: 0,
            totalDepositAmount: '€90.00',
            totalWithdrawalAmount: '€0.00',
            depositCountInSixMonths: 2,
            depositAmountInSixMonths: '€90.00',
            withdrawalCountInSixMonths: 0,
            withdrawalAmountInSixMonths: '-',
            creditedBonusMoney: '€0.00',
            bonusToReal: '€0.00',
            freespins: '€0.00',
            compensations: '-',
            bonusToDepositRatio: 0,
            depositsMinusWithdrawals: '€90.00',
            depositsMinusWithdrawalsInSixMonths: '€90.00',
          });
        });
    });

    it('it can update wagering requirements of payment', async () => {
      let id = '';
      await request(app)
        .get(`/api/v1/player/${playerId}/payments`)
        .set(headers)
        .expect((res) => {
          expect(res.body).to.containSubset([
            {
              type: 'deposit',
              status: 'complete',
              statusGroup: 'complete',
              provider: 'BankTransfer/Entercash',
              account: 'XX123213',
              amount: '€45.00',
              rawAmount: 4500,
              transactionId: '243254345543534535',
              counterTarget: 8000,
              counterValue: 0,
              counterType: 'campaign',
            },
            {
              status: 'complete',
              statusGroup: 'complete',
              provider: 'BankTransfer/Entercash',
              account: 'XX123213',
              amount: '€45.00',
              rawAmount: 4500,
              transactionId: '243254345543534534',
              counterTarget: 8000,
              counterValue: 0,
              counterType: 'campaign',
            },
          ]);
          id = res.body[0].counterId;
        })
        .expect(200);

      await request(app)
        .put(`/api/v1/player/${playerId}/counters/${id}`)
        .send({
          wageringRequirement: 0,
        })
        .set(headers)
        .expect((res) => {
          expect(res.body.ok).to.equal(true);
        })
        .expect(200);

      await request(app)
        .get(`/api/v1/player/${playerId}/payments`)
        .set(headers)
        .expect((res) => {
          expect(res.body).to.containSubset([
            {
              type: 'deposit',
              status: 'complete',
              statusGroup: 'complete',
              provider: 'BankTransfer/Entercash',
              account: 'XX123213',
              amount: '€45.00',
              rawAmount: 4500,
              transactionId: '243254345543534535',
              counterTarget: 4500,
              counterValue: 0,
              counterType: 'deposit',
            },
            {
              status: 'complete',
              statusGroup: 'complete',
              provider: 'BankTransfer/Entercash',
              account: 'XX123213',
              amount: '€45.00',
              rawAmount: 4500,
              transactionId: '243254345543534534',
              counterTarget: 8000,
              counterValue: 0,
              counterType: 'campaign',
            },
          ]);
        })
        .expect(200);
    });
  });
});
