/* @flow */
import type { CreditFreeSpinsResponse } from 'gstech-core/modules/clients/walletserver-api-types';
import type { Player } from 'gstech-core/modules/types/player';

const { axios } = require('gstech-core/modules/axios');
const moment = require('moment-timezone');
const shortid = require('shortid');
const { parseString, processors } = require('xml2js');
const { promisify } = require('util');
const crypto = require('crypto');
const logger = require('gstech-core/modules/logger');

const parse = promisify(parseString);
const md5 = (text: string) => crypto.createHash('md5').update(text).digest('hex');

const { getConfiguration, getDefaultConfiguration } = require('../config');

const addFreegameOffers = (
  userId: string,
  requestId: string,
  triggerId: string,
  gameIdList: Array<string>,
) => `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://playngo.com/v1" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
<soapenv:Header/>
<soapenv:Body>
   <v1:AddFreegameOffers>
      <v1:UserId>${userId}</v1:UserId>
      <v1:RequestId>${md5([requestId, userId].join('_'))}</v1:RequestId>
      <v1:TriggerId>${triggerId}</v1:TriggerId>
      <v1:AllGamesVariants>1</v1:AllGamesVariants>
      <v1:GameIdList>
        ${gameIdList.map((item) => `<arr:int>${item}</arr:int>`).join('')}
      </v1:GameIdList>
   </v1:AddFreegameOffers>
</soapenv:Body>
</soapenv:Envelope>`;

const addFreegameOffers2 = (
  userId: string,
  requestId: string,
  lines: string,
  coins: string,
  denomination: string,
  rounds: string,
  gameIdList: Array<string>,
) =>
  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://playngo.com/v1" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
    <soapenv:Header/>
    <soapenv:Body>
       <v1:AddFreegameOffers>
          <v1:UserId>${userId}</v1:UserId>
          <v1:Lines>${lines}</v1:Lines>
          <v1:Coins>${coins}</v1:Coins>
          <v1:Denomination>${denomination}</v1:Denomination>
          <v1:Rounds>${rounds}</v1:Rounds>
          <v1:ExpireTime>${moment().add(7, 'days').format('YYYY-MM-DD')}T00:00:00</v1:ExpireTime>
          <v1:RequestId>${md5([requestId, userId].join('_'))}</v1:RequestId>
          <v1:AllGamesVariants>1</v1:AllGamesVariants>
          <v1:GameIdList>
            ${gameIdList.map((item) => `<arr:int>${item}</arr:int>`).join('')}
          </v1:GameIdList>
       </v1:AddFreegameOffers>
    </soapenv:Body>
    </soapenv:Envelope>`;

// eslint-disable-next-line no-promise-executor-return
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const soap = async (action: string, body: string, playngoConfiguration: any) => {
  const { auth } = playngoConfiguration;
  const { data: resp } = await axios.request({
    method: 'POST',
    url: playngoConfiguration.endpoint,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"http://playngo.com/v1/CasinoGameTPService/${action}"`,
    },
    data: body,
    auth: {
      username: auth.user,
      password: auth.password,
    },
    responseType: 'text',
  });
  return resp;
};

const creditFreeSpins = async (
  user: Player,
  brandId: BrandId,
  gameList: {
    manufacturerGameId: string, mobileGame: boolean
  }[],
  promotionCode: string,
  id: string = promotionCode,
): Promise<CreditFreeSpinsResponse> => {
  const resid = shortid.generate();
  const newGames = gameList.map((g) => g.manufacturerGameId);
  const [triggerId, ...oldGames] = Array.from(promotionCode.split(','));
  const games = oldGames.length > 0 ? oldGames : newGames;
  const playngoConfiguration = getConfiguration(user).api;
  const parts = triggerId.split('|');
  const userId = `${user.brandId}_${user.id}`;
  let body;
  if (parts.length === 4) {
    const [lines, coins, denomination, rounds] = parts;
    body = addFreegameOffers2(userId, id, lines, coins, denomination, rounds, games);
  } else {
    body = addFreegameOffers(userId, id, triggerId, games);
  }
  logger.debug('creditFreeSpins', resid, { triggerId, games, body });

  const resp = await soap('AddFreegameOffers', body, playngoConfiguration);
  logger.debug('PlayNGo credited0', resid, resp);
  await timeout(4000);
  return { ok: true };
};

const getLeaderBoard = async (brandId: string, achievement: string, startDate: Date = moment().add(-1, 'month').toDate(), endDate: Date = moment().add(1, 'days').toDate(), items: number = 1000): Promise<any> | Promise<Array<any>> => {
  try {
    const playngoConfiguration = getDefaultConfiguration().api;
    const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://playngo.com/v1">
       <soapenv:Header/>
       <soapenv:Body>
          <v1:GetAchievementSummary>
             <v1:FromDate>${moment(startDate).format('YYYY-MM-DD')}</v1:FromDate>
             <v1:ToDate>${moment(endDate).format('YYYY-MM-DD')}</v1:ToDate>
             <v1:AchievementName>${achievement}</v1:AchievementName>
             <v1:BrandId>${brandId}</v1:BrandId>
             <v1:Take>${items}</v1:Take>
          </v1:GetAchievementSummary>
       </soapenv:Body>
    </soapenv:Envelope>`;
    logger.debug('getLeaderboard png', body);
    const resp = await soap('GetAchievementSummary', body, playngoConfiguration);
    logger.debug('getLeaderboard png response', resp);
    const x = await parse(resp, { attrNameProcessors: [processors.stripPrefix], tagNameProcessors: [processors.stripPrefix] });
    logger.debug('getLeaderboard png response2', JSON.stringify(x));
    const results = x.Envelope.Body[0].GetAchievementSummaryResponse[0].AchievementSummary[0].AchievementsSummary;
    if (results == null) {
      return [];
    }
    return results.map(row => ({
      UserName: row.ExternalId[0],
      Win: Number(row.Points[0]),
      Name: row.Nickname[0],
    }));
  } catch (e) {
    logger.error('getLeaderboard failed', e);
    return [];
  }
};

module.exports = { creditFreeSpins, getLeaderBoard };
