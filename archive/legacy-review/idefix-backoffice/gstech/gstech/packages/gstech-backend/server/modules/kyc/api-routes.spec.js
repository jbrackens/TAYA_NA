/* @flow */
const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');
const { findOrCreateAccount } = require('../accounts/Account');
const { players: { john } } = require('../../../scripts/utils/db-data');

describe('KYC documents', () => {
  let headers;
  let accountId;

  before(async () => {
    const { john: player } = await setup.players();
    accountId = await pg.transaction(tx => findOrCreateAccount(player.id, 1, 'FI2112345600008739', null, 1, { bic: 'DABAIE2D' }, tx));
    headers = await setup.login(app, john.email, john.password);
  });

  it('adds kyc document for player', () =>
    request(app)
      .post('/api/LD/v1/documents')
      .set(headers)
      .send({
        type: 'identification',
        content: '- Owner name: *XXX XXX*\n- Account reference: *FI2112345600008739*',
        source: 'JeezAuth',
        fields: {
          nationalId: '123123123F',
          name: '123123',
          address: '123123312',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.updated).to.equal(true);
      }));

  it('ignores update when posting same kyc document again', () =>
    request(app)
      .post('/api/LD/v1/documents')
      .set(headers)
      .send({
        type: 'identification',
        content: '- Owner name: *XXX XXX*\n- Account reference: *FI2112345600008739*',
        source: 'JeezAuth',
        fields: {
          nationalId: '123123123F',
          name: '123123',
          address: '123123312',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.updated).to.equal(false);
      }));


  it('adds account kyc document for player ', () =>
    request(app)
      .post('/api/LD/v1/documents')
      .set(headers)
      .send({
        accountId,
        type: 'payment_method',
        fields: {
          content: 125,
        },
        content: `- Name: *XXX XXX XXXXXI*
- Address: *XXXX, XXX, XX*
- Date of Birth: *1955-05-05*`,
      })
      .expect(200));

  it('can create document with attachment', async () => {
    await request(app)
      .post('/api/LD/v1/upload')
      .set(headers)
      .attach('photo', Buffer.from('radom binary content'), { filename: 'example.jpg', contentType: 'multipart/form-data' })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          photoId: res.body.photoId,
          originalName: 'example.jpg',
        });
      })
      .expect(201);
  });
});
