/* @flow */
const request = require('supertest');  
const moment = require('moment-timezone');

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.eyecon;

describe('Eyecon Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let player;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'EYE',
        initialBalance: 1000,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('can fail auth with empty request', () =>
      request(app)
        .get('/api/v1/eyecon')
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=1');
        })
        .expect(200));

    it('can fail auth with empty accessid', () =>
      request(app)
        .get('/api/v1/eyecon?accessid=')
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=1');
        })
        .expect(200));

    it('can fail auth with wrong accessid', () =>
      request(app)
        .get('/api/v1/eyecon?accessid=wrongkey')
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=2');
        })
        .expect(200));

    it('can get balances 1', () =>
      request(app)
        .get(`/api/v1/eyecon?accessid=${configuration.accessid}&uid=${getExternalPlayerId(player)}&nid=ABCNET001&sid=ABCSKN001&guid=${sessionId}&gameid=67582&wager=0.00&win=0.00&jpwin=0&ref=1112345&round=0&gtype=BC&type=BALANCE_CHECK&cur=${player.currencyId}&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=10.00');
        })
        .expect(200));

    it('can get balances 2', () =>
      request(app)
        .get(`/api/v1/eyecon?accessid=${configuration.accessid}&uid=${getExternalPlayerId(player)}&nid=ABCNET001&sid=ABCSKN001&guid=${sessionId}&gameid=67582&wager=0.00&win=0.00&jpwin=0&ref=1112345&round=0&gtype=BC&type=BALANCE_CHECK&cur=${player.currencyId}&status=complete&uip=172.20.0.72&udt=N&udp=U`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=10.00');
        })
        .expect(200));

    it('can get balances 3', () =>
      request(app)
        .get(`/api/v1/eyecon?accessid=${configuration.accessid}&uid=${getExternalPlayerId(player)}&nid=ABCNET001&sid=ABCSKN001&guid=${sessionId}&gameid=67582&wager=0.00&win=0.00&jpwin=0.00&ref=1112345&round=3212345&gtype=BC&type=BALANCE_CHECK&cur=${player.currencyId}&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=10.00');
        })
        .expect(200));

    it('can get balances 4', () =>
      request(app)
        .get(`/api/v1/eyecon?accessid=${configuration.accessid}&uid=${getExternalPlayerId(player)}&nid=ABCNET001&sid=ABCSKN001&guid=${sessionId}&gameid=67582&wager=0.00&win=0.00&jpwin=0.00&ref=1112345&round=0&gtype=BC&type=BALANCE_CHECK&cur=${player.currencyId}`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=10.00');
        })
        .expect(200));

    it('can get balances 5', () =>
      request(app)
        .get(`/api/v1/eyecon?accessid=${configuration.accessid}&uid=${getExternalPlayerId(player)}&nid=ABCNET001&sid=ABCSKN001&guid=${sessionId}&gameid=67582&wager=0.00&win=0.00&jpwin=0.00&ref=1112345&round=3212345&gtype=BC&type=BALANCE_CHECK&cur=${player.currencyId}`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=10.00');
        })
        .expect(200));


    it('can place bet 1', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40035&cur=${player.currencyId}&round=40012&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=0.50&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=9.50');
        })
        .expect(200));

    it('can lose bet 1', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40035&cur=${player.currencyId}&round=40012&win=0.00&accessid=${configuration.accessid}&type=LOSE&gameid=67582&gtype=GS&wager=0.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=9.50');
        })
        .expect(200));

    it('can place bet 2', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40036&cur=${player.currencyId}&round=40013&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=0.50`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=9.00');
        })
        .expect(200));

    it('can lose bet 2', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40037&cur=${player.currencyId}&round=40013&win=0.00&accessid=${configuration.accessid}&type=LOSE&gameid=67582&gtype=GS&wager=0.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=9.00');
        })
        .expect(200));

    it('can place bet 3', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40038&cur=${player.currencyId}&round=40014&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=0.50&jpcontrib=0.01500&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.50');
        })
        .expect(200));

    it('can lose bet 3', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40039&cur=${player.currencyId}&round=40014&win=0.00&accessid=${configuration.accessid}&type=LOSE&gameid=67582&gtype=GS&wager=0.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.50');
        })
        .expect(200));

    it('can place bet 4', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40040&cur=${player.currencyId}&round=40015&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=0.50&jpcontrib=0.01500`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.00');
        })
        .expect(200));

    it('can have win 1', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40012&cur=${player.currencyId}&round=40015&win=0.20&accessid=${configuration.accessid}&type=WIN&gameid=67582&gtype=GS&wager=0.00&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.20');
        })
        .expect(200));

    it('can have win 2', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40013&cur=${player.currencyId}&round=40015&win=0.20&accessid=${configuration.accessid}&type=WIN&gameid=67582&gtype=GS&wager=0.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.40');
        })
        .expect(200));

    it('can have win 3', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40014&cur=${player.currencyId}&round=40015&win=0.20&accessid=${configuration.accessid}&type=WIN&gameid=67582&gtype=GS&wager=0.00`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.60');
        })
        .expect(200));

    it('can place bet 5', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40090&cur=${player.currencyId}&round=50014&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=0.50&jpcontrib=0.01500&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=8.10');
        })
        .expect(200));

    it('can get feature win', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=40091&cur=${player.currencyId}&round=50014&win=2.00&accessid=${configuration.accessid}&type=FEATURE_WIN&gameid=67582&gtype=FW&wager=0.00&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=10.10');
        })
        .expect(200));

    it('can get jackpot win', () =>
      request(app)
        .get(`/api/v1/eyecon?accessid=${configuration.accessid}&uid=${getExternalPlayerId(player)}&nid=ABCNET001&sid=ABCSKN001&guid=${sessionId}&gameid=67582&wager=0.00&win=35.00&jpwin=15.00&ref=1112345&round=50014&gtype=JP&type=JACKPOT_WIN&cur=${player.currencyId}`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=45.10');
        })
        .expect(200));

    it('can place bet 6', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=50090&cur=${player.currencyId}&round=60014&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=10.00&jpcontrib=0.01500&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=35.10');
        })
        .expect(200));

    it('can rollback bet', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=50090&cur=${player.currencyId}&round=60014&win=10.00&accessid=${configuration.accessid}&type=ROLLBACK&gameid=67582&gtype=GS&wager=0.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=45.10');
        })
        .expect(200));

    it('can place bet 7', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=50091&cur=${player.currencyId}&round=60015&win=0.00&accessid=${configuration.accessid}&type=BET&gameid=67582&gtype=GS&wager=10.00&jpcontrib=0.01500&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=35.10');
        })
        .expect(200));

    it('can cancel bet', () =>
      request(app)
        .get(`/api/v1/eyecon?jpwin=0.00&uid=${getExternalPlayerId(player)}&guid=${sessionId}&ref=50091&cur=${player.currencyId}&round=60015&win=0.00&accessid=${configuration.accessid}&type=CANCEL_BET&gameid=67582&gtype=GS&wager=0.00&cancelref=50091&cancelwager=10.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=45.10');
        })
        .expect(200));

    it('external test: testAnyTokenOnBalanceCheck', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=xyz1234&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000051287&round=0&gtype=BC&type=BALANCE_CHECK`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=12');
        })
        .expect(200));

    it('external test: testInvalidUidOnBet #1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000051288&round=0&gtype=BC&type=BALANCE_CHECK`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=45.10');
        })
        .expect(200));

    it('external test: testInvalidUidOnBet #2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=1234&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.50&win=0.00&jpwin=0.00&ref=700000051289&round=700000012522&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=6');
        })
        .expect(200));

    it('external test: testInvalidUidOnWin', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=1234&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=10.00&jpwin=0.00&ref=700000051292&round=700000012523&gtype=GS&type=WIN&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=6');
        })
        .expect(200));

    it('external test: testCancelBetForRefAndRoundReceivedBefore #1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=3.00&win=0.00&jpwin=0.00&ref=700000051305&round=700000012525&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=42.10');
        })
        .expect(200));

    it('external test: testCancelBetForRefAndRoundReceivedBefore #2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000051307&round=700000012525&gtype=GS&type=CANCEL_BET&cancelref=700000051305&cancelwager=3.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=45.10');
        })
        .expect(200));

    it('external test: testCancelBetForRefAndRoundNotReceivedBefore', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000051310&round=700000012526&gtype=GS&type=CANCEL_BET&cancelref=700000051308&cancelwager=3.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=45.10');
        })
        .expect(200));

    it('external test: testInvalidUidOnBalanceCheck', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=1234&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000051318&round=0&gtype=BC&type=BALANCE_CHECK`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=6');
        })
        .expect(200));

    it('external test: testExpiredTokenOnBet', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=2930daa0-7b92-11e9-bebc-717d57f95a0e&accessid=uy76et522w&wager=3.00&win=0.00&jpwin=0.00&ref=700000051319&round=700000012529&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=12');
        })
        .expect(200));

    it('external test: testInvalidAccessIdOnBet', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=2930daa0-7b92-11e9-bebc-717d57f95a0e&accessid=1234&wager=3.00&win=0.00&jpwin=0.00&ref=700000051319&round=700000012529&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=2');
        })
        .expect(200));

    it('external test: testBetGreaterThanBalance', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=51081.42&win=0.00&jpwin=0.00&ref=700000051347&round=700000012537&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=13');
        })
        .expect(200));

    it('external test: testJackpotWinRound #1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=10.00&win=0.00&jpwin=0.00&ref=700000051347&round=700000051357&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=35.10');
        })
        .expect(200));

    it('external test: testJackpotWinRound #2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=500.00&jpwin=400.00&ref=700000051359&round=700000051357&gtype=JP&type=JACKPOT_WIN&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=535.10');
        })
        .expect(200));

    it('external test: testLatestBalanceOnWinIdempotency #1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=35.10&win=0.00&jpwin=0.00&ref=700000051364&round=700000012542&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=500.00');
        })
        .expect(200));

    it('external test: testLatestBalanceOnWinIdempotency #2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=10.00&jpwin=0.00&ref=700000051365&round=700000012542&gtype=GS&type=WIN&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=510.00');
        })
        .expect(200));

    it('external test: testLatestBalanceOnWinIdempotency #3', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=10.00&jpwin=0.00&ref=700000051365&round=700000012542&gtype=GS&type=WIN&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=510.00');
        })
        .expect(200));

    it('external test: testRefAndRoundFromPreviousBet #1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=1.00&win=0.00&jpwin=0.00&ref=700000051383&round=700000012549&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=509.00');
        })
        .expect(200));

    it('external test: testRefAndRoundFromPreviousBet #2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=2.00&jpwin=0.00&ref=700000051384&round=700000012549&gtype=GS&type=WIN&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=511.00');
        })
        .expect(200));

    it('external test: testRefAndRoundFromPreviousBet #3', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=1.00&win=0.00&jpwin=0.00&ref=700000051383&round=700000012549&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=511.00');
        })
        .expect(200));

    it('external test: testBetForCancelledRefAndRoundNotReceivedBefore 1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000052072&round=700000012775&gtype=GS&type=CANCEL_BET&cancelref=700000052070&cancelwager=4.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=511.00');
        })
        .expect(200));

    it('external test: testBetForCancelledRefAndRoundNotReceivedBefore 2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=4.00&win=0.00&jpwin=0.00&ref=700000052070&round=700000012775&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=8');
        })
        .expect(200));

    it('external test: testBetForCancelledRefAndRoundNotReceivedBefore #1', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=0.00&win=0.00&jpwin=0.00&ref=700000052668&round=700000012950&gtype=GS&type=CANCEL_BET&cancelref=700000052666&cancelwager=4.00&status=complete`)
        .expect((res) => {
          expect(res.text).to.equal('status=ok&bal=511.00');
        })
        .expect(200));

    it('external test: testBetForCancelledRefAndRoundNotReceivedBefore #2', () =>
      request(app)
        .get(`/api/v1/eyecon?uid=${getExternalPlayerId(player)}&cur=${player.currencyId}&gameid=67582&guid=${sessionId}&accessid=uy76et522w&wager=4.00&win=0.00&jpwin=0.00&ref=700000052666&round=700000012950&gtype=GS&type=BET&status=active`)
        .expect((res) => {
          expect(res.text).to.equal('status=invalid&error=8');
        })
        .expect(200));
  });
});
