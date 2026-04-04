/* @flow */
const request = require('supertest');  
const { encrypt } = require('gstech-core/modules/crypt');
const logger = require('gstech-core/modules/logger');
const { encryptionKey } = require('./constants');
const config = require('../../../config');

describe('Williams WalletServer', () => {
  let playerId;
  let sessionId;
  before(async () => request(config.api.backend.url)
    .post('/api/v1/test/init-session')
    .send({
      manufacturer: 'SGI',
      initialBalance: 100000,
    })
    .expect((res) => {
      sessionId = res.body.sessionId;
      playerId = res.body.playerId;
      logger.debug(`
baseUrl=http://127.0.0.1:3003/WilliamsInteractive/
method.player.authenticate=player/authenticate
method.player.getBalance=player/getBalance
method.transaction.transferToGame=transaction/transferToGame
method.transaction.transferFromGame=transaction/transferFromGame
method.transaction.cancelTransferToGame=transaction/cancelTransferToGame
accountRef=LD_${playerId}
ticket=${encrypt(`${encryptionKey}LD_${playerId}`, sessionId)}
campaignRef=campaignRef
context=DESKTOP
gameCode=zeus3
currencySuccess=EUR
currencyFail=PLN`);
    })
    .expect(200));

  it('has some initial balance', () => {
  });
});
