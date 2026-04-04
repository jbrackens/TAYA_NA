/* @flow */

const request = require('supertest');
const { v1: uuid } = require('uuid');
const app = require('../../index');

describe('Kyc documents', () => {
  describe('photo document', () => {
    let john;
    before(async () => {
      const players = await setup.players();
      john = players.john;
    });

    it('can create a document', () =>
      request(app)
        .post(`/api/v1/player/${john.id}/kyc`)
        .send({
          photos: [
            { id: uuid(), originalName: 'id.jpg' },
            { id: uuid(), originalName: 'driver.jpg' },
            { id: uuid(), originalName: 'xxx.jpg' },
          ],
        })
        .expect(200));

    let documents;
    it('checks created documents', async () => {
      await request(app)
        .get(`/api/v1/player/${john.id}/kyc`)
        .expect((res) => {
          documents = res.body;
          expect(documents).to.containSubset([
            { name: 'id.jpg' },
            { name: 'driver.jpg' },
          ]);
        });
    });

    it('verifies one of created documents', async () =>
      request(app)
        .put(`/api/v1/player/${john.id}/kyc/verify`)
        .send([{
          id: documents[0].id,
          type: 'identification',
          expiryDate: new Date(),
        }]));

    it('declines created document', async () =>
      request(app)
        .delete(`/api/v1/player/${john.id}/kyc/${documents[2].id}`));

    it('checks that only new documents are returned', async () => {
      await request(app)
        .get(`/api/v1/player/${john.id}/kyc`)
        .expect((res) => {
          expect(res.body).to.containSubset([
            { name: 'driver.jpg' },
          ]);
        });
    });
  });

  describe('content document', () => {
    let john;
    before(async () => {
      const players = await setup.players();
      john = players.john;
    });

    it('can create a document', () =>
      request(app)
        .post(`/api/v1/player/${john.id}/kyc/content`)
        .send({
          content: '- foo\n- bar\n',
        }));

    let documents;
    it('checks created documents', async () => {
      await request(app)
        .get(`/api/v1/player/${john.id}/kyc`)
        .expect((res) => {
          documents = res.body;
          expect(documents.length).to.equal(1);
          expect(res.body).to.containSubset([
            { status: 'new' },
          ]);
        });
    });

    it('verifies one of created documents', async () =>
      request(app)
        .put(`/api/v1/player/${john.id}/kyc`)
        .send([{
          id: documents[0].id,
          type: 'identification',
          expiryDate: new Date(),
        }]));

    it('checks that only new documents are returned', async () => {
      await request(app)
        .get(`/api/v1/player/${john.id}/kyc`)
        .expect((res) => {
          expect(res.body.length).to.equal(1);
        });
    });
  });

  describe('document request', () => {
    let john;
    before(async () => {
      const players = await setup.players();
      john = players.john;
    });

    it('can request a document', () =>
      request(app)
        .post(`/api/v1/player/${john.id}/kyc/request`)
        .send({
          message: 'We would a copy of your passport with full front page visible',
          note: 'Requesting this again as it was Mickey Mouse club membership card with fake name',
          documents: [{
            type: 'identification',
          }],
        })
        .expect(200));

    it('returns status when documents are required', () =>
      request(app)
        .get(`/api/v1/player/${john.id}/account-status`)
        .expect((res) => {
          expect(res.body).to.containSubset({
            documentsRequested: true,
          });
        })
        .expect(200)
    );

    it('can list document requests', () =>
      request(app)
        .get(`/api/v1/player/${john.id}/kyc/request`)
        .expect((res) => {
          expect(res.body).to.containSubset([
            {
              status: 'requested',
              documentType: 'identification',
            }
          ]);
        })
        .expect(200));
  });
});
