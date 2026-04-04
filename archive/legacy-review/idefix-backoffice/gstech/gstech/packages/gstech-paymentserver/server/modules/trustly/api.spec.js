/* @flow */
const request = require('supertest');  
const nock = require('nock');  

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('Trustly API', () => {
  let player;
  let accountId;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post(`/api/LD/v1/player/${player.id}/accounts`)
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
        parameters: { },
      })
      .expect((res) => {
        accountId = res.body;
      })
      .expect(200);

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'Deposit' && r.params.Data.Attributes.RequestKYC === undefined && r.params.Data.Attributes.Method === undefined && r.params.Data.NotificationURL.endsWith('standard'))
      .reply(200, {
        version: '1.1',
        result: {
          uuid: '74b1eeaf-a57b-47b7-912a-536ef3c432ac',
          signature: 'MQVkhmZsDE6Nmu8Di0RH7qnEOGiO2fssSg+10mu75t9uKCOp+Ij2Dh2PlsO28bvyKBqUU5G/mH4sgzuPd/ZZPiSyFFM+a0JDKL4d3wv0Z2cQoi3ZAzkqa//c9tJ/iXzGoq+QaGLCf9C5ynljF70io/606aEefBj9XbCg7yW4Fj4kFr2BxiUVSgHfcaPARaimDf41kdik8YH5h4AY4cl8gU+mu6Yuf1HDYRM+P0bseJv9ng7UQtG9oMqJuPng3L7NkwyM5V+QG+mLEs7wCTpQGEpFdylWYBAC4z1LCAa2ZHMCKoUNa1ACiq6Mp8Bthwv6C8aLxWViONAueSJTCLyH2g==',
          data: {
            orderid: '3060958854',
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI' },
          method: 'Deposit',
        },
      });

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'Deposit' && r.params.Data.Attributes.RequestKYC === undefined && r.params.Data.Attributes.Method === 'deposit.bank.finland.okoy_bankbutton' && r.params.Data.NotificationURL.endsWith('bank'))
      .reply(200, {
        version: '1.1',
        result: {
          uuid: '74b1eeaf-a57b-47b7-912a-536ef3c432ac',
          signature: 'MQVkhmZsDE6Nmu8Di0RH7qnEOGiO2fssSg+10mu75t9uKCOp+Ij2Dh2PlsO28bvyKBqUU5G/mH4sgzuPd/ZZPiSyFFM+a0JDKL4d3wv0Z2cQoi3ZAzkqa//c9tJ/iXzGoq+QaGLCf9C5ynljF70io/606aEefBj9XbCg7yW4Fj4kFr2BxiUVSgHfcaPARaimDf41kdik8YH5h4AY4cl8gU+mu6Yuf1HDYRM+P0bseJv9ng7UQtG9oMqJuPng3L7NkwyM5V+QG+mLEs7wCTpQGEpFdylWYBAC4z1LCAa2ZHMCKoUNa1ACiq6Mp8Bthwv6C8aLxWViONAueSJTCLyH2g==',
          data: {
            orderid: '3060958854',
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI' },
          method: 'Deposit',
        },
      });

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'Deposit' && r.params.Data.Attributes.RequestKYC === undefined && r.params.Data.Attributes.Method === undefined && r.params.Data.NotificationURL.endsWith('standard'))
      .reply(200, {
        version: '1.1',
        result: {
          uuid: '74b1eeaf-a57b-47b7-912a-536ef3c432ac',
          signature: 'MQVkhmZsDE6Nmu8Di0RH7qnEOGiO2fssSg+10mu75t9uKCOp+Ij2Dh2PlsO28bvyKBqUU5G/mH4sgzuPd/ZZPiSyFFM+a0JDKL4d3wv0Z2cQoi3ZAzkqa//c9tJ/iXzGoq+QaGLCf9C5ynljF70io/606aEefBj9XbCg7yW4Fj4kFr2BxiUVSgHfcaPARaimDf41kdik8YH5h4AY4cl8gU+mu6Yuf1HDYRM+P0bseJv9ng7UQtG9oMqJuPng3L7NkwyM5V+QG+mLEs7wCTpQGEpFdylWYBAC4z1LCAa2ZHMCKoUNa1ACiq6Mp8Bthwv6C8aLxWViONAueSJTCLyH2g==',
          data: {
            orderid: '3060958854',
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI' },
          method: 'Deposit',
        },
      });

    nock('https://test.trustly.com:443')
      .post('/api/1', r => r.method === 'RegisterAccount')
      .times(3)
      .reply(200, {
        result: {
          method: 'RegisterAccount',
          signature: 'HyML6NY005AnFAPh1M9SIUjldbCxt5QJmgwkQ6iG5cvFC7SiN/oViQdnoD5237p7IF0PKu6QiMOPxY2g7xPnN6fKUYEdQtgvlpq8+fz09t9F6OH7LFfHEv1n8K8VfaXMJbgbWrIrlWTqcnidnffAXwnq7a+cXIoQV+fYku6ELDlYsgq0s0DdKZR1dmG1PUQ1gfH8eXAK8lJx3et11yne0lRs20pn+c2gzuXZr6Y3d3gSm+/8jOKL0yYR2jXcWP5dA8jnCG0v/eYI4K9nLGpGzzg36t9kG7ZJvw5vcxqFyeXMqU+lPaT9coTdaOdAFeDZennSeExNcmt3OrD4bVksKA==',
          data: {
            accountid: '3523465062',
            descriptor: '************000785',
            bank: 'Nordea',
            clearinghouse: 'FINLAND',
          },
          uuid: 'c7c98c29-85e1-4cbd-a77b-28f99d6964d5',
        },
        version: '1.1',
      });

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'AccountPayout')
      .times(4)
      .reply(200, {
        version: '1.1',
        result: {
          method: 'AccountPayout',
          data: {
            result: '1',
            orderid: '3871577155',
          },
          uuid: 'd124f562-abdb-4868-9eb0-126308c0cebc',
          signature: 'cX/BINJQMK5swkJOCu7ZTb2fZ0L+1ZzgHK/DlVQYeTg+w729TteHH1JpRrgcIratmjmDJrAPSBuymLBwjJbS9hrOE6yXmTcAG+MF1ykVtQMpV2qJaMzWT9sUH0kkHhemhlUeYD+YfYup6+N0oVRCjAkin5Vsk0sYSFG6tm+qBgUsi1q/YLil9VeLHne+bepvRWhk6EL1sryU0X2xtJuCua/PWRoi4LSFhNwVJOB5Qb4U24B9nyEcZ7ub0t84N+sIPRYHaLbmwkft/KZZ9aBGbkAV+udC4jOisqmCt3hP1d+Rh07aWQWMs6u+q70Kq8XLOC0PP2TEA9GZggYJW4nz4g==',
        },
      });

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'Deposit' && r.params.Data.Attributes.RequestKYC === '1')
      .reply(200, {
        version: '1.1',
        result: {
          uuid: '74b1eeaf-a57b-47b7-912a-536ef3c432ac',
          signature: 'MQVkhmZsDE6Nmu8Di0RH7qnEOGiO2fssSg+10mu75t9uKCOp+Ij2Dh2PlsO28bvyKBqUU5G/mH4sgzuPd/ZZPiSyFFM+a0JDKL4d3wv0Z2cQoi3ZAzkqa//c9tJ/iXzGoq+QaGLCf9C5ynljF70io/606aEefBj9XbCg7yW4Fj4kFr2BxiUVSgHfcaPARaimDf41kdik8YH5h4AY4cl8gU+mu6Yuf1HDYRM+P0bseJv9ng7UQtG9oMqJuPng3L7NkwyM5V+QG+mLEs7wCTpQGEpFdylWYBAC4z1LCAa2ZHMCKoUNa1ACiq6Mp8Bthwv6C8aLxWViONAueSJTCLyH2g==',
          data: {
            orderid: '3060958854',
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI' },
          method: 'Deposit',
        },
      });

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'Deposit' && r.params.Data.Attributes.RequestKYC === '1' && r.params.Data.Attributes.Method === undefined && (r.params.Data.NotificationURL.endsWith('pnp') || r.params.Data.NotificationURL.includes('identify')))
      .times(3)
      .reply(200, {
        version: '1.1',
        result: {
          uuid: '74b1eeaf-a57b-47b7-912a-536ef3c432ac',
          signature: 'MQVkhmZsDE6Nmu8Di0RH7qnEOGiO2fssSg+10mu75t9uKCOp+Ij2Dh2PlsO28bvyKBqUU5G/mH4sgzuPd/ZZPiSyFFM+a0JDKL4d3wv0Z2cQoi3ZAzkqa//c9tJ/iXzGoq+QaGLCf9C5ynljF70io/606aEefBj9XbCg7yW4Fj4kFr2BxiUVSgHfcaPARaimDf41kdik8YH5h4AY4cl8gU+mu6Yuf1HDYRM+P0bseJv9ng7UQtG9oMqJuPng3L7NkwyM5V+QG+mLEs7wCTpQGEpFdylWYBAC4z1LCAa2ZHMCKoUNa1ACiq6Mp8Bthwv6C8aLxWViONAueSJTCLyH2g==',
          data: {
            orderid: '3060958854',
            url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI' },
          method: 'Deposit',
        },
      });

    nock('https://test.trustly.com:443', { encodedQueryParams: true })
      .post('/api/1', r => r.method === 'Balance')
      .times(6)
      .reply(200, {
        version: '1.1',
        result: {
          uuid: 'f4aab89b-d296-40c8-854a-a5008f2728d2',
          signature: 'Q9YGvGslSh5LlsZ/4TF11VIcmIqWqZwTfOApTRU1bLWn2YUlP2Sgdq3yzMHEa7djbUeNPKWGDbuJmZnwN11FwR6sQj7Qcokkegeeiz7OcN02w5nmCTiwXzFtoQKMeLB47nZVHWhNEz50qg3r3p1smPFSaCM1FyDQ3S26IRWRDzY7zhVlaaho1U1v8qLh7AW6FSLsfjLfixC8I7sYG1ldKJvdMYae5mNND596E4KCunwqkcFq0HZZaCSFi3zQpFrVAGBB0L9CzGoTexPxq7GP6q/PaWFb45AjsltE5hwfOCEUlAKHS8J5QKTjo/PDuMQmjVRyybkZd33hTcifikiupg==',
          data: [{ currency: 'EUR', balance: '5197.24' }, { balance: '0.00', currency: 'SEK' }],
          method: 'Balance',
        },
      });
  });

  it('can execute pnp deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'DE',
          firstName: 'Test',
          lastName: 'User',
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
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Trustly',
          paymentProvider: 'Trustly',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
        });
      }));

  it('can execute bank deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'FI',
          firstName: 'Test',
          lastName: 'User',
        },
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        params: { selectedBank: 'op' },
        deposit: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Trustly',
          paymentProvider: 'Trustly',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
        });
      }));

  it('can execute standard deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'ru',
          countryId: 'RU',
          firstName: 'Test',
          lastName: 'User',
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
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Trustly',
          paymentProvider: 'Trustly',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
        });
      }));

  it('can fail bank deposit if bank is not valid', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'FI',
          firstName: 'Test',
          lastName: 'User',
        },
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        params: { selectedBank: 'not_valid' },
        deposit: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Trustly',
          paymentProvider: 'Trustly',
        },
      })
      .expect(500)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: { message: 'Bank \'not_valid\' not found in the mapping' },
        });
      }));

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'DE',
          firstName: 'Test',
          lastName: 'User',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f44',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { trustlyAccountId: '3786320543', trustlyMode: 'standard' },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Trustly',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '3871577155',
          ok: true,
          message: 'Account Payout',
          complete: true,
          reject: false,
        });
      }));

  it('can execute iban withdrawal without trustlyAccountId', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'fi',
          countryId: 'FI',
          firstName: 'Test',
          lastName: 'User',
          city: 'Helsinki',
          address: 'Paskakali 13',
          postCode: '12345',
          dateOfBirth: '1995-01-01',
          mobilePhone: '3586666666666',
          nationalId: '36589852554745',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f22',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId,
          amount: 19400,
          status: 'accepted',
          account: 'FI21 123456 00000785',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Trustly',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '3871577155',
          ok: true,
          message: 'Account Payout',
          complete: true,
          reject: false,
        });
      }));

  it('can execute changed iban withdrawal with old trustlyAccountId', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'fi',
          countryId: 'FI',
          firstName: 'Test',
          lastName: 'User',
          city: 'Helsinki',
          address: 'Paskakali 13',
          postCode: '12345',
          dateOfBirth: '1995-01-01',
          mobilePhone: '3586666666666',
          nationalId: undefined,
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f22',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId,
          amount: 19400,
          status: 'accepted',
          account: 'MT84MALT011000012345MTLCAST001S',
          paymentParameters: { },
          accountParameters: { trustlyAccountId: '3523465062', trustlyAccountNumber: 'FI2112345600000785' },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Trustly',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '3871577155',
          ok: true,
          message: 'Account Payout',
          complete: true,
          reject: false,
        });
      }));

  it('can execute non iban withdrawal without trustlyAccountId', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'sv',
          countryId: 'SE',
          firstName: 'Test',
          lastName: 'User',
          city: 'Stockholm',
          address: 'Paskakali 13',
          postCode: '12345',
          dateOfBirth: '1995-01-01',
          mobilePhone: '3586666666666',
          nationalId: '36589852554745',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f22',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId,
          amount: 3000,
          status: 'accepted',
          account: '81828 / 230023590',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Trustly',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '3871577155',
          ok: true,
          message: 'Account Payout',
          complete: true,
          reject: false,
        });
      }));

  it('can fail wrong account withdrawal without trustlyAccountId', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'sv',
          countryId: 'SE',
          firstName: 'Test',
          lastName: 'User',
          city: 'Stockholm',
          address: 'Paskakali 13',
          postCode: '12345',
          dateOfBirth: '1995-01-01',
          mobilePhone: '3586666666666',
          nationalId: '36589852554745',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f22',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 3000,
          status: 'accepted',
          account: 'WrongAccount',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Trustly',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(500)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Withdrawal account format is not recognized: WrongAccount',
          },
        });
      }));

  it('can fail withdrawal if not enough money on casino account', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'DE',
          firstName: 'Test',
          lastName: 'User',
        },
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f44',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 694000,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { trustlyAccountId: '3786320543', trustlyMode: 'standard' },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Trustly',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
          message: 'Not enough money on merchants trustly account to payout to player\'s trustly account.',
          complete: false,
          reject: true,
        });
      }));

  it('can execute register', async () =>
    request(api)
      .post('/api/v1/register')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'de',
          countryId: 'DE',
          firstName: 'Test',
          lastName: 'User',
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
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Trustly',
          paymentProvider: 'Trustly',
          paymentMethod: 'Trustly',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
        });
      }));

  it('can execute bank register', async () =>
    request(api)
      .post('/api/v1/register')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          languageId: 'fi',
          countryId: 'FI',
          firstName: 'Test',
          lastName: 'User',
        },
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        params: { selectedBank: 'op' },
        deposit: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Trustly',
          paymentProvider: 'Trustly',
          paymentMethod: 'Trustly',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
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
          paymentProvider: 'Trustly',
        },
        urls: {
          ok: 'https://127.0.0.1:3003/ok',
          failure: 'https://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
        });
      }));

  it('can execute login', async () =>
    request(api)
      .post('/api/v1/login')
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
        deposit: {
          paymentMethod: 'Trustly',
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f12',
        },
        urls: {
          ok: 'https://127.0.0.1:3003/ok',
          failure: 'https://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          requiresFullscreen: false,
          url: 'https://test.trustly.com/_/orderclient.php?SessionID=f37e0447-46ef-4026-8b81-a91d0e9605ea&OrderID=3060958854&Locale=fi_FI',
        });
      }));
});
