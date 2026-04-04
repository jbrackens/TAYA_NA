/* @flow */
const { v1: uuid } = require('uuid');
const nock = require('nock');  
const request = require('supertest');  

const api = require('gstech-core/modules/clients/backend-payment-api');
const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('Neteller Webhook API (success cases)', () => {
  let sessionId;
  let player;
  let depositTransactionKey;
  let withdrawalTransactionKey;
  const depositId = uuid();
  const withdrawalId = uuid();

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({})
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Neteller_Neteller', amount: 5000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    await request(config.api.backend.url)
      .put(`/api/LD/v1/deposit/${depositTransactionKey}`)
      .send({
        depositParameters: { paymentHandleToken: 'PHqViUfMNK9uUPCQ' },
        message: 'add paymentHandleToken',
        account: 'vladimir@luckydino.com',
      })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/test-withdraw')
      .set({ 'X-Authentication': true, Authorization: `Bearer ${player.username}` })
      .send({
        amount: 2000,
        provider: 'Neteller',
        parameters: {
          paymentHandleToken: 'PHiTTJ7c8BP0T4ig',
        },
      })
      .expect(200)
      .expect((res) => {
        withdrawalTransactionKey = res.body.transactionKey;
      });

    nock('https://test.api.neteller.com:443', { encodedQueryParams: true })
      .post('/v1/oauth2/token')
      .query({ grant_type: 'client_credentials' })
      .reply(200, { accessToken: '0.AQAAAXHfCi8ZAAAAAAAEk-B1OYLldGOMp4CbVhPZiUMK.StqRk09MJ16Z0RDINsLWZuXop1Q', tokenType: 'Bearer', expiresIn: 300 });

    nock('https://test.api.neteller.com:443', { encodedQueryParams: true })
      .get('/v1/customers/verify')
      .query({ firstName: player.firstName, lastName: player.lastName, dateOfBirth: player.dateOfBirth.replace(/-/g, ''), email: player.email, postCode: player.postCode, country: player.countryId })
      .reply(200, { firstName: 'MATCH', lastName: 'MATCH', dateOfBirth: 'NO_MATCH', email: 'MATCH', postCode: 'NO_MATCH', country: 'MATCH', verificationLevel: '11' });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .get('/paymenthub/v1/paymenthandles')
      .query({ merchantRefNum: depositTransactionKey })
      .times(2)
      .reply(200, {
        meta: {
          numberOfRecords: 1, limit: 10, page: 1,
        },
        paymentHandles: [
          {
            id: '0f356165-4c03-43d9-960b-c63afddda2ea',
            merchantRefNum: depositTransactionKey,
            paymentHandleToken: 'PH6axpWIrnoPOVVE',
            status: 'EXPIRED',
            statusReason: 'AUTH_EXPIRED',
            paymentType: 'NETELLER',
            liveMode: false,
            usage: 'SINGLE_USE',
            action: 'NONE',
            executionMode: 'SYNCHRONOUS',
            amount: 147500,
            currencyCode: 'EUR',
            billingDetails: {
              street1: 'fdsfsdf 2-32', zip: '1234', city: 'Tallinn', country: 'EE',
            },
            customerIp: '88.196.254.220',
            timeToLiveSeconds: 0,
            gatewayResponse: { processor: 'NETELLER' },
            transactionType: 'PAYMENT',
            txnTime: '2020-02-25T13:07:00Z',
            updatedTime: '2020-02-25T13:23:16Z',
            statusTime: '2020-02-25T13:23:16Z',
            links: [{ rel: 'self', href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/0f356165-4c03-43d9-960b-c63afddda2ea' }],
            neteller: { consumerId: 'vladimir@luckydino.com' },
          }],
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .get('/paymenthub/v1/paymenthandles')
      .query({ merchantRefNum: withdrawalTransactionKey })
      .times(2)
      .reply(200, {
        meta: {
          numberOfRecords: 1, limit: 10, page: 1,
        },
        paymentHandles: [
          {
            id: '0f356165-4c03-43d9-960b-c63afddda2ea',
            merchantRefNum: withdrawalTransactionKey,
            paymentHandleToken: 'PH6axpWIrnoPOVVE',
            status: 'EXPIRED',
            statusReason: 'AUTH_EXPIRED',
            paymentType: 'NETELLER',
            liveMode: false,
            usage: 'SINGLE_USE',
            action: 'NONE',
            executionMode: 'SYNCHRONOUS',
            amount: 147500,
            currencyCode: 'EUR',
            billingDetails: {
              street1: 'fdsfsdf 2-32', zip: '1234', city: 'Tallinn', country: 'EE',
            },
            customerIp: '88.196.254.220',
            timeToLiveSeconds: 0,
            gatewayResponse: { processor: 'NETELLER' },
            transactionType: 'STANDALONE_CREDIT',
            txnTime: '2020-02-25T13:07:00Z',
            updatedTime: '2020-02-25T13:23:16Z',
            statusTime: '2020-02-25T13:23:16Z',
            links: [{ rel: 'self', href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/0f356165-4c03-43d9-960b-c63afddda2ea' }],
            neteller: { consumerId: 'vladimir@luckydino.com' },
          }],
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .post('/paymenthub/v1/payments', { merchantRefNum: depositTransactionKey, amount: 5000, currencyCode: 'EUR', dupCheck: true, settleWithAuth: true, paymentHandleToken: 'PHqViUfMNK9uUPCQ' })
      .reply(200, {
        id: depositId,
        paymentType: 'NETELLER',
        paymentHandleToken: 'PHiTTJ7c8BP0T4ig',
        merchantRefNum: depositTransactionKey,
        currencyCode: 'EUR',
        settleWithAuth: true,
        txnTime: '2020-02-25T11:13:29.000+0000',
        billingDetails: {
          street1: 'fdsfsdf 2-32',
          city: 'Tallinn',
          zip: '1234',
          country: 'EE',
        },
        status: 'COMPLETED',
        gatewayReconciliationId: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
        amount: 5000,
        consumerIp: '88.196.254.220',
        liveMode: false,
        updatedTime: '2020-02-25T11:14:12Z',
        statusTime: '2020-02-25T11:14:12Z',
        gatewayResponse: {
          orderId: 'ORD_51d42454-0f85-4d37-afb3-076d917817b6',
          totalAmount: '5000',
          currency: 'EUR',
          lang: 'en_US',
          customerId: 'CUS_BCA6CED6-7376-4B0A-A810-5182F467FAFF',
          verificationLevel: '10',
          transactionId: '207627519168613',
          transactionType: 'Member to Merchant Transfer (Order)',
          description: 'vladimir@luckydino.com to Neteller Simulator Test',
          status: 'paid',
          processor: 'NETELLER',
        },
        availableToSettle: 0,
        neteller: {
          consumerId: 'vladimir@luckydino.com',
        },
        settlements: {
          amount: 5000,
          txnTime: '2020-02-25T11:13:29.000+0000',
          merchantRefNum: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
          id: '404d961a-21d6-4f37-9808-bf59b756128e',
          status: 'COMPLETED',
        },
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .post('/paymenthub/v1/standalonecredits', { merchantRefNum: withdrawalTransactionKey, amount: 2000, currencyCode: 'EUR', paymentHandleToken: 'PHiTTJ7c8BP0T4ig' })
      .reply(200, {
        id: withdrawalId,
        paymentType: 'NETELLER',
        paymentHandleToken: 'PHiTTJ7c8BP0T4ig',
        merchantRefNum: withdrawalTransactionKey,
        currencyCode: 'EUR',
        settleWithAuth: true,
        txnTime: '2020-02-25T11:13:29.000+0000',
        billingDetails: {
          street1: 'fdsfsdf 2-32',
          city: 'Tallinn',
          zip: '1234',
          country: 'EE',
        },
        status: 'COMPLETED',
        gatewayReconciliationId: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
        amount: 5000,
        consumerIp: '88.196.254.220',
        liveMode: false,
        updatedTime: '2020-02-25T11:14:12Z',
        statusTime: '2020-02-25T11:14:12Z',
        gatewayResponse: {
          orderId: 'ORD_51d42454-0f85-4d37-afb3-076d917817b6',
          totalAmount: '5000',
          currency: 'EUR',
          lang: 'en_US',
          customerId: 'CUS_BCA6CED6-7376-4B0A-A810-5182F467FAFF',
          verificationLevel: '10',
          transactionId: '207627519168613',
          transactionType: 'Member to Merchant Transfer (Order)',
          description: 'vladimir@luckydino.com to Neteller Simulator Test',
          status: 'paid',
          processor: 'NETELLER',
        },
        availableToSettle: 0,
        neteller: {
          consumerId: 'vladimir@luckydino.com',
        },
        settlements: {
          amount: 5000,
          txnTime: '2020-02-25T11:13:29.000+0000',
          merchantRefNum: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
          id: '404d961a-21d6-4f37-9808-bf59b756128e',
          status: 'COMPLETED',
        },
      });
  });

  it('can handle payment payable', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: depositId,
          merchantRefNum: depositTransactionKey,
          amount: 5000,
          currencyCode: 'EUR',
          status: 'PAYABLE',
          paymentType: 'NETELLER',
          txnTime: '2020-02-21T11:34:55Z',
        },
        eventType: 'PAYMENT_HANDLE_PAYABLE',
        attemptNumber: '1',
        resourceId: '59b4339e-e191-42b6-b0b2-392201b55df5',
        eventDate: '2020-02-21T11:34:55Z',
        links: [
          {
            href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/59b4339e-e191-42b6-b0b2-392201b55df5',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_PAYABLE',
      })
      .expect(200);
  });

  it('can handle payment complete', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: depositId,
          merchantRefNum: depositTransactionKey,
          amount: 5000,
          currencyCode: 'EUR',
          status: 'COMPLETED',
          paymentType: 'NETELLER',
          txnTime: '2020-04-02T00:34:09Z',
        },
        eventType: 'PAYMENT_HANDLE_COMPLETED',
        attemptNumber: '1',
        resourceId: '4f527628-a666-4058-9c4c-e206b0189131',
        eventDate: '2020-04-02T00:34:09Z',
        links: [
          {
            href: 'https://api.paysafe.com/alternatepayments/v1/accounts/14304_NOK/paymenthandles/4f527628-a666-4058-9c4c-e206b0189131',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_COMPLETED',
      })
      .expect(200);

    const { balance } = await api.getDepositAlt(depositTransactionKey);
    expect(balance.balance).to.equal(5000);
  });

  it('can handle withdrawal payable', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: withdrawalId,
          merchantRefNum: withdrawalTransactionKey,
          amount: 2000,
          currencyCode: 'EUR',
          status: 'PAYABLE',
          paymentType: 'NETELLER',
          txnTime: '2020-02-21T11:34:55Z',
        },
        eventType: 'PAYMENT_HANDLE_PAYABLE',
        attemptNumber: '1',
        resourceId: '59b4339e-e191-42b6-b0b2-392201b55df5',
        eventDate: '2020-02-21T11:34:55Z',
        links: [
          {
            href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/59b4339e-e191-42b6-b0b2-392201b55df5',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_PAYABLE',
      })
      .expect(200);
  });

  it('can handle withdrawal complete', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: withdrawalId,
          merchantRefNum: withdrawalTransactionKey,
          amount: 2000,
          currencyCode: 'EUR',
          status: 'PAYABLE',
          paymentType: 'NETELLER',
          txnTime: '2020-02-21T11:34:55Z',
        },
        eventType: 'PAYMENT_HANDLE_COMPLETED',
        attemptNumber: '1',
        resourceId: '59b4339e-e191-42b6-b0b2-392201b55df5',
        eventDate: '2020-02-21T11:34:55Z',
        links: [
          {
            href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/59b4339e-e191-42b6-b0b2-392201b55df5',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_COMPLETED',
      })
      .expect(200);
  });
});

