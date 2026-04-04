/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const { handleDepositEvent } = require('./eventListener');
const config = require('../../../config');

describe('Evolution Event Listener', () => {
  let playerId;
  before(async () => request(config.api.backend.url)
    .post('/api/v1/test/init-session')
    .send({
      manufacturer: 'EVO',
      initialBalance: 1000,
    })
    .expect((res) => {
      playerId = getExternalPlayerId(res.body.player);
    })
    .expect(200));

  it('can handle deposit event', async () => {
    const event = {
      transmissionId: 'djEtMDoyMy0xNTg5Mzc5MDczMzk5',
      event: {
        timestamp: new Date('2020-05-13T14:11:13.392Z'),
        correlationId: `DepMa|${playerId}|luckydino0000001|6eb939b8-9717-4a4b-83a0-f5b67da14cc3|2`,
        payload: {
          BalanceChanged: {
            voucherId: '6eb939b8-9717-4a4b-83a0-f5b67da14cc3',
            reason: {
              Deposit: {
                amount: 10,
                gameId: '160e9bd0814b64ee511aa2b0',
                tableId: 'LightningTable01',
                gameType: 'roulette',
                transactionId: '589278154218553853',
              },
            },
          },
        },
      },
    };
    const result = await handleDepositEvent(event);
    expect(result).to.containSubset({
      balance: 2000,
      bonusBalance: 0,
      currencyId: 'EUR',
      realBalance: 2000,
    });
  });
});
