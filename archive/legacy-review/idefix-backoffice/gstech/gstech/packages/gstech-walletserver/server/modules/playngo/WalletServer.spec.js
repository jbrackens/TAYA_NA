/* @flow */
const supertest = require('supertest');  

const moment = require('moment-timezone');
const { parseString, processors } = require('xml2js');
const { promisify } = require('util');
const config = require('../../../config');
const app = require('../../index');

const parseXml = promisify(parseString);

const parse = (xml: string) => parseXml(xml, {
  attrNameProcessors: [processors.stripPrefix],
  tagNameProcessors: [processors.stripPrefix],
});

describe('PlaynGo WalletServer', () => {
  let player;
  let sessionId;
  let ticket;
  beforeEach(async () => supertest(config.api.backend.url)
    .post('/api/v1/test/init-session')
    .send({
      manufacturer: 'PNG',
      initialBalance: 1000,
      type: 'ticket',
      parameters: { expires: moment().add(15, 'minutes'), gameId: '287' },
    })
    .expect((res) => {
      ticket = res.body.sessionId;
      player = res.body.player;
    })
    .expect(200));

  const request = async (type: string, body: string) => {
    let r = '';
    await supertest(app)
      .post(`/api/v1/playngo/${type}`)
      .set('Content-Type', 'application/xml')
      .send(body)
      .expect((res) => { r = res.text; })
      .expect(200);
    return r.replace(/<externalTransactionId>.*<\/externalTransactionId>/, '<externalTransactionId>ID</externalTransactionId>');
  };

  it('returns an error when gameId doesn\'t match ticket', async () => {
    const response = await request('authenticate', `<authenticate>
     <username>${ticket}</username>
     <password></password>
     <extra />
     <productId>1</productId>
     <client />
     <CID />
     <clientIP>94.22.187.206</clientIP>
     <contextId>0</contextId>
     <accessToken>stagestagestagestage</accessToken>
     <language>fi_FI</language>
     <gameId>1287</gameId>
   </authenticate>`);

    await parse(response);
    expect(response).xml.to.deep.equal(`<authenticate>
      <statusCode>12</statusCode>
      <statusMessage>Palvelu ei ole saatavilla</statusMessage>
    </authenticate>`);
  });


  it('authenticates', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('authenticate', `<authenticate>
     <username>${ticket}</username>
     <password></password>
     <extra />
     <productId>1</productId>
     <client />
     <CID />
     <clientIP>94.22.187.206</clientIP>
     <contextId>0</contextId>
     <accessToken>stagestagestagestage</accessToken>
     <language>en</language>
     <gameId>287</gameId>
   </authenticate>`);

    const r = await parse(response);
    [sessionId] = r.authenticate.externalGameSessionId;

    expect(response).xml.to.deep.equal(`<authenticate>
      <externalId>${userId}</externalId>
      <userCurrency>EUR</userCurrency>
      <nickname>Jack S</nickname>
      <country>DE</country>
      <birthdate>1989-02-01</birthdate>
      <registration>${player.createdAt}</registration>
      <language>en_GB</language>
      <affiliateId>LD</affiliateId>
      <real>10.00</real>
      <gender>m</gender>
      <externalGameSessionId>${sessionId}</externalGameSessionId>
      <statusCode>0</statusCode>
      <statusMessage>OK</statusMessage>
    </authenticate>`);
  });

  it('Reserves money twice', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('reserve', `<reserve>
       <externalId>${userId}</externalId>
       <productId>1</productId>
       <transactionId>TestReserve-1710140618527873</transactionId>
       <real>1.00</real>
       <currency>EUR</currency>
       <gameId>287</gameId>
       <gameSessionId>636435601</gameSessionId>
       <contextId>0</contextId>
       <accessToken>stagestagestagestage</accessToken>
       <roundId>636435587327873000</roundId>
       <externalGameSessionId>${sessionId}</externalGameSessionId>
     </reserve>`);
    expect(response).xml.to.deep.equal(`<reserve>
        <externalTransactionId>ID</externalTransactionId>
        <real>9.00</real>
        <currency>EUR</currency>
        <statusCode>0</statusCode>
        <statusMessage>OK</statusMessage>
      </reserve>`);

    const response2 = await request('reserve', `<reserve>
     <externalId>${userId}</externalId>
     <productId>1</productId>
     <transactionId>TestReserve-1710140618527873</transactionId>
     <real>1.00</real>
     <currency>EUR</currency>
     <gameId>287</gameId>
     <gameSessionId>636435601</gameSessionId>
     <contextId>0</contextId>
     <accessToken>stagestagestagestage</accessToken>
     <roundId>636435587327873000</roundId>
     <externalGameSessionId>${sessionId}</externalGameSessionId>
   </reserve>`);

    expect(response2).xml.to.deep.equal(`<reserve>
     <externalTransactionId>ID</externalTransactionId>
     <real>9.00</real>
     <currency>EUR</currency>
     <statusCode>0</statusCode>
     <statusMessage>OK</statusMessage>
    </reserve>`);
  });

  it('Releases money twice', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('release', `<release>
     <externalId>${userId}</externalId>
     <productId>1</productId>
     <transactionId>TestRelease-1710140618537077</transactionId>
     <real>1.00</real>
     <currency>EUR</currency>
     <gameSessionId>636435602</gameSessionId>
     <contextId>0</contextId>
     <state>0</state>
     <type>0</type>
     <gameId>287</gameId>
     <accessToken>stagestagestagestage</accessToken>
     <roundId>636435587337077000</roundId>
     <jackpotGain>2.00</jackpotGain>
     <jackpotLoss>1.00</jackpotLoss>
     <freegameExternalId />
     <turnover>0</turnover>
     <freegameFinished>0</freegameFinished>
     <externalGameSessionId>${sessionId}</externalGameSessionId>
   </release>`);

    expect(response).xml.to.deep.equal(`<release>
      <externalTransactionId>ID</externalTransactionId>
      <real>11.00</real>
      <currency>EUR</currency>
      <statusCode>0</statusCode>
      <statusMessage>OK</statusMessage>
    </release>`);

    const response2 = await request('release', `<release>
      <externalId>${userId}</externalId>
      <productId>1</productId>
      <transactionId>TestRelease-1710140618537077</transactionId>
      <real>1.00</real>
      <currency>EUR</currency>
      <gameSessionId>636435602</gameSessionId>
      <contextId>0</contextId>
      <state>0</state>
      <type>0</type>
      <gameId>287</gameId>
      <accessToken>stagestagestagestage</accessToken>
      <roundId>636435587337077000</roundId>
      <jackpotGain>2.00</jackpotGain>
      <jackpotLoss>1.00</jackpotLoss>
      <freegameExternalId />
      <turnover>0</turnover>
      <freegameFinished>0</freegameFinished>
      <externalGameSessionId>${sessionId}</externalGameSessionId>
    </release>`);

    expect(response2).xml.to.deep.equal(`<release>
      <externalTransactionId>ID</externalTransactionId>
      <real>11.00</real>
      <currency>EUR</currency>
      <statusCode>0</statusCode>
      <statusMessage>OK</statusMessage>
    </release>`);
  });

  it('Gets balance', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('balance', `<balance>
      <externalId>${userId}</externalId>
      <productId>1</productId>
      <currency>EUR</currency>
      <gameId>287</gameId>
      <accessToken>stagestagestagestage</accessToken>
      <externalGameSessionId>${sessionId}</externalGameSessionId>
    </balance>`);
    expect(response).xml.to.deep.equal(`<balance>
     <real>10.00</real>
     <currency>EUR</currency>
     <statusCode>0</statusCode>
     <statusMessage>OK</statusMessage>
   </balance>`);
  });

  it('Reserved money over balance', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('reserve', `<reserve>
       <externalId>${userId}</externalId>
       <productId>1</productId>
       <transactionId>TestReserve-1710140618542382</transactionId>
       <real>15.00</real>
       <currency>EUR</currency>
       <gameId>287</gameId>
       <gameSessionId>636435603</gameSessionId>
       <contextId>0</contextId>
       <accessToken>stagestagestagestage</accessToken>
       <roundId>636435587342381000</roundId>
       <externalGameSessionId>${sessionId}</externalGameSessionId>
     </reserve>`);
    expect(response).xml.to.deep.equal(`<reserve>
     <statusCode>7</statusCode>
     <statusMessage>Insufficient balance</statusMessage>
   </reserve>`);
  });

  it('Reserved money and cancel', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('reserve', `<reserve>
       <externalId>${userId}</externalId>
       <productId>1</productId>
       <transactionId>TestReserve-1710140618542381</transactionId>
       <real>1.00</real>
       <currency>EUR</currency>
       <gameId>287</gameId>
       <gameSessionId>636435603</gameSessionId>
       <contextId>0</contextId>
       <accessToken>stagestagestagestage</accessToken>
       <roundId>636435587342381000</roundId>
       <externalGameSessionId>${sessionId}</externalGameSessionId>
     </reserve>`);
    expect(response).xml.to.deep.equal(`<reserve>
     <externalTransactionId>ID</externalTransactionId>
     <real>9.00</real>
     <currency>EUR</currency>
     <statusCode>0</statusCode>
     <statusMessage>OK</statusMessage>
   </reserve>`);

    const response2 = await request('cancelReserve', `<cancelReserve>
         <externalId>${userId}</externalId>
         <productId>1</productId>
         <transactionId>TestReserve-1710140618542381</transactionId>
         <real>1.00</real>
         <currency>EUR</currency>
         <gameSessionId>636435603</gameSessionId>
         <accessToken>stagestagestagestage</accessToken>
         <roundId>636435587342381000</roundId>
         <gameId>287</gameId>
         <externalGameSessionId>${sessionId}</externalGameSessionId>
       </cancelReserve>`);
    expect(response2).xml.to.deep.equal(`<cancelReserve>
       <externalTransactionId>ID</externalTransactionId>
       <statusCode>0</statusCode>
       <statusMessage>OK</statusMessage>
     </cancelReserve>`);

    const response3 = await request('balance', `<balance>
       <externalId>${userId}</externalId>
       <productId>1</productId>
       <currency>EUR</currency>
       <gameId>287</gameId>
       <accessToken>stagestagestagestage</accessToken>
       <externalGameSessionId>${sessionId}</externalGameSessionId>
     </balance>`);
    expect(response3).xml.to.deep.equal(`<balance>
     <real>10.00</real>
     <currency>EUR</currency>
     <statusCode>0</statusCode>
     <statusMessage>OK</statusMessage>
   </balance>`);
  });

  it('Cancels nonexisting reserve', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('cancelReserve', `<cancelReserve>
     <externalId>${userId}</externalId>
     <productId>1</productId>
     <transactionId>ShouldNotExists-1710140618549089</transactionId>
     <real>1.00</real>
     <currency>EUR</currency>
     <gameSessionId>636435604</gameSessionId>
     <accessToken>stagestagestagestage</accessToken>
     <roundId>636435587349089000</roundId>
     <gameId>287</gameId>
     <externalGameSessionId>${sessionId}</externalGameSessionId>
   </cancelReserve>`);

    expect(response).xml.to.deep.equal(`<cancelReserve>
       <externalTransactionId />
       <statusCode>0</statusCode>
       <statusMessage>OK</statusMessage>
     </cancelReserve>`);
  });

  it('authenticates with invalid token', async () => {
    const userId = `${player.brandId}_${player.id}`;
    const response = await request('balance', `<balance>
       <externalId>${userId}</externalId>
       <productId>1</productId>
       <currency>EUR</currency>
       <gameId>287</gameId>
       <accessToken>-invalid-</accessToken>
       <externalGameSessionId>${sessionId}</externalGameSessionId>
     </balance>`);
    expect(response).xml.to.deep.equal(`<balance>
     <statusCode>4</statusCode>
     <statusMessage>Wrong username</statusMessage>
   </balance>`);
  });
});
