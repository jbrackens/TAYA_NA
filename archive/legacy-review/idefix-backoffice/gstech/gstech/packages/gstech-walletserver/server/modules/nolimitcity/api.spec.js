/* @flow */
const request = require('supertest');  
const client = require('gstech-core/modules/clients/walletserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');

const { getExternalPlayerId } = require('gstech-core/modules/helpers');

const nock = require('nock'); // eslint-disable-line.
const config = require('../../../config');
const app = require('../../api-server');
// nock.recorder.rec();

describe('Nolimit City API', () => {
  let player;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NC',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    nock('https://partner.nolimitcity.com:443', { encodedQueryParams: true })
      .post('/api/v1/json', {
        jsonrpc: '2.0',
        method: 'freebets.add',
        params: {
          identification: { name: 'LUCKYDINO', key: 'ey3Shoh3ie' },
          userId: getExternalPlayerId(player),
          promoName: `abcd1234_${player.id}`,
          game: 'TheCreepyCarnival',
          rounds: '10',
          amount: { amount: '1.00', currency: 'EUR' },
          expires: /.+/i,
        },
        id: 'abcd1234',
      })
      .reply(200, { jsonrpc: '2.0', result: {}, id: 'abcd1234' });
  });

  it('can credit free spins', () =>
    superClient(app, ports.walletServer.apiPort, client)
      .call((api) => api.creditFreeSpins('LD', 'NC', {
        player,
        sessionId: 0,
        bonusCode: 'TheCreepyCarnival:10:100',
        id: 'abcd1234',
        client: {
          ipAddress: '127.0.0.1',
          userAgent: 'UA',
          isMobile: false,
        },
        games: [],
      }))
      .expect(200, (result) => {
        expect(result.ok).to.be.equal(true);
      }));
});
