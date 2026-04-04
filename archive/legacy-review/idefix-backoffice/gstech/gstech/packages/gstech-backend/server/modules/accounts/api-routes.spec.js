/* @flow */
const request = require('supertest');
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');
const { findOrCreateAccount } = require('./Account');

const { players: { john } } = require('../../../scripts/utils/db-data');

describe('Accounts', () => {
  let headers;
  let accountId;
  let playerId;

  before(async () => {
    const { john: player } = await setup.players();
    playerId = player.id;
    accountId = await pg.transaction(tx => findOrCreateAccount(player.id, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
    headers = await setup.login(app, john.email, john.password);
  });

  it('returns account with parameters', () =>
    request(app)
      .get(`/api/LD/v1/accounts/${accountId}`)
      .set(headers)
      .expect(200)
      .expect(res => expect(res.body).to.containSubset({
        playerId,
        account: 'FI2112345600008739',
        paymentMethodId: 1,
        paymentMethod: 'BankTransfer',
        withdrawals: true,
        parameters: { bic: 'DABAIE2D' },
      })));

  it('can update account parameters', async () => {
    await request(app)
      .put(`/api/LD/v1/accounts/${accountId}/parameters`)
      .set(headers)
      .expect(200)
      .send({
        parameters: {
          param1: 'abc',
          param2: 'def',
        },
      })
      .expect((res) => {
        expect(res.body).to.containSubset({ ok: true });
      });

    await request(app)
      .get(`/api/v1/player/${playerId}/accounts`)
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(_.last(res.body.accounts).parameters).to.containSubset({
          param1: 'abc',
          param2: 'def',
        });
      });
  });

  it('can update account holder', async () => {
    await request(app)
      .post(`/api/LD/v1/accounts/${accountId}/holder`)
      .set(headers)
      .expect(200)
      .send({
        accountHolder: 'Jack Sparrow',
      })
      .expect((res) => {
        expect(res.body).to.containSubset({ ok: true });
      });

    await request(app)
      .get(`/api/v1/player/${playerId}/accounts`)
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(_.last(res.body.accounts).accountHolder).to.equal('Jack Sparrow');
      });
  });
});
