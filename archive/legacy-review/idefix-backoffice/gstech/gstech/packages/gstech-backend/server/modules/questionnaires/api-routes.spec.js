/* @flow */
const request = require('supertest');
const app = require('../../index');

const { players: { john } } = require('../../../scripts/utils/db-data');

describe('Questionnaires API', () => {
  let headers;
  before(async () => {
    await setup.players();
    headers = await setup.login(app, john.email, john.password);
  });

  it('returns list of required questionnaires', () =>
    request(app)
      .get('/api/LD/v1/questionnaires/required')
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({ result: [] });
      }));

  it('returns unanswered questionnaires', () =>
    request(app)
      .get('/api/LD/v1/questionnaires')
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          result: [
            {
              name: 'PEP',
              description: 'AML: Politically Exposed Person',
              questions: [
                {
                  key: 'pep',
                  question: 'Politically exposed person',
                  required: true,
                },
              ],
            },
            {
              name: 'SOW',
              description: 'AML: Source of Wealth',
              questions: [
                {
                  key: 'source_of_wealth',
                  question: 'Source of Wealth',
                  required: true,
                },
                {
                  key: 'explanation',
                  question: 'Additional explanation',
                  required: false,
                },
              ],
            },
          ],
        });
      }));

  it('answers questionnaire', () =>
    request(app)
      .post('/api/LD/v1/questionnaires/PEP')
      .send({ pep: 'true' })
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({ result: [] });
      }));

  it('answers other as source of wealth', () =>
    request(app)
      .post('/api/LD/v1/questionnaires/SOW')
      .send({ source_of_wealth: 'income,other', explanation: 'Stole from granny' })
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({ result: [] });
      }));
});
