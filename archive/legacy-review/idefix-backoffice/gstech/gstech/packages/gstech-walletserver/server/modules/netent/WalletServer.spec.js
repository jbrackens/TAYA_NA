/* @flow */
const request = require('supertest');  
const moment = require('moment-timezone');
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.netent;

const conf = configuration[0];
const confSE = configuration[1];

describe.skip('NetEnt WalletServer', () => {
  describe('Not enough balance', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 10,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('returns an error when no enough money for bet', async () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>1.5</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10317</transactionRef>
                <gameRoundRef>8318</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns3:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<detail><n:withdrawFault><errorCode>1</errorCode><balance>0.10</balance></n:withdrawFault></detail>'))
        .expect(200));
  });

  describe('Player limit set', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 10000,
        betLimit: 2000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('returns an error when trying to bet with negative amount', async () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>-15</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10317</transactionRef>
                <gameRoundRef>8318</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns3:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect((res) => {
          expect(res.text).to.have.string('<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/">\n      <soap:Body>\n        <soap:Fault>\n          <faultcode>soap:Server</faultcode>\n          <faultstring>4</faultstring>\n          <detail><n:withdrawFault><errorCode>4</errorCode></n:withdrawFault></detail>\n        </soap:Fault>\n      </soap:Body>\n    </soap:Envelope>');
        })
        .expect(200));

    it('allows bet before limit is hit', async () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>15</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10317</transactionRef>
                <gameRoundRef>8318</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns3:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect((res) => {
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>85.00</balance><transactionId>');
        })
        .expect(200));

    it('returns an error when limit has been exceeded', async () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>15</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10318</transactionRef>
                <gameRoundRef>8319</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns3:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect((res) => {
          expect(res.text).to.have.string('<detail><n:withdrawFault><errorCode>6</errorCode></n:withdrawFault></detail>');
        })
        .expect(200));
  });

  describe('Completes startburst game play from integration document', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('Returns balance for player', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:getBalance xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
              <callerId>${conf.callerId}</callerId>
              <callerPassword>${conf.callerPassword}</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <currency>EUR</currency>
              <gameId>starburst_not_mobile_sw</gameId>
              <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:getBalance>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:getBalanceResponse><balance>10.00</balance></n:getBalanceResponse></s:Body></s:Envelope>'))
        .expect(200));

    it('Returns an error with invalid authentication', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:getBalance xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
              <callerId>foo</callerId>
              <callerPassword>bar</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <currency>EUR</currency>
              <gameId>starburst_not_mobile_sw</gameId>
              <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:getBalance>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:getBalanceFault><errorCode>5</errorCode><message>Authentication failed</message></n:getBalanceFault></s:Body></s:Envelope>'))
        .expect(200));

    it('Places a bet', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:withdraw xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
            <callerId>${conf.callerId}</callerId>
            <callerPassword>${conf.callerPassword}</callerPassword>
            <playerName>LD_${playerId}</playerName>
            <amount>1.5</amount>
            <bonusBet>0</bonusBet>
            <currency>EUR</currency>
            <transactionRef>10295</transactionRef>
            <gameRoundRef>8309</gameRoundRef>
            <gameId>starburst_not_mobile_sw</gameId>
            <reason>GAME_PLAY</reason>
            <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:withdraw>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>8.50</balance><transactionId>'))
        .expect(200));
    it('credits win on players balance', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:deposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>3</amount>
                <bigWin>true</bigWin>
                <jackpotAmount></jackpotAmount>
                <bonusWin>0</bonusWin>
                <currency>EUR</currency>
                <transactionRef>10316</transactionRef>
                <gameRoundRef>8309</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <ns2:sessionId>${sessionId}</ns2:sessionId>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms>
                  <bonus><bonusprogramid></bonusprogramid><depositionid></depositionid></bonus>
                </bonusprograms>
                <source></source>
                <startDate>${moment().format('YYYY-MM-DD hh:MM:ss.000')}</startDate>
              </ns3:deposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:depositResponse><balance>11.50</balance><transactionId>'))
        .expect(200));

    it('withdraws money and closes the round straight away', async () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>1.5</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10317</transactionRef>
                <gameRoundRef>8318</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns3:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>10.00</balance><transactionId>'))
        .expect(200));
  });


  describe('Completes backjack game play from integration document', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 11000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('Places first bet', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>10</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10321</transactionRef>
                <gameRoundRef>8321</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY</reason>
                <sessionId>${sessionId}</sessionId>
              </ns2:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>100.00</balance><transactionId>'))
        .expect(200));

    it('Places second bet on same round', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>10</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10322</transactionRef>
                <gameRoundRef>8321</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY</reason>
                <sessionId>${sessionId}</sessionId>
              </ns2:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>90.00</balance><transactionId>'))
        .expect(200));


    it('credits win and closes the round', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:deposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>40</amount>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <currency>EUR</currency>
                <transactionRef>10323</transactionRef>
                <gameRoundRef>8321</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus><bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <source></source>
                <startDate>${moment().format('YYYY-MM-DD hh:MM:ss.000')}</startDate>
              </ns2:deposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:depositResponse><balance>130.00</balance><transactionId>'))
        .expect(200));
  });

  describe('Completes startburst game play from integration document', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ manufacturer: 'NE', initialBalance: 6000 })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('Places initial bet', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdraw>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>10</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10325</transactionRef>
                <gameRoundRef>8322</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY</reason>
                <sessionId>${sessionId}</sessionId>
              </ns2:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>50.00</balance><transactionId>'))
        .expect(200));

    it('Clears hanged game state and credits money back to account', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
          <S:Body>
            <ns2:deposit>
              <callerId>${conf.callerId}</callerId>
              <callerPassword>${conf.callerPassword}</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <amount>10</amount>
              <jackpotAmount></jackpotAmount>
              <bonusWin></bonusWin>
              <currency>EUR</currency>
              <transactionRef>10328</transactionRef>
              <gameRoundRef>8322</gameRoundRef>
              <gameId>starburst_not_mobile_sw</gameId>
              <reason>CLEAR_HANGED_GAME_STATE</reason>
              <sessionId>${sessionId}</sessionId>
              <tournamentOccurrenceId></tournamentOccurrenceId> <bonusprograms><bonus> <bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
              <source>Manually cleared game</source>
              <startDate>${moment().format('YYYY-MM-DD hh:MM:ss.000')}</startDate>
            </ns2:deposit>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:depositResponse><balance>60.00</balance><transactionId>'))
        .expect(200));
  });

  describe('Completes bet and win in single request', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ manufacturer: 'NE', initialBalance: 6000 })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('Places bet and win in one transaction', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdrawAndDeposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <withdraw>10</withdraw>
                <deposit>1000</deposit>
                <bonusBet>0</bonusBet>
                <bigWin>true</bigWin>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <bonusBet></bonusBet>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus> <bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <currency>EUR</currency>
                <transactionRef>10326</transactionRef>
                <gameRoundRef>8323</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns2:withdrawAndDeposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawAndDepositResponse><newBalance>1050.00</newBalance><transactionId>'))
        .expect(200));

    it('Balance is up to date after bet+win', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:getBalance xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
              <callerId>${conf.callerId}</callerId>
              <callerPassword>${conf.callerPassword}</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <currency>EUR</currency>
              <gameId>starburst_not_mobile_sw</gameId>
              <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:getBalance>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:getBalanceResponse><balance>1050.00</balance></n:getBalanceResponse></s:Body></s:Envelope>'))
        .expect(200));

    it('Cancels transaction and credits money back to account', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:rollbackTransaction>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <transactionRef>10326</transactionRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <sessionId>${sessionId}</sessionId>
              </ns2:rollbackTransaction>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:rollbackTransactionResponse></n:rollbackTransactionResponse></s:Body></s:Envelope>'))
        .expect(200));

    it('Balance is up to date after cancelling a transaction', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:getBalance xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
              <callerId>${conf.callerId}</callerId>
              <callerPassword>${conf.callerPassword}</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <currency>EUR</currency>
              <gameId>starburst_not_mobile_sw</gameId>
              <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:getBalance>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:getBalanceResponse><balance>60.00</balance></n:getBalanceResponse></s:Body></s:Envelope>'))
        .expect(200));


    it('Cancelling transaction again is a NOP', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:rollbackTransaction>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <transactionRef>10326</transactionRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <sessionId>${sessionId}</sessionId>
              </ns2:rollbackTransaction>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:rollbackTransactionResponse></n:rollbackTransactionResponse></s:Body></s:Envelope>'))
        .expect(200));

    it('Balance is up to date after cancelling a transaction twice', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:getBalance xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
              <callerId>${conf.callerId}</callerId>
              <callerPassword>${conf.callerPassword}</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <currency>EUR</currency>
              <gameId>starburst_not_mobile_sw</gameId>
              <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:getBalance>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:getBalanceResponse><balance>60.00</balance></n:getBalanceResponse></s:Body></s:Envelope>'))
        .expect(200));

    it('returns an error when trying to request with incorrect currency', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
          <S:Body>
            <ns3:getBalance xmlns:ns3="http://types.walletserver.casinomodule.com/2_0/" xmlns:ns2="walletserver:ext_2_1">
              <callerId>${conf.callerId}</callerId>
              <callerPassword>${conf.callerPassword}</callerPassword>
              <playerName>LD_${playerId}</playerName>
              <currency>SEK</currency>
              <gameId>starburst_not_mobile_sw</gameId>
              <ns2:sessionId>${sessionId}</ns2:sessionId>
            </ns3:getBalance>
          </S:Body>
        </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.equal('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:getBalanceFault><errorCode>2</errorCode><message></message></n:getBalanceFault></s:Body></s:Envelope>'))
        .expect(200));
  });

  describe('Free spin winnings are credited to account', () => {
    let playerId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ manufacturer: 'NE', initialBalance: 6000 })
      .expect((res) => {
        playerId = res.body.playerId;
      })
      .expect(200));

    it('returns an error when trying to bet with negative value', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdrawAndDeposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <withdraw>-10</withdraw>
                <deposit>1000</deposit>
                <bonusBet>0</bonusBet>
                <bigWin>true</bigWin>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <bonusBet></bonusBet>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus> <bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <currency>EUR</currency>
                <transactionRef>10326</transactionRef>
                <gameRoundRef>8323</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_ROUND_FINAL</reason>
                <sessionId></sessionId>
              </ns2:withdrawAndDeposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).xml.to.deep.equal('<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/">\n      <soap:Body>\n        <soap:Fault>\n          <faultcode>soap:Server</faultcode>\n          <faultstring>4</faultstring>\n          <detail><n:withdrawAndDepositFault><errorCode>4</errorCode></n:withdrawAndDepositFault></detail>\n        </soap:Fault>\n      </soap:Body>\n    </soap:Envelope>'))
        .expect(200));

    it('returns an error when trying to bet with invalid currency', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdrawAndDeposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <withdraw>10</withdraw>
                <deposit>1000</deposit>
                <bonusBet>0</bonusBet>
                <bigWin>true</bigWin>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <bonusBet></bonusBet>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus> <bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <currency>SEK</currency>
                <transactionRef>10326</transactionRef>
                <gameRoundRef>8323</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_ROUND_FINAL</reason>
                <sessionId></sessionId>
              </ns2:withdrawAndDeposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).xml.to.deep.equal('<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/">\n      <soap:Body>\n        <soap:Fault>\n          <faultcode>soap:Server</faultcode>\n          <faultstring>2</faultstring>\n          <detail><n:withdrawAndDepositFault><errorCode>2</errorCode></n:withdrawAndDepositFault></detail>\n        </soap:Fault>\n      </soap:Body>\n    </soap:Envelope>'))
        .expect(200));

    it('Places bet and win in one transaction', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdrawAndDeposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <withdraw>10</withdraw>
                <deposit>1000</deposit>
                <bonusBet>0</bonusBet>
                <bigWin>true</bigWin>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <bonusBet></bonusBet>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus> <bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <currency>EUR</currency>
                <transactionRef>10326</transactionRef>
                <gameRoundRef>8323</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_ROUND_FINAL</reason>
                <sessionId></sessionId>
              </ns2:withdrawAndDeposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawAndDepositResponse><newBalance>1050.00</newBalance><transactionId>'))
        .expect(200));
  });

  describe('Jackpot winnings are credited to account', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ manufacturer: 'NE', initialBalance: 6000 })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('Places bet and credits normal win + jackpot in one transaction', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:withdrawAndDeposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <withdraw>10</withdraw>
                <deposit>141000</deposit>
                <bonusBet>0</bonusBet>
                <bigWin>true</bigWin>
                <jackpotAmount>140000</jackpotAmount>
                <bonusWin></bonusWin>
                <bonusBet></bonusBet>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus> <bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <currency>EUR</currency>
                <transactionRef>10326</transactionRef>
                <gameRoundRef>8323</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_ROUND_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns2:withdrawAndDeposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawAndDepositResponse><newBalance>141050.00</newBalance><transactionId>'))
        .expect(200));
  });

  describe('Freespins winnings are credited to account', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ manufacturer: 'NE', initialBalance: 0 })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('Credits free spins winnings', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:deposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>40</amount>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <currency>EUR</currency>
                <transactionRef>10323</transactionRef>
                <gameRoundRef>8321</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>WAGERED_BONUS</reason>
                <sessionId>${sessionId}</sessionId>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus><bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <source></source>
                <startDate>${moment().format('YYYY-MM-DD hh:MM:ss.000')}</startDate>
              </ns2:deposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:depositResponse><balance>40.00</balance><transactionId>'))
        .expect(200));
  });

  describe('when round does not exist', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ manufacturer: 'NE', initialBalance: 0 })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('credits winnings to the round', () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns2:deposit>
                <callerId>${conf.callerId}</callerId>
                <callerPassword>${conf.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>40</amount>
                <jackpotAmount></jackpotAmount>
                <bonusWin></bonusWin>
                <currency>EUR</currency>
                <transactionRef>10323</transactionRef>
                <gameRoundRef>${Date.now()}</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
                <tournamentOccurrenceId></tournamentOccurrenceId>
                <bonusprograms><bonus><bonusprogramid></bonusprogramid> <depositionid></depositionid></bonus></bonusprograms>
                <source></source>
                <startDate>${moment().format('YYYY-MM-DD hh:MM:ss.000')}</startDate>
              </ns2:deposit>
            </S:Body>
          </S:Envelope>`)
        .expect(res =>
          expect(res.text).to.have.string('<n:depositResponse><balance>40.00</balance><transactionId>'))
        .expect(200));
  });
});

describe.skip('NetEnt WalletServer SE', () => {
  describe('Not enough balance', () => {
    let playerId;
    let sessionId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NES',
        initialBalance: 10000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = res.body.playerId;
      })
      .expect(200));

    it('allows bet', async () =>
      request(app)
        .post('/api/v1/netent/NetEntService.svc')
        .set('Content-Type', 'application/xml')
        .send(`<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns3="http://types.walletserver.casinomodule.com/3_0/">
            <S:Body>
              <ns3:withdraw>
                <callerId>${confSE.callerId}</callerId>
                <callerPassword>${confSE.callerPassword}</callerPassword>
                <playerName>LD_${playerId}</playerName>
                <amount>15</amount>
                <bonusBet>0</bonusBet>
                <currency>EUR</currency>
                <transactionRef>10317</transactionRef>
                <gameRoundRef>8318</gameRoundRef>
                <gameId>starburst_not_mobile_sw</gameId>
                <reason>GAME_PLAY_FINAL</reason>
                <sessionId>${sessionId}</sessionId>
              </ns3:withdraw>
            </S:Body>
          </S:Envelope>`)
        .expect((res) => {
          expect(res.text).to.have.string('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:n="http://types.walletserver.casinomodule.com/3_0/"><s:Body><n:withdrawResponse><balance>85.00</balance><transactionId>');
        })
        .expect(200));
  });
});
