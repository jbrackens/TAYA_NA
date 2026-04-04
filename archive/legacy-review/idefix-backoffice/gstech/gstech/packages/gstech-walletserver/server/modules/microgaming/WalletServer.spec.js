/* @flow */
const request = require('supertest');  
const moment = require('moment-timezone');
const logger = require('gstech-core/modules/logger');
const app = require('../../index');
const { login, password } = require('../../../config').providers.microgaming[0].brands.LD;
const config = require('../../../config');

const clean = (xml: string) => xml.replace(/timestamp=".*?"/, 'timestamp=""').replace(/exttransactionid="\d*?"/, 'exttransactionid=""');
const ts = () => moment().format('YYYY/MM/DD HH:mm:ss.SSS');

describe('Microgaming WalletServer', () => {
  describe('Completes examples from integration document', () => {
    let loginToken;
    let token;
    let player;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'MGS',
        initialBalance: 1000,
        type: 'ticket',
        parameters: { expires: moment().add(15, 'minutes') },
      })
      .expect((res) => {
        const { sessionId } = res.body;
        player = res.body.player;
        loginToken = sessionId;
      })
      .expect(200));
    it('creates login token', () =>
      request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'MGS',
          initialBalance: 1000,
          type: 'ticket',
          parameters: { expires: moment().add(15, 'minutes') },
        })
        .expect((res) => {
          logger.debug('Microgaming login token', res.body.sessionId);
        })
        .expect(200));
    it('logins player', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="login" timestamp="${ts()}"
          system="casino">
            <auth login="${login}" password="${password}" />
            <call seq="24971455-aecc-4a69-8494-f544d49db3da" token="${loginToken}" clienttypeid="1">
              <extinfo/>
            </call>
          </methodcall>
        </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect((res) => {
          const m = res.text.match(/token="(.*?)"/);
          if (!m) throw new Error('No token found in response')
          token = m.pop();
          logger.debug('Logged in Microgaming token', token);
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="login" timestamp="">
              <result seq="24971455-aecc-4a69-8494-f544d49db3da" token="${token || ''}" loginname="LD_${player.id}" currency="EUR" country="DE" city="Dessau" balance="1000" bonusbalance="0" wallet="vanguard">
                <extinfo/>
              </result>
            </methodresponse>
          </pkt>`);
        })
        .expect(200));

    it('gets player balance', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
            <methodcall name="getbalance" timestamp="" system="casino">
              <auth login="${login}" password="${password}" />
              <call seq="d8382c1d-6ce0-433d-9233-e7358b10a70b" token="${token || ''}" clienttypeid="1"> <extinfo /></call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
              <methodresponse name="getbalance" timestamp="">
                <result seq="d8382c1d-6ce0-433d-9233-e7358b10a70b" token="${token || ''}" balance="1000" bonusbalance="0">
                  <extinfo />
                </result>
              </methodresponse>
            </pkt>`))
        .expect(200));

    it('places a bet with amount greater than current balance', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada93"
              playtype="bet"
              token="${token || ''}"
              gameid="20"
              gamereference="MGS_ImmortalRomance"
              actionid="12157"
              actiondesc=""
              amount="20000"
              start="false"
              finish="false"
              offline="false"
              currency="eur"><extinfo /></call>
          </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
              <methodresponse name="play" timestamp="">
                <result seq="df829722-9826-4540-8a58-1d1c0feada93" errorcode="6503" errordescription="Player has insufficient funds.">
                  <extinfo />
                </result>
              </methodresponse>
            </pkt>`))
        .expect(200));


    it('places a bet', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada93"
              playtype="bet"
              token="${token || ''}"
              gameid="20"
              gamereference="MGS_ImmortalRomance"
              actionid="12158"
              actiondesc=""
              amount="225"
              start="false"
              finish="false"
              offline="false"
              currency="eur"
              freegame="freegameoffer1"
              freegameofferinstanceid="1"
              freegamenumgamesplayed="2"
              freegamenumgamesremaining="8"
              clienttypeid="1"><extinfo /></call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada93" token="${token || ''}" balance="775" bonusbalance="0" exttransactionid="">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));

    it('credits a win', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada94"
              playtype="win"
              token="${token || ''}"
              gameid="20"
              gamereference="MGS_ImmortalRomance"
              actionid="12159"
              actiondesc=""
              amount="1225"
              start="false"
              finish="false"
              offline="false"
              currency="eur"
              clienttypeid="1"><extinfo /></call>
          </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada94" token="${token || ''}" balance="2000" bonusbalance="0" exttransactionid="">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));

    it('credits a jackpot win', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada95"
              playtype="progressivewin"
              token="${token || ''}"
              gameid="20"
              gamereference="MGS_ImmortalRomance"
              actionid="12160"
              actiondesc=""
              amount="1001225"
              start="false"
              finish="false"
              offline="false"
              currency="eur"
              clienttypeid="1"><extinfo /></call>
          </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada95" token="${token || ''}" balance="1003225" bonusbalance="0" exttransactionid="">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));


    it('closes the round', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="endgame" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call seq="633b0a18-3cd8-4e59-8c1b-16fc301a5f53"
              token="${token || ''}"
              gamereference="MGS_ImmortalRomance"
              gameid="20">
                <extinfo />
              </call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
              <methodresponse name="endgame" timestamp="">
                <result seq="633b0a18-3cd8-4e59-8c1b-16fc301a5f53" token="${token || ''}" balance="1003225" bonusbalance="0">
                  <extinfo />
                </result>
              </methodresponse>
            </pkt>`))
        .expect(200));

    it('closes the round without token', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="endgame" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call seq="633b0a18-3cd8-4e59-8c1b-16fc301a5f53"
              offline="true"
              token="LD_${player.id}_20"
              gamereference="MGS_ImmortalRomance"
              gameid="20">
                <extinfo />
              </call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
              <methodresponse name="endgame" timestamp="">
                <result seq="633b0a18-3cd8-4e59-8c1b-16fc301a5f53" token="LD_${player.id}_20" balance="1003225" bonusbalance="0">
                  <extinfo />
                </result>
              </methodresponse>
            </pkt>`))
        .expect(200));


    it('refreshes token', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
            <methodcall name="refreshtoken" timestamp="${ts()}">
            <auth login="${login}" password="${password}" />
            <call seq="f6fbaf29-19ca-4c9a-955b-709e11570f99" token="${token || ''}">
              <extinfo />
            </call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect((res) => {
          const m = res.text.match(/token="(.*?)"/);
          if (!m) throw new Error('No token found');
          const token2 = m.pop()
          expect(token).to.equal(token2);
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="refreshtoken" timestamp="">
              <result seq="f6fbaf29-19ca-4c9a-955b-709e11570f99" token="${token2 || ''}">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`);
        })
        .expect(200));
    it('places a bet', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada93"
              playtype="bet"
              token="${token || ''}"
              gameid="20"
              gamereference="MGS_ImmortalRomance"
              actionid="12157"
              actiondesc=""
              amount="225"
              start="false"
              finish="false"
              offline="false"
              currency="eur"><extinfo /></call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada93" token="${token || ''}" balance="1003000" bonusbalance="0" exttransactionid="">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));

    it('refunds a bet', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada93"
              playtype="refund"
              token="${token || ''}"
              gameid="20"
              gamereference="MGS_ImmortalRomance"
              actionid="12157"
              actiondesc=""
              amount="225"
              start="false"
              finish="false"
              offline="false"
              currency="eur"><extinfo /></call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada93" token="${token || ''}" balance="1003225" bonusbalance="0" exttransactionid="">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));

    it('handles cancellation of non-existing round', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada93"
              playtype="refund"
              token="${token || ''}"
              gameid="5520"
              gamereference="MGS_ImmortalRomance"
              actionid="512157"
              actiondesc=""
              amount="225"
              start="false"
              finish="false"
              offline="false"
              currency="eur"><extinfo /></call>
            </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada93" token="${token || ''}" balance="1003225" bonusbalance="0" exttransactionid="DEBIT-NOT-RECEIVED">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));

    it('credits an offline win', () =>
      request(app)
        .post('/api/v1/microgaming')
        .set('Content-Type', 'application/xml')
        .send(`<pkt>
          <methodcall name="play" timestamp="${ts()}" system="casino">
            <auth login="${login}" password="${password}" />
            <call
              seq="df829722-9826-4540-8a58-1d1c0feada94"
              playtype="win"
              token="${player.brandId}_${player.id}_50_52160"
              gameid="50"
              gamereference="MGS_ImmortalRomance"
              actionid="52160"
              actiondesc=""
              amount="1225"
              start="false"
              finish="false"
              offline="true"
              currency="eur"
              clienttypeid="1"><extinfo /></call>
          </methodcall>
          </pkt>`)
        .expect(res => expect(res.text).to.be.valid())
        .expect(res =>
          expect(clean(res.text)).xml.to.deep.equal(`<pkt>
            <methodresponse name="play" timestamp="">
              <result seq="df829722-9826-4540-8a58-1d1c0feada94" token="${player.brandId}_${player.id}_50_52160" balance="1004450" bonusbalance="0" exttransactionid="">
                <extinfo />
              </result>
            </methodresponse>
          </pkt>`))
        .expect(200));
  });
});
