/* @flow */
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const { getExternalPlayerId } = require('gstech-core/modules/helpers');

const app = require('../../index');
const config = require('../../../config');

describe('ELK Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let playerId;

    const betTxId = uuid();
    const winTxId = uuid();
    const rollbackTxId = uuid();

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'ELK',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = getExternalPlayerId(res.body.player);
      })
      .expect(200));

    it('can getaccount', () =>
      request(app)
        .post('/api/v1/elk')
        .set({ 'content-type': 'text/xml' })
        .send(`<?xml version="1.0" encoding="UTF-8" ?>
        <REQ action="getaccount" apiversion="2.2">
          <PARTNERUID>elkstage</PARTNERUID>
          <PASSWORD>passwordstage</PASSWORD>
          <OPERATORID>7770472</OPERATORID>
          <TOKEN>${sessionId}</TOKEN>
          <CURRENCY>EUR</CURRENCY>
          <EXTENSION>withelable=168;platform=mobile</EXTENSION>
        </REQ>`)
        .expect((res) => {
          expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <RSP action="getaccount" rc="0" msg="">
          <OPERATORID>7770472</OPERATORID>
          <ACCOUNTID>${playerId}</ACCOUNTID>
          <CURRENCY>EUR</CURRENCY>
          <JURISDICTION>GNRS</JURISDICTION>
          <SCREENNAME>Jack S</SCREENNAME>
        </RSP>`.replace(/>\s+</g,'><'));
        })
        .expect(200));

    it('can getaccount', () =>
      request(app)
        .post('/api/v1/elk')
        .set({ 'content-type': 'text/xml' })
        .send(`<?xml version="1.0" encoding="UTF-8" ?>
        <REQ action="getbalance" apiversion="2.2">
          <PARTNERUID>elkstage</PARTNERUID>
          <PASSWORD>passwordstage</PASSWORD>
          <OPERATORID>7770472</OPERATORID>
          <ACCOUNTID>${playerId}</ACCOUNTID>
          <SESSIONID>${sessionId}</SESSIONID>
          <CURRENCY>EUR</CURRENCY>
          <GAMEID>10014</GAMEID>
        </REQ>`)
        .expect((res) => {
          expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <RSP action="getbalance" rc="0" msg="">
            <OPERATORID>7770472</OPERATORID>
            <ACCOUNTID>${playerId}</ACCOUNTID>
            <CURRENCY>EUR</CURRENCY>
            <BALANCE>10.00</BALANCE>
          </RSP>`.replace(/>\s+</g,'><'));
        })
        .expect(200));

    it('can wager', () =>
      request(app)
        .post('/api/v1/elk')
        .set({ 'content-type': 'text/xml' })
        .send(`<?xml version="1.0" encoding="UTF-8" ?>
        <REQ action="wager" apiversion="2.2">
          <PARTNERUID>elkstage</PARTNERUID>
          <PASSWORD>passwordstage</PASSWORD>
          <OPERATORID>7770472</OPERATORID>
          <ACCOUNTID>${playerId}</ACCOUNTID>
          <SESSIONID>${sessionId}</SESSIONID>
          <TXID>${betTxId}</TXID>
          <CURRENCY>EUR</CURRENCY>
          <AMOUNT>1.50</AMOUNT>
          <ROUNDID>1801011259100100202</ROUNDID>
          <GAMEID>10014</GAMEID>
        </REQ>`)
        .expect((res) => {
          const WALLETTXID = res.text.match(/<WALLETTXID>\d+<\/WALLETTXID>/)
          if (!WALLETTXID) throw new Error('WALLETTXID not matched');
          expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <RSP action="wager" rc="0" msg="">
            <OPERATORID>7770472</OPERATORID>
            <ACCOUNTID>${playerId}</ACCOUNTID>
            ${WALLETTXID[0]}
            <CURRENCY>EUR</CURRENCY>
            <BALANCE>8.50</BALANCE>
            <REALMONEY>1.50</REALMONEY>
            <BONUSMONEY>0.00</BONUSMONEY>
          </RSP>`.replace(/>\s+</g,'><'));
        })
        .expect(200));

      it('can result', () =>
        request(app)
          .post('/api/v1/elk')
          .set({ 'content-type': 'text/xml' })
          .send(`<?xml version="1.0" encoding="UTF-8" ?>
            <REQ action="result" apiversion="2.2">
              <PARTNERUID>elkstage</PARTNERUID>
              <PASSWORD>passwordstage</PASSWORD>
              <OPERATORID>7770472</OPERATORID>
              <ACCOUNTID>${playerId}</ACCOUNTID>
              <SESSIONID>${sessionId}</SESSIONID>
              <TXID>${winTxId}</TXID>
              <CURRENCY>EUR</CURRENCY>
              <AMOUNT>5.00</AMOUNT>
              <ROUNDID>1801011259100100202</ROUNDID>
              <GAMEID>10014</GAMEID>
              <GAMESTATUS>COMPLETED</GAMESTATUS>
            </REQ>`)
          .expect((res) => {
            const WALLETTXID = res.text.match(/<WALLETTXID>\d+<\/WALLETTXID>/)
            if (!WALLETTXID) throw new Error('WALLETTXID not matched');
            expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <RSP action="result" rc="0" msg="">
              <OPERATORID>7770472</OPERATORID>
              <ACCOUNTID>${playerId}</ACCOUNTID>
              ${WALLETTXID[0]}
              <CURRENCY>EUR</CURRENCY>
              <BALANCE>13.50</BALANCE>
            </RSP>`.replace(/>\s+</g,'><'));
          })
          .expect(200));

      it('can wager another time', () =>
        request(app)
          .post('/api/v1/elk')
          .set({ 'content-type': 'text/xml' })
          .send(`<?xml version="1.0" encoding="UTF-8" ?>
          <REQ action="wager" apiversion="2.2">
            <PARTNERUID>elkstage</PARTNERUID>
            <PASSWORD>passwordstage</PASSWORD>
            <OPERATORID>7770472</OPERATORID>
            <ACCOUNTID>${playerId}</ACCOUNTID>
            <SESSIONID>${sessionId}</SESSIONID>
            <TXID>${rollbackTxId}</TXID>
            <CURRENCY>EUR</CURRENCY>
            <AMOUNT>1.50</AMOUNT>
            <ROUNDID>18010112591001002</ROUNDID>
            <GAMEID>10014</GAMEID>
          </REQ>`)
          .expect((res) => {
            const WALLETTXID = res.text.match(/<WALLETTXID>\d+<\/WALLETTXID>/)
            if (!WALLETTXID) throw new Error('WALLETTXID not matched');
            expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <RSP action="wager" rc="0" msg="">
              <OPERATORID>7770472</OPERATORID>
              <ACCOUNTID>${playerId}</ACCOUNTID>
              ${WALLETTXID[0]}
              <CURRENCY>EUR</CURRENCY>
              <BALANCE>12.00</BALANCE>
              <REALMONEY>1.50</REALMONEY>
              <BONUSMONEY>0.00</BONUSMONEY>
            </RSP>`.replace(/>\s+</g,'><'));
          })
          .expect(200));

      it('can rollback', () =>
        request(app)
          .post('/api/v1/elk')
          .set({ 'content-type': 'text/xml' })
          .send(`<?xml version="1.0" encoding="UTF-8" ?>
          <REQ action="rollback" apiversion="2.2">
            <PARTNERUID>elkstage</PARTNERUID>
            <PASSWORD>passwordstage</PASSWORD>
            <OPERATORID>7770472</OPERATORID>
            <ACCOUNTID>${playerId}</ACCOUNTID>
            <SESSIONID>${sessionId}</SESSIONID>
            <ROLLBACKTXID>${rollbackTxId}</ROLLBACKTXID>
            <ROUNDID>18010112591001002</ROUNDID>
            <CURRENCY>EUR</CURRENCY>
            <AMOUNT>1.50</AMOUNT>
          </REQ>`)
          .expect((res) => {
            const WALLETTXID = res.text.match(/<WALLETTXID>\d+<\/WALLETTXID>/)
            if (!WALLETTXID) throw new Error('WALLETTXID not matched');
            expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <RSP action="rollback" rc="0" msg="">
              <OPERATORID>7770472</OPERATORID>
              <ACCOUNTID>${playerId}</ACCOUNTID>
              ${WALLETTXID[0]}
              <CURRENCY>EUR</CURRENCY>
              <BALANCE>13.50</BALANCE>
            </RSP>`.replace(/>\s+</g,'><'));
          })
          .expect(200));

      it('can rollback non existing bet', () =>
        request(app)
          .post('/api/v1/elk')
          .set({ 'content-type': 'text/xml' })
          .send(`<?xml version="1.0" encoding="UTF-8" ?>
          <REQ action="rollback" apiversion="2.2">
            <PARTNERUID>elkstage</PARTNERUID>
            <PASSWORD>passwordstage</PASSWORD>
            <OPERATORID>7770472</OPERATORID>
            <ACCOUNTID>${playerId}</ACCOUNTID>
            <SESSIONID>${sessionId}</SESSIONID>
            <ROLLBACKTXID>nothing_to_rollback</ROLLBACKTXID>
            <ROUNDID>666</ROUNDID>
            <CURRENCY>EUR</CURRENCY>
            <AMOUNT>1.50</AMOUNT>
          </REQ>`)
          .expect((res) => {
            expect(res.text).to.have.string(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><RSP action="rollback" rc="200" msg="No transaction to cancel"/>`);
          })
          .expect(200));
  });
});
