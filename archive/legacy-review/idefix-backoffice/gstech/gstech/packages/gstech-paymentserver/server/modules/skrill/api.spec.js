/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const api = require('../../api-server');

// nock.recorder.rec();
describe('Skrill API', () => {
  nock('https://www.skrill.com:443', { encodedQueryParams: true })
    .post('/app/pay.pl', 'action=prepare&email=janne%40luckydino.com&password=b185cc915f8a53ac2dbc3f2d6d1f570b&currency=EUR&amount=194.00&mb_transaction_id=eca2d5b4-2a56-44be-b392-3e6b7d30a1f2&subject=101086349&note=You%20have%20just%20received%20money%20from%20LuckyDino&frn_trn_id=LuckyDino%20101086349')
    .reply(200, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><sid>d831e9072e8b89c57a3654ddf5fcb907</sid></response>',
      ['Content-Type', 'text/xml;charset=ISO-8859-1']);

  nock('https://www.skrill.com:443', { encodedQueryParams: true })
    .post('/app/pay.pl', 'action=prepare&email=janne%40luckydino.com&password=b185cc915f8a53ac2dbc3f2d6d1f570b&currency=EUR&amount=194.00&bnf_email=skrill_test1%40devcode.se&subject=101086349&note=You%20have%20just%20received%20money%20from%20LuckyDino&frn_trn_id=LuckyDino%20101086349')
    .reply(200, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><sid>d831e9072e8b89c57a3654ddf5fcb907</sid></response>',
      ['Content-Type', 'text/xml;charset=ISO-8859-1']);

  nock('https://www.skrill.com:443', { encodedQueryParams: true })
    .post('/app/pay.pl', 'action=transfer&sid=d831e9072e8b89c57a3654ddf5fcb907')
    .times(2)
    .reply(200, '<?xml version="1.0" encoding="UTF-8"?><response><transaction><amount>194.00</amount><currency>EUR</currency><id>497029</id><status>2</status><status_msg>processed</status_msg></transaction></response>',
      ['Content-Type', 'text/xml;charset=ISO-8859-1']);

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
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
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'Skrill',
          paymentProvider: 'Skrill',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
        });
        expect(res.body.html).to.contain('WLT');
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
          account: 'skrill_test1@devcode.se',
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'Skrill',
          paymentProvider: 'Skrill',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '497029',
          ok: true,
          message: 'OK',
        });
      }));

  it('can execute rapid transfer deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
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
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'RapidTransfer',
          paymentProvider: 'Skrill',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
        });
        expect(res.body.html).to.contain('OBT');
      }));

  it('can execute rapid transfer withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'foo@bar.com',
          currencyId: 'EUR',
          brandId: 'LD',
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
          account: 'skrill_test1@devcode.se',
          paymentParameters: {},
          accountParameters: { mb_transaction_id: 'eca2d5b4-2a56-44be-b392-3e6b7d30a1f2' },
          paymentMethodName: 'RapidTransfer',
          paymentProvider: 'Skrill',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          id: '497029',
          ok: true,
          message: 'OK',
        });
      }));

  it('can execute sofort deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
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
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'Sofort',
          paymentProvider: 'Skrill',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
        });
        expect(res.body.html).to.contain('SFT');
      }));
});
