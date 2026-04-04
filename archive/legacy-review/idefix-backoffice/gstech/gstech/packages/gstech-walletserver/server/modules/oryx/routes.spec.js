/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.oryx;

describe('Oryx Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let playerId;

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
      .send({
        manufacturer: 'ORX',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = getExternalPlayerId(res.body.player);
      })
      .expect(200));

    it('can post authenticate request', () =>
      request(app)
        .post(`/api/v1/oryx/tokens/${sessionId}/authenticate`)
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          gameCode: 'ORYX_HTML5_AER',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            balance: 1000,
            currencyCode: 'EUR',
            languageCode: 'en',
            nickname: 'Jack S',
            playerId,
          });
        })
        .expect(200));

    it('can post balance request', () =>
      request(app)
        .post(`/api/v1/oryx/players/${playerId}/balance`)
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          gameCode: 'ORYX_HTML5_AER',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1000,
          });
        })
        .expect(200));

    it('can fail transaction request if bet it too high', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'T17',
            amount: 100000000,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OUT_OF_MONEY',
            errorDescription: 'Not enough balance',
            balance: 1000,
          });
        })
        .expect(200));

    it('can post transaction request (bet only)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'T17',
            amount: 125,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 875,
          });
        })
        .expect(200));

    it('can post transaction request (close round)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'CLOSE',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 875,
          });
        })
        .expect(200));

    it('can post transaction request (win only)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          win: {
            transactionId: 'T1788',
            amount: 250,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1125,
          });
        })
        .expect(200));

    it('can post transaction request (bet and win together)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123312',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'CLOSE',
          bet: {
            transactionId: 'T17123',
            amount: 125,
            timestamp: 1490644147,
          },
          win: {
            transactionId: 'T1788312',
            amount: 250,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1250,
          });
        })
        .expect(200));

    it('can post transaction request (bet to cancel later)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123868',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'T17678',
            amount: 250,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1000,
          });
        })
        .expect(200));

    it('can post cancel transaction request', () =>
      request(app)
        .post('/api/v1/oryx/game-transactions/T17678')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          action: 'CANCEL',
          transactionId: 'T17678',
          gameCode: 'ORYX_HTML5_AER',
          roundId: 'R123868',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1250,
          });
        })
        .expect(200));

    it('can post transaction request (bet to win with jackpot later)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: '4328092384432902',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'IOUOIUOUOIU',
            amount: 350,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 900,
          });
        })
        .expect(200));

    it('can post transaction request (win with jackpot)', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: '4328092384432902',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          win: {
            transactionId: 'YIUOHINIUNUI',
            amount: 250,
            jackpotAmount: 100,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1250,
          });
        })
        .expect(200));

    it('can get error when post transaction request with previously canceled transaction id', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123868',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'T17678',
            amount: 125,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'ERROR',
            errorDescription: 'Bet was previously canceled',
          });
        })
        .expect(500));

    it('can get error when post cancel not existing transaction', () =>
      request(app)
        .post('/api/v1/oryx/game-transactions/iurwoeiruwoeijrweiorj')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          action: 'CANCEL',
          transactionId: 'iurwoeiruwoeijrweiorj',
          gameCode: 'ORYX_HTML5_AER',
          roundId: 'R12386822222',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'TRANSACTION_NOT_FOUND',
            errorDescription: 'Cancel transaction is not found',
          });
        })
        .expect(500));

    it('can get error when post cancel not existing transaction (without roundId)', () =>
      request(app)
        .post('/api/v1/oryx/game-transactions/iurwoeiruwoeijrweiorj')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          action: 'CANCEL',
          transactionId: 'IOPIPOIO',
          gameCode: 'ORYX_HTML5_AER',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'TRANSACTION_NOT_FOUND',
            errorDescription: 'Cancel transaction is not found',
          });
        })
        .expect(500));

    it('can post cancel before bet transaction request', () =>
      request(app)
        .post('/api/v1/oryx/game-transactions/YUIYIUYIU')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          action: 'CANCEL',
          transactionId: 'YUIYIUYIU',
          gameCode: 'ORYX_HTML5_AER',
          roundId: 'R123868',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'TRANSACTION_NOT_FOUND',
            errorDescription: 'Cancel transaction is not found',
          });
        })
        .expect(500));

    it('can post bet after cancel transaction request', () =>
      request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'R123868',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'YUIYIUYIU',
            amount: 250,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'ERROR',
            errorDescription: 'Bet was previously canceled',
          });
        })
        .expect(500));

    it('can cancel whole round', async () => {
      await request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'ROUDUDUU',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'NONE',
          bet: {
            transactionId: 'YYYYYYYYY',
            amount: 125,
            timestamp: 1490644147,
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1125,
          });
        })
        .expect(200);

      await request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'ROUDUDUU',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'CANCEL',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'OK',
            balance: 1250,
          });
        })
        .expect(200);
    });

    it('can cancel unknown round', async () => {
      await request(app)
        .post('/api/v1/oryx/game-transaction')
        .auth(configuration.gameServer.auth.username, configuration.gameServer.auth.password)
        .send({
          playerId,
          roundId: 'QWERTYUYTRERTYUI',
          gameCode: 'ORYX_HTML5_AER',
          roundAction: 'CANCEL',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            responseCode: 'ROUND_NOT_FOUND',
            errorDescription: 'Round not found',
          });
        })
        .expect(500);
    });
  });
});
