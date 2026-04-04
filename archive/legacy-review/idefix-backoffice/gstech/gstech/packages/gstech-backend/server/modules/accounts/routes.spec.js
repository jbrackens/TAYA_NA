/* @flow */
const request = require('supertest');
const app = require('../../index');
const { queryPlayerEvents } = require('../players');

describe('Payment accounts', () => {
  let john;
  let accountId;

  before(async () => {
    const { john: player } = await setup.players();
    john = player;
  });

  it('adds an account to player', async () => {
    await request(app)
      .post(`/api/v1/player/${john.id}/accounts`)
      .send({
        method: 'BankTransfer',
        account: 'FOOO123123123',
        kycChecked: false,
        documents: [
          {
            photoId: null,
            content: 'teadsklmadskdasmkldklmsamkldasklmdsaklmdsadas',
            expiryDate: null,
            name: 'null',
          },
        ],
        parameters: {
          bic: 'DABAIE2D',
        },
      })
      .expect(200);
  });

  it('lists available accounts for player', async () => {
    await request(app)
      .get(`/api/v1/player/${john.id}/accounts`)
      .expect(200)
      .expect((res) => {
        accountId = res.body.accounts[0].id;
        expect(res.body.accounts).to.containSubset([
          {
            account: 'FOOO123123123',
            active: true,
            kyc: 'Not verified (1 Docs)',
            method: 'BankTransfer',
            withdrawals: true,
            documents: [{
              content: 'teadsklmadskdasmkldklmsamkldasklmdsaklmdsadas',
            }],
            parameters: {
              bic: 'DABAIE2D',
            },
          },
        ]);
      });
  });

  it('updates account number and adds bic number', async () => {
    await request(app)
      .put(`/api/v1/player/${john.id}/accounts/${accountId}`)
      .send({
        account: 'FI2112345600008739',
        parameters: { bic: 'NDE123123' },
      })
      .expect((res) => {
        expect(res.body).to.containSubset({ id: accountId, active: true, account: 'FI2112345600008739', parameters: { bic: 'NDE123123' } });
      })
      .expect(200);
    const events = await queryPlayerEvents(john.id);
    expect(events).to.containSubset([
      {
        type: 'account',
        key: 'updateAccount.account',
        title: 'Changed account FOOO123123123 number to FI2112345600008739',
        handle: 'Test',
      },
      {
        type: 'account',
        key: 'createAccount',
        title: 'Added new BankTransfer account FOOO123123123',
      },
    ]);
  });

  it('disables an account of player', async () => {
    await request(app)
      .put(`/api/v1/player/${john.id}/accounts/${accountId}`)
      .send({
        active: false,
      })
      .expect((res) => {
        expect(res.body).to.containSubset({ id: accountId, active: false, account: 'FI2112345600008739', parameters: { bic: 'NDE123123' } });
      })
      .expect(200);
    const events = await queryPlayerEvents(john.id);
    expect(events).to.containSubset([
      {
        type: 'account',
        key: 'updateAccount.active',
        title: 'Set account FI2112345600008739 activity off',
        handle: 'Test',
      },
      {
        type: 'account',
        key: 'updateAccount.account',
        title: 'Changed account FOOO123123123 number to FI2112345600008739',
        handle: 'Test',
      },
      {
        type: 'account',
        key: 'createAccount',
        title: 'Added new BankTransfer account FOOO123123123',
      },
    ]);
  });

  it('adds another account to player with kycChecked status checked', async () => {
    await request(app)
      .post(`/api/v1/player/${john.id}/accounts`)
      .send({
        method: 'BankTransfer',
        account: 'FOOO123123124',
        kycChecked: true,
        documents: [
          {
            photoId: null,
            content: 'teadsklmadskdasmkldklmsamkldasklmdsaklmdsadas',
            expiryDate: null,
            name: 'null',
          },
        ],
        parameters: {
          bic: 'DABAIE2D',
        },
      })
      .expect(200);
    await request(app)
      .get(`/api/v1/player/${john.id}/accounts`)
      .expect(200)
      .expect((res) => {
        expect(res.body.accounts).to.containSubset([
          {
            account: 'FOOO123123124',
            active: true,
            withdrawals: true,
            parameters: { bic: 'DABAIE2D' },
            kycChecked: true,
            kyc: 'Verified (1 Docs)',
            allowWithdrawals: true,
          },
        ]);
      });
  });
});
