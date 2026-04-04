/* @flow */
import type { RiskDraftDefinition } from './Risk';

const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../index');

const riskDraft: RiskDraftDefinition = {
  type: 'geo',
  fraudKey: 'some_key',
  points: 50,
  maxCumulativePoints: 50,
  requiredRole: 'payments',
  active: true,
  name: 'Some name',
  title: 'Some title',
  description: 'Some description',
  manualTrigger: true,
};

describe('risks', () => {
  let riskId;

  before(async () => {
    await pg('risks').where({ fraudKey: riskDraft.fraudKey }).del();
  });

  describe('POST /risks', () => {
    it('creates risk', async () => {
      await request(app)
        .post('/api/v1/risks')
        .send(riskDraft)
        .expect(({ body }) => {
          expect(body.id).to.be.a('number');
          riskId = body.id;
        })
        .expect(200);
    });
  });

  describe('GET /risks', () => {
    it('get risks list', async () => {
      await request(app)
        .get('/api/v1/risks?manualTrigger=true')
        .expect(({ body }) => {
          expect(body).to.containSubset([{ ...riskDraft, id: riskId }]);
        })
        .expect(200);
    });
  });

  describe('PUT /risks/:riskId', () => {
    it('can update risk', async () => {
      await request(app)
        .put(`/api/v1/risks/${riskId}`)
        .send({ ...riskDraft, active: false })
        .expect(({ body }) => {
          expect(body.active).to.equal(false);
        })
        .expect(200);
    });
  });
});
