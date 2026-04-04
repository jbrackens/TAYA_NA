/* @flow */
const request = require('supertest');  
const moment = require('moment-timezone');
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const { MANUFACTURER_ID } = require('./constants');
const testData = require('./types/test-data');

// const app = require('../../index');
const config = require('../../../config');
const app = require('../../index');


// const configuration = config.providers.betby;

const getBetbyTransactionId = (): string => (new Date().getTime()).toString();

describe('Betby Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let player;
    const balance = 1000;

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: MANUFACTURER_ID,
        initialBalance: balance,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));


    it('API /ping', () =>
      request(app)
        .get('/api/v1/betby/ping')
        .expect((res) => {
          expect(res.body.timestamp).to.not.equal(undefined);
        })
        .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

  });


  describe('ping -> identify -> make -> win -> rollback -> win -> rollback -> refund -> rollback -> lost -> rollbak -> refund -> settlement', () => {
    let sessionId;
    let player;
    const balance = 1000;
    const betAmount = 125;
    const winAmount =375;
    const winAmount2 =500;

    const betslipId = '111222';
    let betTransactionId;
    let parentTransactionId;
    const betbyTransactionId = '5555'; // transaction id assigned by Betby

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: MANUFACTURER_ID,
        initialBalance: balance,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('API /ping', () =>
      request(app)
        .get('/api/v1/betby/ping')
        .expect((res) => {
          expect(res.body.timestamp).to.not.equal(undefined);
        })
        .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

    it('API /bet/make', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount,
          betbyTransactionId,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId);
          expect(res.body.amount).to.equal(betAmount);
          expect(res.body.balance).to.equal(balance-betAmount);
          betTransactionId=res.body.id
        })
        .expect(200));

    it('API /bet/commit', () =>
      request(app)
        .post('/api/v1/betby/bet/commit')
        .send(testData.jwtSign(testData.getBetCommitRequest(
          betTransactionId,
        )))
        .expect(200));

    it('API /bet/win', () =>
      request(app)
        .post('/api/v1/betby/bet/win')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId,
          winAmount,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount+winAmount);
        })
        .expect(200));

    it('API /bet/rollback', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId,
          parentTransactionId,
          winAmount
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/win 2', () =>
      request(app)
        .post('/api/v1/betby/bet/win')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          getBetbyTransactionId(),
          winAmount2,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount+winAmount2);
        })
        .expect(200));

    it('API /bet/rollback 2', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId,
          parentTransactionId,
          winAmount2
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/refund', () =>
      request(app)
        .post('/api/v1/betby/bet/refund')
        .send(testData.jwtSign(testData.getBetRefundRequest(
          getExternalPlayerId(player),
          betTransactionId,
          getBetbyTransactionId(),
          betAmount,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

    it('API /bet/rollback 3', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId,
          parentTransactionId,
          betAmount
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/lost', () =>
      request(app)
        .post('/api/v1/betby/bet/lost')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          getBetbyTransactionId(),
          0,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/rollback 4', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId,
          parentTransactionId,
          betAmount
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/refund 2', () =>
      request(app)
        .post('/api/v1/betby/bet/refund')
        .send(testData.jwtSign(testData.getBetRefundRequest(
          getExternalPlayerId(player),
          betTransactionId,
          getBetbyTransactionId(),
          betAmount,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

    it('API /bet/settlement', () =>
      request(app)
        .post('/api/v1/betby/bet/settlement')
        .send(testData.jwtSign(testData.getBetSettlementRequest(
          betTransactionId,
        )))
        .expect(() => {
        })
        .expect(200));


  });

  describe('identify -> bet -> discard 1 -> discard 2', () => {
    let sessionId;
    let player;
    const balance = 1000;
    const betAmount = 125;
    const betslipId = '111222';
    const betbyTransactionId = '6666'; // transaction id assigned by Betby
    let extTransactionId;

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: MANUFACTURER_ID,
        initialBalance: balance,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

    it('API /bet/make', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount,
          betbyTransactionId,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId);
          expect(res.body.amount).to.equal(betAmount);
          expect(res.body.balance).to.equal(balance-betAmount);
          extTransactionId = res.body.ext_transaction_id;
        })
        .expect(200));

    it('API /bet/discard normal flow', () =>
      request(app)
        .post('/api/v1/betby/bet/discard')
        .send(testData.jwtSign(testData.getBetDiscardRequest(
          getExternalPlayerId(player),
          extTransactionId,
        )))
        .expect((res) => {
          expect(res.body.real_balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

    it('API /bet/discard unexpected extTransactionId data', () =>
      request(app)
        .post('/api/v1/betby/bet/discard')
        .send(testData.jwtSign(testData.getBetDiscardRequest(
          getExternalPlayerId(player),
          "77777",
        )))
        .expect((res) => {
          expect(res.body.real_balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

  });

  describe('identify -> bet -> refund', () => {
    let sessionId;
    let player;
    const balance = 1000;
    const betAmount = 125;
    const betslipId = '222333';
    let transactionId;
    const betbyTransactionId = '7777'; // transaction id assigned by Betby

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
          manufacturer: MANUFACTURER_ID,
          initialBalance: balance,
          parameters: {
            expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

    it('API /bet/make', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount,
          betbyTransactionId,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId);
          expect(res.body.amount).to.equal(betAmount);
          expect(res.body.balance).to.equal(balance-betAmount);
          transactionId=res.body.id;
        })
        .expect(200));

    it('API /bet/refund', () =>
      request(app)
        .post('/api/v1/betby/bet/refund')
        .send(testData.jwtSign(testData.getBetRefundRequest(
          getExternalPlayerId(player),
          transactionId,
          betbyTransactionId,
          betAmount,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

  });

  describe('identify -> bet -> settlement', () => {
    let sessionId;
    let player;
    const balance = 1000;
    const betAmount = 125;
    const betslipId = '333444';
    let transactionId;
    const betbyTransactionId = '8888'; // transaction id assigned by Betby

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: MANUFACTURER_ID,
        initialBalance: balance,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

    it('API /bet/make', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount,
          betbyTransactionId,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId);
          expect(res.body.amount).to.equal(betAmount);
          expect(res.body.balance).to.equal(balance-betAmount);
          transactionId=res.body.parent_transaction_id;
        })
        .expect(200));

    it('API /bet/settlement', () =>
      request(app)
        .post('/api/v1/betby/bet/settlement')
        .send(testData.jwtSign(testData.getBetSettlementRequest(
          transactionId,
        )))
        .expect(() => {
        })
        .expect(200));

  });

  describe('identify -> bet -> win -> win -> rollback -> refund -> refund -> rollback -> lost -> lost', () => {
    let sessionId;
    let player;
    const balance = 1000;
    const betAmount = 125;
    const betslipId = '333444';
    const winAmount = 100;
    let betTransactionId;
    let parentTransactionId;
    const betbyTransactionId = '8888'; // transaction id assigned by Betby
    const betbyTransactionId2 = '9999';
    const betbyTransactionId3 = '7777';

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: MANUFACTURER_ID,
        initialBalance: balance,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

    it('API /bet/make', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount,
          betbyTransactionId,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId);
          expect(res.body.amount).to.equal(betAmount);
          expect(res.body.balance).to.equal(balance-betAmount);
          betTransactionId=res.body.parent_transaction_id;
        })
        .expect(200));

    it('API /bet/win 1', () =>
      request(app)
        .post('/api/v1/betby/bet/win')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId,
          winAmount,
          betslipId,
        )))
        .expect((res) => {
          // parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount+winAmount);
        })
        .expect(200));

    it('API /bet/win 2', () =>
      request(app)
        .post('/api/v1/betby/bet/win')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId, // THE SAME TRANSACTION VALUE
          winAmount,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount+winAmount);
        })
        .expect(200));

    it('API /bet/rollback 1', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId,
          parentTransactionId,
          betAmount
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));


    it('API /bet/refund 1', () =>
      request(app)
        .post('/api/v1/betby/bet/refund')
        .send(testData.jwtSign(testData.getBetRefundRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId2,
          betAmount,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

    it('API /bet/refund 2', () =>
      request(app)
        .post('/api/v1/betby/bet/refund')
        .send(testData.jwtSign(testData.getBetRefundRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId2,
          betAmount,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance); // balance is back to initial value (before bet)
        })
        .expect(200));

    it('API /bet/rollback 2', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId,
          parentTransactionId,
          betAmount
        )))
        .expect((res) => {
          parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/lost 1', () =>
      request(app)
        .post('/api/v1/betby/bet/lost')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId3,
          0,
          betslipId,
        )))
        .expect((res) => {
          // parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));

    it('API /bet/lost 2', () =>
      request(app)
        .post('/api/v1/betby/bet/lost')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId,
          betbyTransactionId3,
          0,
          betslipId,
        )))
        .expect((res) => {
          // parentTransactionId=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount);
        })
        .expect(200));


  });


  describe('identify -> bet1 -> win1 -> bet2 -> rollback1 (balance not enough )  ', () => {
    let sessionId;
    let player;
    const balance = 1000;
    const betAmount1 = 800;
    const winAmount = 1000;
    const betAmount2 = 1000;
    const winAmount2 = 2000;

    const betslipId = '333444';
    const betslipId2 = '343434';

    let betTransactionId1;
    let parentTransactionId1;
    let betTransactionId2;
    // let parentTransactionId2;

    const betbyTransactionId1 = '111111';
    const betbyTransactionId2 = '222222';

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: MANUFACTURER_ID,
        initialBalance: balance,
        parameters: {
          expires: moment().add(15, 'minutes'),
        },
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('API /identify', () =>
      request(app)
        .get('/api/v1/betby/identify')
        .query({
          key: sessionId,
        })
        .expect((res) => {
          expect(res.body.user_id).to.equal(getExternalPlayerId(player));
          expect(res.body.session_id).to.equal(sessionId);
          expect(res.body.balance).to.equal(balance);
        })
        .expect(200));

    it('API /bet/make 1', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount1,
          betbyTransactionId1,
          betslipId,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId1);
          expect(res.body.amount).to.equal(betAmount1);
          expect(res.body.balance).to.equal(balance-betAmount1);
          betTransactionId1=res.body.parent_transaction_id;
        })
        .expect(200));

    it('API /bet/win 1', () =>
      request(app)
        .post('/api/v1/betby/bet/win')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId1,
          getBetbyTransactionId(),
          winAmount,
          betslipId,
        )))
        .expect((res) => {
          parentTransactionId1=res.body.id
          expect(res.body.balance).to.equal(balance-betAmount1+winAmount); // 1200
        })
        .expect(200));

    it('API /bet/make 2', () =>
      request(app)
        .post('/api/v1/betby/bet/make')
        .send(testData.jwtSign(testData.getBetMakeRequest(
          getExternalPlayerId(player),
          sessionId,
          betAmount2,
          betbyTransactionId2,
          betslipId2,
        )))
        .expect((res) => {
          expect(res.body.ext_transaction_id).to.equal(betbyTransactionId2);
          expect(res.body.amount).to.equal(betAmount2);
          expect(res.body.balance).to.equal( (balance-betAmount1+winAmount) -betAmount2); // 200
          betTransactionId2=res.body.parent_transaction_id;
        })
        .expect(200));

    it('API /bet/rollback 1 (over balance)', () =>
      request(app)
        .post('/api/v1/betby/bet/rollback')
        .send(testData.jwtSign(testData.getBetRollbackRequest(
          getExternalPlayerId(player),
          betTransactionId1,
          parentTransactionId1,
          betAmount1
        )))
        .expect((res) => {
          parentTransactionId1=res.body.id;
          expect(res.body.balance).to.equal(200); // 200-800 = -600, but response balance:200 and 800 logged as 'betRollback NEGATIVE_BALANCE' (credited by casino)
        })
        .expect(200));

    it('API /bet/win 2', () =>
      request(app)
        .post('/api/v1/betby/bet/win')
        .send(testData.jwtSign(testData.getBetWinRequest(
          getExternalPlayerId(player),
          betTransactionId2,
          getBetbyTransactionId(),
          winAmount2,
          betslipId2,
        )))
        .expect((res) => {
          parentTransactionId1=res.body.id
          expect(res.body.balance).to.equal(2200); // 200+2200
        })
        .expect(200));


    });



});