describe('Neteller Webhook API (fail cases)', () => {
  let sessionId;
  let player;
  let depositTransactionKey;
  let withdrawalTransactionKey;
  const depositId = uuid();
  const withdrawalId = uuid();

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({})
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Neteller_Neteller', amount: 5000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    await request(config.api.backend.url)
      .put(`/api/LD/v1/deposit/${depositTransactionKey}`)
      .send({
        depositParameters: { paymentHandleToken: 'PHqViUfMNK9uUPCQ' },
        message: 'add paymentHandleToken',
        account: 'vladimir@luckydino.com',
      })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/test-withdraw')
      .set({ 'X-Authentication': true, Authorization: `Bearer ${player.username}` })
      .send({
        amount: 2000,
        provider: 'Neteller',
        parameters: {
          paymentHandleToken: 'PHiTTJ7c8BP0T4ig',
        },
      })
      .expect(200)
      .expect((res) => {
        withdrawalTransactionKey = res.body.transactionKey;
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .get('/paymenthub/v1/paymenthandles')
      .query({ merchantRefNum: depositTransactionKey })
      .times(2)
      .reply(200, {
        meta: {
          numberOfRecords: 1, limit: 10, page: 1,
        },
        paymentHandles: [
          {
            id: '0f356165-4c03-43d9-960b-c63afddda2ea',
            merchantRefNum: depositTransactionKey,
            paymentHandleToken: 'PH6axpWIrnoPOVVE',
            status: 'EXPIRED',
            statusReason: 'AUTH_EXPIRED',
            paymentType: 'NETELLER',
            liveMode: false,
            usage: 'SINGLE_USE',
            action: 'NONE',
            executionMode: 'SYNCHRONOUS',
            amount: 147500,
            currencyCode: 'EUR',
            billingDetails: {
              street1: 'fdsfsdf 2-32', zip: '1234', city: 'Tallinn', country: 'EE',
            },
            customerIp: '88.196.254.220',
            timeToLiveSeconds: 0,
            gatewayResponse: { processor: 'NETELLER' },
            transactionType: 'PAYMENT',
            txnTime: '2020-02-25T13:07:00Z',
            updatedTime: '2020-02-25T13:23:16Z',
            statusTime: '2020-02-25T13:23:16Z',
            links: [{ rel: 'self', href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/0f356165-4c03-43d9-960b-c63afddda2ea' }],
            neteller: { consumerId: 'vladimir@luckydino.com' },
          }],
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .get('/paymenthub/v1/paymenthandles')
      .query({ merchantRefNum: withdrawalTransactionKey })
      .times(2)
      .reply(200, {
        meta: {
          numberOfRecords: 1, limit: 10, page: 1,
        },
        paymentHandles: [
          {
            id: '0f356165-4c03-43d9-960b-c63afddda2ea',
            merchantRefNum: withdrawalTransactionKey,
            paymentHandleToken: 'PH6axpWIrnoPOVVE',
            status: 'EXPIRED',
            statusReason: 'AUTH_EXPIRED',
            paymentType: 'NETELLER',
            liveMode: false,
            usage: 'SINGLE_USE',
            action: 'NONE',
            executionMode: 'SYNCHRONOUS',
            amount: 147500,
            currencyCode: 'EUR',
            billingDetails: {
              street1: 'fdsfsdf 2-32', zip: '1234', city: 'Tallinn', country: 'EE',
            },
            customerIp: '88.196.254.220',
            timeToLiveSeconds: 0,
            gatewayResponse: { processor: 'NETELLER' },
            transactionType: 'STANDALONE_CREDIT',
            txnTime: '2020-02-25T13:07:00Z',
            updatedTime: '2020-02-25T13:23:16Z',
            statusTime: '2020-02-25T13:23:16Z',
            links: [{ rel: 'self', href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/0f356165-4c03-43d9-960b-c63afddda2ea' }],
            neteller: { consumerId: 'vladimir@luckydino.com' },
          }],
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .post('/paymenthub/v1/payments', { merchantRefNum: depositTransactionKey, amount: 5000, currencyCode: 'EUR', dupCheck: true, settleWithAuth: true, paymentHandleToken: 'PHqViUfMNK9uUPCQ' })
      .reply(200, {
        id: depositId,
        paymentType: 'NETELLER',
        paymentHandleToken: 'PHiTTJ7c8BP0T4ig',
        merchantRefNum: depositTransactionKey,
        currencyCode: 'EUR',
        settleWithAuth: true,
        txnTime: '2020-02-25T11:13:29.000+0000',
        billingDetails: {
          street1: 'fdsfsdf 2-32',
          city: 'Tallinn',
          zip: '1234',
          country: 'EE',
        },
        status: 'COMPLETED',
        gatewayReconciliationId: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
        amount: 5000,
        consumerIp: '88.196.254.220',
        liveMode: false,
        updatedTime: '2020-02-25T11:14:12Z',
        statusTime: '2020-02-25T11:14:12Z',
        gatewayResponse: {
          orderId: 'ORD_51d42454-0f85-4d37-afb3-076d917817b6',
          totalAmount: '5000',
          currency: 'EUR',
          lang: 'en_US',
          customerId: 'CUS_BCA6CED6-7376-4B0A-A810-5182F467FAFF',
          verificationLevel: '10',
          transactionId: '207627519168613',
          transactionType: 'Member to Merchant Transfer (Order)',
          description: 'vladimir@luckydino.com to Neteller Simulator Test',
          status: 'paid',
          processor: 'NETELLER',
        },
        availableToSettle: 0,
        neteller: {
          consumerId: 'vladimir@luckydino.com',
        },
        settlements: {
          amount: 5000,
          txnTime: '2020-02-25T11:13:29.000+0000',
          merchantRefNum: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
          id: '404d961a-21d6-4f37-9808-bf59b756128e',
          status: 'COMPLETED',
        },
      });

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .post('/paymenthub/v1/standalonecredits', { merchantRefNum: withdrawalTransactionKey, amount: 2000, currencyCode: 'EUR', paymentHandleToken: 'PHiTTJ7c8BP0T4ig' })
      .reply(200, {
        id: withdrawalId,
        paymentType: 'NETELLER',
        paymentHandleToken: 'PHiTTJ7c8BP0T4ig',
        merchantRefNum: withdrawalTransactionKey,
        currencyCode: 'EUR',
        settleWithAuth: true,
        txnTime: '2020-02-25T11:13:29.000+0000',
        billingDetails: {
          street1: 'fdsfsdf 2-32',
          city: 'Tallinn',
          zip: '1234',
          country: 'EE',
        },
        status: 'COMPLETED',
        gatewayReconciliationId: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
        amount: 5000,
        consumerIp: '88.196.254.220',
        liveMode: false,
        updatedTime: '2020-02-25T11:14:12Z',
        statusTime: '2020-02-25T11:14:12Z',
        gatewayResponse: {
          orderId: 'ORD_51d42454-0f85-4d37-afb3-076d917817b6',
          totalAmount: '5000',
          currency: 'EUR',
          lang: 'en_US',
          customerId: 'CUS_BCA6CED6-7376-4B0A-A810-5182F467FAFF',
          verificationLevel: '10',
          transactionId: '207627519168613',
          transactionType: 'Member to Merchant Transfer (Order)',
          description: 'vladimir@luckydino.com to Neteller Simulator Test',
          status: 'paid',
          processor: 'NETELLER',
        },
        availableToSettle: 0,
        neteller: {
          consumerId: 'vladimir@luckydino.com',
        },
        settlements: {
          amount: 5000,
          txnTime: '2020-02-25T11:13:29.000+0000',
          merchantRefNum: 'd9e73600-57bf-11ea-81c9-3fdd3fdece2d',
          id: '404d961a-21d6-4f37-9808-bf59b756128e',
          status: 'COMPLETED',
        },
      });
  });

  it('can handle payment payable', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: depositId,
          merchantRefNum: depositTransactionKey,
          amount: 5000,
          currencyCode: 'EUR',
          status: 'PAYABLE',
          paymentType: 'NETELLER',
          txnTime: '2020-02-21T11:34:55Z',
        },
        eventType: 'PAYMENT_HANDLE_PAYABLE',
        attemptNumber: '1',
        resourceId: '59b4339e-e191-42b6-b0b2-392201b55df5',
        eventDate: '2020-02-21T11:34:55Z',
        links: [
          {
            href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/59b4339e-e191-42b6-b0b2-392201b55df5',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_PAYABLE',
      })
      .expect(200);
  });

  it('can handle payment expired', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: depositId,
          merchantRefNum: depositTransactionKey,
          amount: 5000,
          currencyCode: 'EUR',
          status: 'EXPIRED',
          paymentType: 'NETELLER',
          txnTime: '2020-04-02T00:34:09Z',
        },
        eventType: 'PAYMENT_HANDLE_EXPIRED',
        attemptNumber: '1',
        resourceId: '4f527628-a666-4058-9c4c-e206b0189131',
        eventDate: '2020-04-02T00:34:09Z',
        links: [
          {
            href: 'https://api.paysafe.com/alternatepayments/v1/accounts/14304_NOK/paymenthandles/4f527628-a666-4058-9c4c-e206b0189131',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_EXPIRED',
      })
      .expect(200);

    const { balance } = await api.getDepositAlt(depositTransactionKey);
    expect(balance.balance).to.equal(0);
  });

  it('can handle withdrawal payable', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: withdrawalId,
          merchantRefNum: withdrawalTransactionKey,
          amount: 2000,
          currencyCode: 'EUR',
          status: 'PAYABLE',
          paymentType: 'NETELLER',
          txnTime: '2020-02-21T11:34:55Z',
        },
        eventType: 'PAYMENT_HANDLE_PAYABLE',
        attemptNumber: '1',
        resourceId: '59b4339e-e191-42b6-b0b2-392201b55df5',
        eventDate: '2020-02-21T11:34:55Z',
        links: [
          {
            href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/59b4339e-e191-42b6-b0b2-392201b55df5',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_PAYABLE',
      })
      .expect(200);
  });

  it('can handle withdrawal expired', async () => {
    await request(app)
      .post('/api/v1/neteller')
      .send({
        payload: {
          accountId: '75904_EUR',
          id: withdrawalId,
          merchantRefNum: withdrawalTransactionKey,
          amount: 2000,
          currencyCode: 'EUR',
          status: 'EXPIRED',
          paymentType: 'NETELLER',
          txnTime: '2020-02-21T11:34:55Z',
        },
        eventType: 'PAYMENT_HANDLE_EXPIRED',
        attemptNumber: '1',
        resourceId: '59b4339e-e191-42b6-b0b2-392201b55df5',
        eventDate: '2020-02-21T11:34:55Z',
        links: [
          {
            href: 'https://api.test.paysafe.com/alternatepayments/v1/accounts/75904_EUR/paymenthandles/59b4339e-e191-42b6-b0b2-392201b55df5',
            rel: 'payment_handle',
          },
        ],
        mode: 'live',
        eventName: 'PAYMENT_HANDLE_EXPIRED',
      })
      .expect(200);
  });
});
