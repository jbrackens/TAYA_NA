/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const api = require('../../api-server');

// nock.recorder.rec();
describe('Zimpler API', () => {
  nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
    .post('/v3/authorizations', {
      method: 'web',
      type: 'payment',
      payment: {
        ref: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
        type: 'flexible_amount',
        requested_amount: '194.00',
        requested_min_amount: '20.00',
        currency: 'EUR',
      },
      locale: 'en',
      country: 'FI',
      mobile_phone: '+3586666666666',
      email: 'test@gmail.com',
      site: 'luckydino.com',
      account_ref: 'LD_Test.User_123',
      first_name: 'Test',
      last_name: 'User',
      address_line_1: '123 sesame street',
      address_line_2: null,
      address_postcode: '123456',
      address_city: 'Sudden Valley',
      address_country: 'FI',
      date_of_birth: '1995-01-01',
      is_kyc_performed: false,
    })
    .reply(201, {
      id: '1dc21c5ea4d5a79ab9a3',
      method: 'web',
      state: 'pending',
      country: 'FI',
      mobile_phone: '+3586666666666',
      verified_mobile_phone: null,
      email: 'test@gmail.com',
      site: 'luckydino.com',
      first_name: 'Test',
      last_name: 'User',
      address_line_1: '123 sesame street',
      address_line_2: null,
      address_postcode: '123456',
      address_city: 'Sudden Valley',
      address_country: 'FI',
      date_of_birth: '1995-01-01',
      national_identification_number: null,
      is_kyc_performed: false,
      account_ref: 'LD_Test.User_123',
      created_at: '2019-03-03T08:42:04Z',
      type: 'payment',
      payment: {
        id: '83b117cced486b520f5b',
        ref: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
        state: 'pending',
        type: 'flexible_amount',
        requested_amount: '194.00',
        requested_min_amount: '20.00',
        authorized_amount: null,
        captured_amount: null,
        currency: 'EUR',
        created_at: '2019-03-03T08:42:04Z',
        expires_at: null,
        items: null,
      },
      recurring: false,
    });

  nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
    .post('/v3/authorizations', { method: 'web',
      type: 'login',
      payment: {
        ref: '',
        type: 'flexible_amount',
        requested_amount: '0.00',
        requested_min_amount: '0.00',
        currency: 'EUR',
      },
      locale: 'en',
      country: 'FI',
      mobile_phone: '+3586666666666',
      email: 'test@gmail.com',
      site: 'luckydino.com',
      account_ref: 'LD_Test.User_123',
      first_name: 'Test',
      last_name: 'User',
      address_line_1: '123 sesame street',
      address_line_2: null,
      address_postcode: '123456',
      address_city: 'Sudden Valley',
      address_country: 'FI',
      date_of_birth: '1995-01-01',
      is_kyc_performed: false,
    })
    .reply(201, { id: 'c586ccea7cb67da19bc1',
      method: 'web',
      state: 'pending',
      country: 'DE',
      mobile_phone: '+4903950570167',
      verified_mobile_phone: null,
      email: 'jack.3950570166@hotmail.com',
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
      account_ref: 'LD_Jack.Sparrow_3000386',
      created_at: '2019-04-10T11:26:42Z',
      type: 'login',
    });

  nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
    .post('/v3/withdrawals/direct', {
      approved_amount: '194.00',
      currency: 'EUR',
      user_id: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
      ref: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
      account_ref: 'LD_Test.User_123',
      site: 'luckydino.com',
    })
    .reply(200, {
      merchant_action_timeout: '2018-11-30T13:26:15.207Z',
      site: 'blahaj.com',
      ref: null,
      state: 'approved',
      currency: 'SEK',
      requested_amount: '500.00',
      kyc_info: {
        first_name: 'Henrik Testperson',
        address_line_2: null,
        address_postcode: '17229',
        national_identification_number: '19870619-4852',
        pep: false,
        address_country: 'Sweden',
        date_of_birth: '1987-06-19',
        last_name: 'Testson',
        address_line_1: 'Box 1529 / Prod Utv',
        user_id: '9b9047da-175f-d29a-dae8-85b428488c2e',
        country_code: 'SE',
        full_name: 'Henrik Testperson Testson',
        address_city: 'Sundbyberg',
      },
      id: '583d5451-b10c-45bd-b94a-615b7f3da988',
      rejector: null,
      user_id: '9b9047da-175f-d29a-dae8-85b428488c2e',
      authorized_at: '2018-11-30T13:26:15.132Z',
      account_ref: null,
      deferred_expires_at: null,
      verified_mobile_phone: '+46700000018',
    });

  nock('https://api-sandbox.zimpler.net:443', { encodedQueryParams: true })
    .post('/v3/withdrawals/direct', {
      approved_amount: '194.00',
      currency: 'EUR',
      user_id: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
      ref: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
      account_ref: 'LD_Test.User_123',
      site: 'luckydino.com',
    }).times(2)
    .reply(200, {
      merchant_action_timeout: '2018-11-30T13:26:15.207Z',
      site: 'blahaj.com',
      ref: null,
      state: 'approved',
      currency: 'SEK',
      requested_amount: '500.00',
      kyc_info: {
        first_name: 'Henrik Testperson',
        address_line_2: null,
        address_postcode: '17229',
        national_identification_number: '19870619-4852',
        pep: false,
        address_country: 'Sweden',
        date_of_birth: '1987-06-19',
        last_name: 'Testson',
        address_line_1: 'Box 1529 / Prod Utv',
        user_id: '9b9047da-175f-d29a-dae8-85b428488c2e',
        country_code: 'SE',
        full_name: 'Henrik Testperson Testson',
        address_city: 'Sundbyberg',
      },
      id: '583d5451-b10c-45bd-b94a-615b7f3da988',
      rejector: null,
      user_form_url: 'https://my.zimpler.com/update/239867189',
      user_id: '9b9047da-175f-d29a-dae8-85b428488c2e',
      authorized_at: '2018-11-30T13:26:15.132Z',
      account_ref: null,
      deferred_expires_at: null,
      verified_mobile_phone: '+46700000018',
    });

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          firstName: 'Test',
          lastName: 'User',
          currencyId: 'EUR',
          countryId: 'FI',
          languageId: 'en',
          address: '123 sesame street',
          postCode: '123456',
          city: 'Sudden Valley',
          address_country: 'FI',
          dateOfBirth: '1995-01-01',
          verified: false,
          mobilePhone: '3586666666666',
          brandId: 'LD',
        },
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        deposit: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Zimpler',
          paymentProvider: 'Zimpler',
          minDeposit: 2000,
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
        });
        expect(res.body.html).to.contain('payForm_1dc21c5ea4d5a79ab9a3');
      }));

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          mobilePhone: '3586666666666',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: {
            zimplerId: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          },
          paymentMethodName: 'Zimpler',
          paymentProvider: 'Zimpler',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '583d5451-b10c-45bd-b94a-615b7f3da988',
          ok: true,
          message: 'approved',
        });
      }));

  it('can execute withdrawal with sms notification', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          mobilePhone: '3586666666666',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: {
            zimplerId: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          },
          paymentMethodName: 'Zimpler',
          paymentProvider: 'Zimpler',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '583d5451-b10c-45bd-b94a-615b7f3da988',
          ok: true,
          message: 'approved. Your withdrawal will be proceeded with Zimpler. Please follow the link to confirm your Zimpler account: https://my.zimpler.com/update/239867189',
          complete: true,
        });
      }));

  it('can execute withdrawal with localized sms notification', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          mobilePhone: '3586666666666',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: {
            zimplerId: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          },
          paymentMethodName: 'Zimpler',
          paymentProvider: 'Zimpler',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '583d5451-b10c-45bd-b94a-615b7f3da988',
          ok: true,
          message: 'approved. Deine Auszahlung mit Zimpler wird durchgeführt. Bitte folge dem Link um Dein Zimpler Konto zu bestätigen: https://my.zimpler.com/update/239867189',
          complete: true,
        });
      }));

  it('can execute identify', async () =>
    request(api)
      .post('/api/v1/identify')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          firstName: 'Test',
          lastName: 'User',
          currencyId: 'EUR',
          countryId: 'FI',
          languageId: 'en',
          address: '123 sesame street',
          postCode: '123456',
          city: 'Sudden Valley',
          address_country: 'FI',
          dateOfBirth: '1995-01-01',
          verified: false,
          mobilePhone: '3586666666666',
          brandId: 'LD',
        },
        identify: {
          paymentProvider: 'Zimpler',
        },
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
        });
        expect(res.body.html).to.contain('payForm_c586ccea7cb67da19bc1');
      }));
});
