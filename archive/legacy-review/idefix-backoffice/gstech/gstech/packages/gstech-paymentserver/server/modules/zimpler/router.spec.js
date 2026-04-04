/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('Zimpler Callback API', () => {
  let sessionId;
  let transactionKey = '';
  let username;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
        countryId: 'FI',
      })
      .expect((res) => {
        sessionId = res.body.token;
        username = res.body.player.username;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Zimpler_Zimpler', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
    const paymentId = uuid();

    nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
      .get(`/v3/authorizations/${transactionKey}`)
      .reply(200, {
        id: transactionKey,
        method: 'web',
        state: 'captured',
        type: 'payment',
        payment:
        {
          id: paymentId,
          ref: transactionKey,
          state: 'captured',
          type: 'flexible_amount',
          requested_amount: '200.00',
          requested_min_amount: '100.00',
          authorized_amount: '200.00',
          captured_amount: null,
          currency: 'SEK',
          created_at: '2018-09-10T07:05:07Z',
          expires_at: null,
          items: null,
        },
        country: 'SE',
        mobile_phone: '+46700000000',
        verified_mobile_phone: '+46700000000',
        email: 'bobben@example.com',
        site: 'exampledomain.com',
        account_ref: username,
        created_at: '2018-09-10T07:05:07Z',
      });

    nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
      .get(`/v3/authorizations/${transactionKey}`)
      .reply(200, { id: 'ab6a572671ab07bbd962',
        method: 'web',
        state: 'approved',
        country: 'DE',
        mobile_phone: '+4903950570279',
        verified_mobile_phone: '+35850000000',
        email: 'jack.3950570278@hotmail.com',
        site: 'luckydino.com',
        first_name: 'Jack',
        last_name: 'Sparrow',
        address_line_1: 'Fugger Strasse 56',
        address_line_2: null,
        address_postcode: '06820',
        address_city: 'Dessau',
        address_country: 'DE',
        date_of_birth: '1989-02-01',
        national_identification_number: null,
        is_kyc_performed: false,
        account_ref: username,
        created_at: '2019-04-10T11:57:08Z',
        type: 'login',
      });

    nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
      .post(`/v3/payments/${paymentId}/capture`)
      .reply(200, {
        id: paymentId,
        authorization_id: transactionKey,
        ref: transactionKey,
        state: 'captured',
        type: 'flexible_amount',
        requested_amount: '200.00',
        requested_min_amount: '100.00',
        authorized_amount: '180.00',
        captured_amount: '180.00',
        currency: 'SEK',
        created_at: '2018-09-10T07:05:07Z',
        expires_at: null,
        items:
        [{
          title: 'Payment at exampledomain.com',
          quantity: null,
          vat_percentage: '25.00',
          unit_price_including_vat: '180.00',
        }],
      });

    nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
      .get(`/v3/authorizations/${transactionKey}/kyc`)
      .reply(200, {
        user_id: 'e89918b4-3162-eb6d-c747-77d19b19ece6',
        national_identification_number: '19840307-4910',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        country_code: 'SE',
        date_of_birth: '1984-03-07',
        pep: false,
        address_line_1: '123 sesame street',
        address_line_2: null,
        address_postcode: '123456',
        address_city: 'Sudden Valley',
        address_country: 'Sweden',
      });

    nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
      .get('/v3/authorizations/ab6a572671ab07bbd962/kyc')
      .reply(200, {
        user_id: 'e89918b4-3162-eb6d-c747-77d19b19ece6',
        national_identification_number: '19840307-4910',
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        country_code: 'SE',
        date_of_birth: '1984-03-07',
        pep: false,
        address_line_1: '123 sesame street',
        address_line_2: null,
        address_postcode: '123456',
        address_city: 'Sudden Valley',
        address_country: 'Sweden',
      });
  });

  it('can handle deposit callback', async () =>
    request(app)
      .post(`/api/v1/zimpler/process/LD/${transactionKey}`)
      .send('okUrl=http://localhost:3001/ok&failureUrl=http://localhost:3001/fail')
      .expect(302)
      .expect((res) => {
        expect(res.headers.location).to.equal('http://localhost:3001/ok');
      }));

  it('can handle kyc callback', async () =>
    request(app)
      .post(`/api/v1/zimpler/process/LD/${transactionKey}`)
      .send('okUrl=http://localhost:3001/ok&failureUrl=http://localhost:3001/fail')
      .expect(302)
      .expect((res) => {
        expect(res.headers.location).to.equal('http://localhost:3001/ok');
      }));
});
