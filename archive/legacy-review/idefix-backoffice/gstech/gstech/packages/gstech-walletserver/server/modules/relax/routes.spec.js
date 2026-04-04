/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');
const { DEFAULT_JURISDICTION } = require('./constants');

describe('Relax Casino API', () => {
  describe('with active player session and appropriate request - status success', () => {
    let sessionId;
    let player;
    const playerBalance = 1000;
    const betAmount = 10;
    const winAmount = 100;
    const gameId = 'epicjoker';

    before(
      async () =>
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({
            manufacturer: 'RLX',
            initialBalance: playerBalance,
          })
          .expect((res) => {
            sessionId = res.body.sessionId;
            player = res.body.player;
          })
          .expect(200),
    );

    it('can verify token', async () => {
      const body = {
        channel: 'web',
        clientid: 'web_windows',
        token: sessionId,
      };
      return await request(app)
        .post('/api/v1/relax/verifyToken')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            customerid: getExternalPlayerId(player),
            countrycode: player.countryId,
            cashiertoken: sessionId,
            customercurrency: player.currencyId,
            balance: playerBalance,
            jurisdiction: DEFAULT_JURISDICTION,
          });
        })
        .expect(200);
    });

    it('can get balance', async () => {
      const body = {
        channel: 'web',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
      };
      return await request(app)
        .post('/api/v1/relax/getBalance')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            customercurrency: player.currencyId,
            balance: playerBalance,
          });
        })
        .expect(200);
    });

    it('can make bet', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id',
        gameref: gameId,
        txid: 123456,
        amount: betAmount,
        txtype: 'withdraw',
        ended: false,
      };
      return await request(app)
        .post('/api/v1/relax/withdraw')
        .send(body)
        .expect((res) => {
          expect(res.body.balance).to.equal(playerBalance - betAmount);
          expect(res.body.txid).to.equal(123456);
        })
        .expect(200);
    });

    it('can make win', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id',
        gameref: gameId,
        txid: 123457,
        amount: winAmount,
        txtype: 'deposit',
        ended: true,
      };
      return await request(app)
        .post('/api/v1/relax/deposit')
        .send(body)
        .expect((res) => {
          expect(res.body.balance).to.equal(playerBalance - betAmount + winAmount);
          expect(res.body.txid).to.equal(123457);
        })
        .expect(200);
    });
  });

  describe('with active player session - can process jackpot win', () => {
    let sessionId;
    let player;
    const playerBalance = 1000;
    const betAmount = 10;
    const winAmount = 100;
    const gameId = 'epicjoker';

    before(
        async () =>
            await request(config.api.backend.url)
                .post('/api/v1/test/init-session')
                .send({
                  manufacturer: 'RLX',
                  initialBalance: playerBalance,
                })
                .expect((res) => {
                  sessionId = res.body.sessionId;
                  player = res.body.player;
                })
                .expect(200),
    );

    it('can make bet before jackpot', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id-jp',
        gameref: gameId,
        txid: 123460,
        amount: betAmount,
        txtype: 'withdraw',
        ended: false,
      };
      return await request(app)
          .post('/api/v1/relax/withdraw')
          .send(body)
          .expect((res) => {
            expect(res.body.balance).to.equal(playerBalance - betAmount);
            expect(res.body.txid).to.equal(123460);
          })
          .expect(200);
    });

    it('can make win win jackpot', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id-jp',
        gameref: gameId,
        txid: 123461,
        amount: winAmount,
        txtype: 'deposit',
        ended: true,
        jackpotpayout: [[5, 50]],
      };
      return await request(app)
          .post('/api/v1/relax/deposit')
          .send(body)
          .expect((res) => {
            expect(res.body.balance).to.equal(playerBalance - betAmount + winAmount);
            expect(res.body.txid).to.equal(123461);
          })
          .expect(200);
    });
  });

  describe('with active player session can bet and rollback', () => {
    let sessionId;
    let player;
    let eegBetTransaction;
    const playerBalance = 1000;
    const betAmount = 125;
    const gameId = 'epicjoker';

    before(
      async () =>
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({
            manufacturer: 'RLX',
            initialBalance: playerBalance,
          })
          .expect((res) => {
            sessionId = res.body.sessionId;
            player = res.body.player;
          })
          .expect(200),
    );

    it('can make bet', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id',
        gameref: gameId,
        txid: 123456,
        amount: betAmount,
        txtype: 'withdraw',
        ended: false,
      };
      return await request(app)
        .post('/api/v1/relax/withdraw')
        .send(body)
        .expect((res) => {
          eegBetTransaction = res.body.remotetxid;
          expect(res.body.balance).to.equal(playerBalance - betAmount);
          expect(res.body.txid).to.equal(123456);
        })
        .expect(200);
    });

    it('can make rollback', async () => {
      const body = {
        customerid: getExternalPlayerId(player),
        gamesessionid: 'some-round-id',
        txid: 123457,
        originaltxid: 123456,
      };
      return await request(app)
        .post('/api/v1/relax/rollback')
        .send(body)
        .expect((res) => {
          expect(res.body.balance).to.equal(playerBalance);
          expect(res.body.txid).to.equal(123457);
          expect(res.body.remotetxid).to.not.equal(eegBetTransaction);
        })
        .expect(200);
    });
  });

  describe('with active player session(0 balance) and correct request - can fail', () => {
    let sessionId;
    let player;
    const playerBalance = 0;
    const betAmount = 10;
    const gameId = 'epicjoker';

    before(
      async () =>
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({
            manufacturer: 'RLX',
            initialBalance: playerBalance,
          })
          .expect((res) => {
            sessionId = res.body.sessionId;
            player = res.body.player;
          })
          .expect(200),
    );

    it('can verify token', async () => {
      const body = {
        channel: 'web',
        clientid: 'web_windows',
        token: sessionId,
      };
      return await request(app)
        .post('/api/v1/relax/verifyToken')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            customerid: getExternalPlayerId(player),
            countrycode: player.countryId,
            cashiertoken: sessionId,
            customercurrency: player.currencyId,
            balance: playerBalance,
            jurisdiction: DEFAULT_JURISDICTION,
          });
        })
        .expect(200);
    });

    it('can get balance', async () => {
      const body = {
        channel: 'web',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
      };
      return await request(app)
        .post('/api/v1/relax/getBalance')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            customercurrency: player.currencyId,
            balance: playerBalance,
          });
        })
        .expect(200);
    });

    it('can fail bet with insufficient balance', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id',
        gameref: gameId,
        txid: 123456,
        amount: betAmount,
        txtype: 'withdraw',
        ended: true,
      };
      return await request(app)
        .post('/api/v1/relax/withdraw')
        .send(body)
        .expect((res) => {
          expect(res.body.errorcode).to.equal('INSUFFICIENT_FUNDS');
        })
        .expect(403);
    });
  });

  describe('with active player session(sufficient balance) and wrong request - can fail', () => {
    let sessionId;
    let player;
    const playerBalance = 1000;
    const betAmount = 10;
    const winAmount = 100;

    before(
      async () =>
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({
            manufacturer: 'RLX',
            initialBalance: playerBalance,
          })
          .expect((res) => {
            sessionId = res.body.sessionId;
            player = res.body.player;
          })
          .expect(200),
    );

    it('can fail verify token with wrong token', async () => {
      const body = {
        channel: 'web',
        clientid: 'web_windows',
        token: 'wrong-token',
      };
      return await request(app)
        .post('/api/v1/relax/verifyToken')
        .send(body)
        .expect((res) => {
          expect(res.body.errorcode).to.equal('INVALID_TOKEN');
        })
        .expect(401);
    });

    it('can fail bet with wrong gameid', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id',
        gameref: 'xxxxxxx',
        txid: 123456,
        amount: betAmount,
        txtype: 'withdraw',
        ended: false,
      };
      return await request(app)
        .post('/api/v1/relax/withdraw')
        .send(body)
        .expect((res) => {
          expect(res.body.errorcode).to.equal('TRANSACTION_DECLINED');
        })
        .expect(403);
    });

    it('can fail win wrong gameid', async () => {
      const body = {
        gameid: 'casino',
        channel: 'web',
        clientid: 'web_windows',
        cashiertoken: sessionId,
        customerid: getExternalPlayerId(player),
        currency: player.currencyId,
        gamesessionid: 'some-round-id',
        gameref: 'xxxxxxxxx',
        txid: 123457,
        amount: winAmount,
        txtype: 'deposit',
        ended: true,
      };
      return await request(app)
        .post('/api/v1/relax/deposit')
        .send(body)
        .expect((res) => {
          expect(res.body.errorcode).to.equal('TRANSACTION_DECLINED');
        })
        .expect(403);
    });
  });
});
