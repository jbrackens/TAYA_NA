/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('EMP API', () => {
  let player;
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

    let xx = `Amount=19400&Uid=${player.username}&Tid=daf94940-1ef2-11e9-97c9-253a956a0f69&Email=${player.email}&Firstname=Jack&Lastname=Sparrow&ClientIp=10.110.11.11&Address=Fugger%20Strasse%2056&ZipCode=06820&City=Dessau&Country=DEU&Phone=${player.mobilePhone}&BirthDate=1989-02-01&OriginalAmount=19400&OriginalCurrency=EUR&ConvertCurrency=yes&ReturnURL=http%3A%2F%2Flocalhost%3A3006%2Fapi%2Fv1%2Femp%2Fprocess`;
    xx = xx.replace('@', '%40');
    xx = xx.replace(player.mobilePhone, `%2B${player.mobilePhone}`); // TODO: encoding issues

    nock('https://epro.empcorp.com:443', { encodedQueryParams: true })
      .post('/api/payment/direct', xx)
      .reply(200, {
        Code: 0,
        Result: {
          OperationType: 'payment',
          Status: 'pending',
          Tid: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          Reference: '4579-1556009850-0141-510677',
          Date: '2019-04-23 10:57:30',
          Amount: '20.22',
          UserId: 'LD_Jack.Sparrow_3002082',
          Message: 'Waiting 3DSecure or bank validation',
          '3DSecure': 'no',
          OneClick: 'no',
          '3DSecureUrl': 'https://epro.empcorp.com/api/3dsecure/4579-1556009850-0141-510677',
        },
      });
  });

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player,
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
          paymentMethodName: 'VisaVoucher',
          paymentProvider: 'EMP2',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
          url: 'https://epro.empcorp.com/api/3dsecure/4579-1556009850-0141-510677',
        })));
});
