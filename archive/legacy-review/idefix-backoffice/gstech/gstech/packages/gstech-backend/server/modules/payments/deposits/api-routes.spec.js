/* @flow */
const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../../index');
const { players: { john } } = require('../../../../scripts/utils/db-data');
const Limit = require('../../limits');
const { getAccountsWithKycData, getAccountWithParameters } = require('../../accounts');
const { addTransaction } = require("../Payment");
const { getPendingDeposits } = require('./Deposit');
const Bonus = require('../../bonuses');
const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();

describe('Deposit routes', () => {
	
  describe('with NO session - Pnp deposit info with bonuses available', () => {
    it('returns PnP deposit info', async () =>
      request(app)
        .get('/api/FK/v1/pnpdeposit')
        .expect(200)
        .expect((res) => {
          expect(res.body.bonuses.length).to.equal(1);
          expect(res.body.bonuses[0].name).to.equal('FK_DEPOSIT_PNP');
        }));
  });
	
  describe('with active session', () => {
    let headers;

    beforeEach(async () => {
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
          expect(res.body.accessStatus.activated).to.equal(true);
          expect(res.body.accessStatus.allowGameplay).to.equal(true);
          expect(res.body.accessStatus.allowTransactions).to.equal(true);
          expect(res.body.accessStatus.verified).to.equal(false);
          expect(res.body.bonuses.length).to.equal(1);
          expect(res.body.bonuses[0].name).to.equal('LD_FIRST_DEPOSIT');
        }));

    it('creates new deposit request with valid amount and bonus id', () =>
      request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, bonusId: 1001, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.transactionKey).to.not.equal(null);
        }));

    it('returns an error when bonusId of bonus which is not available is given', () =>
      request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 1500, bonusId: 100 })
        .set(headers)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(558);
        }));

    it('returns an error when starting a deposit and amount is below the limit', () =>
      request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 1500 })
        .set(headers)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(558);
        }));

    it('returns an error when starting a deposit and amount is over the limit', () =>
      request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 150000000 })
        .set(headers)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(575);
        }));
  });

  describe('with deposit limit set', () => {
    let headers;
    let transactionKey;

    before(async () => {
      const players = await setup.players();
      await Limit.create({
        playerId: players.john.id,
        permanent: true,
        expires: null,
        reason: 'Player requested for daily 50€ deposit limit',
        type: 'deposit_amount',
        limitValue: 10000,
        periodType: 'daily',
        userId: 1,
      });
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });
    });

    it('returns deposit info before deposit', () =>
      request(app)
        .get('/api/LD/v1/deposit')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.depositMethods[0].upperLimit).to.equal(10000);
          expect(res.body.limits).to.containSubset({
            expires: null,
            permanent: true,
            type: 'deposit_amount',
            limitValue: 10000,
            limit: 10000,
            amount: 0,
            periodType: 'daily',
            reason: 'Player requested for daily 50€ deposit limit',
          });
        }));

    it('creates new deposit request with valid amount', async () => {
      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, bonusId: 1001, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('can fetch deposit info with parameters before completing the deposit', async () => {
      await request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.deposit.parameters).to.deep.equal({ foo: 'bar', zoo: 1 });
        });
    });

    it('can complete the deposit', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 5000, account: 'FI2112345600008739', externalTransactionId: '243254345543534534', accountParameters: { token: '123123123312' } })
        .set(headers)
        .expect(200);
    });

    it('returns deposit info after deposit with limit applied', () =>
      request(app)
        .get('/api/LD/v1/deposit')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.depositMethods[0].accounts.length).to.equal(0);
          expect(res.body.depositMethods[0].upperLimit).to.equal(5000);
        }));

    it('returns an error when trying to deposit over allowed amount', () =>
      request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 15000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).to.equal(575);
        }));
  });

  describe('deposit created with selected bonus', () => {
    let headers;
    let transactionKey;

    before(async function before(this: $npm$mocha$ContextDefinition) {
      this.timeout(30000);
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
        });

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, bonusId: 1001, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('returns current state of incomplete deposit', () =>
      request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .set(headers)
        .expect(200)
        .expect((res) => {
          const { transactionKey: txKey, bonus, status, amount, parameters } = res.body.deposit;
          expect(txKey).to.equal(transactionKey);
          expect(bonus).to.equal('LD_FIRST_DEPOSIT');
          expect(status).to.equal('created');
          expect(amount).to.equal(5000);
          expect(parameters).to.deep.equal({ foo: 'bar', zoo: 1 });
        }));

    it('processes deposit and credits money on the account', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'XX123213', accountHolder: 'John Dow', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(4500);
          expect(bonusBalance).to.equal(4500);
        });
    });
  });


  describe('deposit created', () => {
    let headers;
    let transactionKey;
    let playerId;

    before(async () => {
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
    });

    it('returns an error when trying to process deposit without amount', async () =>
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ account: 'XX123213', amount: null, externalTransactionId: '243254345543534534', status: 'pending', rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(400));

    it('processes deposit in pending state and credits money on the account', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534', status: 'pending', rawTransaction: { id: 123, xxx: 'yyy' }, paymentCost: 100 })
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(4500);
          expect(bonusBalance).to.equal(0);
        });
    });

    it('reduces pending deposits from max amount available for deposits', async () => {
      await request(app)
        .get('/api/LD/v1/deposit')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.depositMethods).to.containSubset([
            {
              providerId: 1,
              accounts: [],
              method: 'BankTransfer_Entercash',
              lowerLimit: 2000,
              upperLimit: 195500,
            },
          ]);
        });
    });

    it('lists currently pending deposits', async () => {
      const deposits = await getPendingDeposits(playerId).select('id');
      expect(deposits.length).to.equal(1);
    });

    it('returns current state of pending deposit', () =>
      request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .expect(200)
        .expect((res) => {
          const { transactionKey: txKey, bonus, status, amount, parameters } = res.body.deposit;
          expect(txKey).to.equal(transactionKey);
          expect(bonus).to.equal(null);
          expect(status).to.equal('pending');
          expect(amount).to.equal(4500);
          expect(parameters).to.deep.equal({ foo: 'bar', zoo: 1 });
        }));

    it('changes pending deposit to complete without updating balance', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}/complete`)
        .expect((res) => {
          expect(res.body.deposit.paymentCost).to.equal(100);
        })
        .expect(200);

      await request(app)
        .get('/api/LD/v1/balance')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalBalance).to.equal(4500);
        });
    });

    it('returns player details', async () =>
      await request(app)
        .get('/api/LD/v1/details/full')
        .set(headers)
        .expect(200)
        .expect((res) => {
          const { bonuses, balance, player, promotions } = res.body;
          expect(balance.totalBalance).to.equal(4500);
          expect(bonuses[0].name).to.equal('LD_SECOND_DEPOSIT');
          expect(player.firstName).to.equal('John');
          expect(promotions).to.containSubset([{ promotion: 'LD_REWARDS' }]);
        }));

    it('returns an error when trying to set invalid status', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}/expired`)
        .send({ rawTransaction: { id: 123, xxx: 'xxx' } })
        .expect(400);
    });
  });

  describe('deposit created', () => {
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

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('processes deposit with initial amount and credits money on the account', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ withoutAmount: true, account: 'XX123213', externalTransactionId: '243254345543534534', status: 'complete', rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(5000);
          expect(bonusBalance).to.equal(0);
        });
    });

    it('cancels already processed deposit', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}/failed`)
        .expect(200)
        .expect((res) => {
          expect(res.body.balance.balance).to.equal(0);
          expect(res.body.deposit.status).to.equal('complete');
        });
    });
  });

  describe('deposit with partial data', () => {
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

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'BankTransfer_Entercash', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('updates account with partial information', async () => {
      await request(app)
        .put(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ account: 'XX123213', accountHolder: 'asdasd asdasd', externalTransactionId: '243254345543534534', accountParameters: { fooId: 1 }, rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(0);
          expect(balance).to.equal(0);
          expect(bonusBalance).to.equal(0);
        });
    });

    it('returns up to date status of deposit', async () => {
      await request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.deposit).to.containSubset({
            status: 'created',
          });
        });
    });

    it('completes the deposit', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ withoutAmount: true, externalTransactionId: '243254345543534534', accountParameters: { barId: 2 }, rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200)
        .expect(async (res) => {
          const { accountId, balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(5000);
          expect(bonusBalance).to.equal(0);
          const account = await getAccountWithParameters(accountId);
          expect(account).to.containSubset({
            account: 'XX123213',
            accountHolder: 'asdasd asdasd',
            parameters: { fooId: 1, barId: 2 },
          });
        });
    });
  });

  describe('deposit created in pending state', () => {
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
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(4500);
          expect(bonusBalance).to.equal(0);
        });
    });

    it('updates deposit status but no balance when deposit is executed again with different status', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534', status: 'complete', rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(4500);
          expect(bonusBalance).to.equal(0);
        });

      await request(app)
        .get(`/api/LD/v1/deposit/${transactionKey}`)
        .expect(200)
        .expect((res) => {
          const { transactionKey: txKey, bonus, status, amount, parameters } = res.body.deposit;
          expect(txKey).to.equal(transactionKey);
          expect(bonus).to.equal(null);
          expect(status).to.equal('complete');
          expect(amount).to.equal(4500);
          expect(parameters).to.deep.equal({ foo: 'bar', zoo: 1 });
        });
    });
  });

  describe('deposit with unknown account id', () => {
    let headers;
    let transactionKey;
    let playerId;

    before(async () => {
      await setup.players();
      await request(app)
        .post('/api/LD/v1/login')
        .send({ email: john.email, password: john.password, ipAddress: '94.222.17.20' })
        .expect(200)
        .expect((res) => {
          headers = { Authorization: `Token ${res.body.token}` };
          playerId = res.body.player.id;
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
        .send({ amount: 4500, account: '', externalTransactionId: '243254345543534534', status: 'complete', rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(4500);
          expect(bonusBalance).to.equal(0);
        });
    });

    it('updates deposit account when re-executing in complete status with account holder', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: '', accountHolder: 'Larry Darry', externalTransactionId: '243254345543534534', status: 'complete', accountParameters: {}, rawTransaction: { id: 123, xxx: 'yyy' } })
        .expect(200)
        .expect((res) => {
          const { balance: { numDeposits, balance, bonusBalance } } = res.body;
          expect(numDeposits).to.equal(1);
          expect(balance).to.equal(4500);
          expect(bonusBalance).to.equal(0);
        });

      await request(app)
        .get(`/api/v1/player/${playerId}/accounts`)
        .expect((res) => {
          expect(res.body.accounts[0].accountHolder).to.equal('Larry Darry');
        });
    });
  });

  describe('update account after processing deposit with empty account', () => {
    let headers;
    let transactionKey;
    let playerId;

    before(async () => {
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
        .send({ amount: 4500, account: '', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200);
    });

    it('creates new account with account holder + account after processing deposit', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'XX123213', accountHolder: 'Doe John Person', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200);
      const { accounts } = await getAccountsWithKycData(playerId);
      expect(accounts).to.containSubset([
        {
          account: '',
          accountHolder: null,
          allowWithdrawals: false,
          canWithdraw: false,
          active: true,
        },
        {
          account: 'XX123213',
          accountHolder: 'Doe John Person',
          allowWithdrawals: true,
          canWithdraw: true,
          kycChecked: true,
          active: true,
        },
      ]);
    });
  });

  describe('already existing deposit', () => {
    let headers;
    let transactionKey;
    let playerId;

    before(async () => {
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
    });

    it('has 1x wagering requirement active', async () => {
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 4500, type: 'deposit_wager' });
    });

    it('is idempotent when processing the deposit second time', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}`)
        .send({ amount: 4500, account: 'XX123213', externalTransactionId: '243254345543534534' })
        .set(headers)
        .expect(200);
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 4500, type: 'deposit_wager' });
    });

    it('can create campaign wagering requirement for deposit', async () => {
      await request(app)
        .put(`/api/LD/v1/deposit/${transactionKey}/wager`)
        .send({ wageringRequirement: 8000 })
        .set(headers)
        .expect(200);
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 8000, type: 'deposit_campaign' });
    });

    it('can set extra wagering requirement for deposit', async () => {
      await request(app)
        .post(`/api/LD/v1/deposit/${transactionKey}/wager`)
        .send({ wageringRequirement: 8000 })
        .set(headers)
        .expect(200);
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 12500, type: 'deposit_wager' });
    });

    it('lowers the limit for deposit campaign', async () => {
      const { id } = await pg('player_counters').first('id').where({ playerId, type: 'deposit_campaign' });
      await pg.transaction(tx => Limit.setDepositWageringCounter(id, 0, tx));
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 12500, type: 'deposit_wager' });
    });


    it('lowers the limit from backoffice and can create withdrawal', async () => {
      const { id } = await pg('player_counters').first('id').where({ playerId, type: 'deposit_wager' });
      await pg.transaction(tx => Limit.setDepositWageringCounter(id, 50, tx));
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 50, type: 'deposit_wager' });
    });

    it('does not return counter when it has been completely wagered', async () => {
      const { id } = await pg('player_counters').first('id').where({ playerId, type: 'deposit_wager' });
      await pg('player_counters').update({ amount: 2000 }).where({ id });
      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 0, type: undefined });
    });
  });

  describe('custom wagering requirement set', () => {
    let headers;
    let transactionKey;
    let playerId;

    before(async () => {
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
    });

    it('resets campaign wagering requirements when balance almost zero', async () => {
      await pg.transaction(async (tx) => {
        await addTransaction(playerId, null, 'correction', -4000, 'remove', null, tx);
        await Bonus.doMaintenance(playerId, tx);
      });

      const counter = await Limit.getWageringRequirementCounter(playerId);
      expect(counter).to.deep.equal({ amount: 0, limit: 8000, type: 'deposit_campaign' });

      await pg.transaction(async (tx) => {
        await addTransaction(playerId, null, 'correction', -400, 'remove', null, tx);
        await Bonus.doMaintenance(playerId, tx);
      });

      const counter2 = await Limit.getWageringRequirementCounter(playerId);
      expect(counter2).to.deep.equal({ amount: 0, limit: 4500, type: 'deposit_wager' });
    });
  });

  describe('payment server integration', () => {
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

      await request(app)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Skrill_Skrill', amount: 5000, parameters: { foo: 'bar', zoo: 1 } })
        .set(headers)
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });

      nock('http://localhost:3007', { encodedQueryParams: true })
        .post('/api/v1/deposit', () => true)
        .reply(200, { url: 'http://foo.bar.com/asdasdad' });
    });

    it('executes call to external payment server', async () => {
      await request(app)
        .post('/api/LD/v1/executedeposit')
        .send({ accountId: null, transactionKey, params: {}, urls: { ok: 'http://localhost:3000/ok', failure: 'http://localhost:3000/fail' }, client: { ipAddress: '10.110.11.11', userAgent: 'none', isMobile: true } })
        .set(headers)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            url: 'http://foo.bar.com/asdasdad',
          });
        })
        .expect(200);
    });
  });
});
