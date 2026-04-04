/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type { NetentConfig, ExtendedConfig } from '../../types';

const first = require('lodash/fp/first');
const find = require('lodash/find');
const includes = require('lodash/includes');

const api = require('gstech-core/modules/clients/backend-wallet-api');
const { xmlEncode, soapRequest } = require('gstech-core/modules/soap');
const configuration = require('../../../config').providers.netent;

const defaultConfiguration: ExtendedConfig<NetentConfig> = first(configuration);

const getConfiguration = ({
  brandId, // eslint-disable-line no-unused-vars
  currencyId, // eslint-disable-line no-unused-vars
  countryId,
}: {
  brandId: BrandId,
  currencyId: string,
  countryId: string,
  ...
}): ExtendedConfig<NetentConfig> => {
  const config =
    find(configuration, (c) => includes(c.countryId, countryId)) ||
    find(configuration, (c) => c.countryId == null);
  if (config === null || config === undefined) {
    throw Error(`No configuration found for country '${countryId}'`);
  }

  return config;
};

const soap = (conf: { endpoint: string, ... }) => soapRequest(conf.endpoint);

const userName = (player: Player): string => {
  const conf = getConfiguration(player);
  if (player.id >= 3000000) {
    if (conf.legacyIdFormat) {
      return player.username;
    }
    return `${player.brandId}_${player.id}`;
  }
  return `${player.brandId}_${player.id - conf.playerIdMapping[player.brandId]}`;
};

const ping = async (): Promise<any> => soap(defaultConfiguration)(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://casinomodule.com/api">
   <soapenv:Header/>
   <soapenv:Body>
      <api:ping/>
   </soapenv:Body>
</soapenv:Envelope>`);

const getGameInfo = async (gameId: string, languageId: string): Promise<{...}> => {
  const result = await soap(defaultConfiguration)(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://casinomodule.com/api">
     <soapenv:Header/>
     <soapenv:Body>
        <api:getGameInfo>
           <gameId>${gameId}</gameId>
           <lang>${languageId}</lang>
           <merchantId>${defaultConfiguration.brands[defaultConfiguration.defaultBrand].merchantId}</merchantId>
           <merchantPassword>${defaultConfiguration.brands[defaultConfiguration.defaultBrand].merchantPassword}</merchantPassword>
        </api:getGameInfo>
     </soapenv:Body>
    </soapenv:Envelope>`);
  const parameters: { [any]: any } = {};
  const items = result.getGameInfoResponse[0].getGameInfoReturn;
  items.forEach((i, idx) => {
    if (idx % 2 === 0) {
      parameters[items[idx]] = items[idx + 1];
    }
  });
  return parameters;
};

const loginUserDetailed = async (player: Player, mobile: boolean): Promise<string> => {
  const conf = getConfiguration(player);
  const result = await soap(
    conf,
  )(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://casinomodule.com/api">
     <soapenv:Header/>
     <soapenv:Body>
        <api:loginUserDetailed>
           <userName>${xmlEncode(userName(player))}</userName>
           <extra>DisplayName</extra>
           <extra>${xmlEncode(api.nickName(player))}</extra>
           <extra>AffiliateCode</extra>
           <extra>${player.brandId}_</extra>
           <extra>Country</extra>
           <extra>${player.countryId}</extra>
           <extra>Channel</extra>
           <extra>${mobile ? 'mobg' : 'bbg'}</extra>
           <merchantId>${conf.brands[player.brandId].merchantId}</merchantId>
           <merchantPassword>${conf.brands[player.brandId].merchantPassword}</merchantPassword>
           <currencyISOCode>${player.currencyId}</currencyISOCode>
        </api:loginUserDetailed>
     </soapenv:Body>
  </soapenv:Envelope>`);
  const sessionId = result.loginUserDetailedResponse[0].loginUserDetailedReturn[0];
  return sessionId;
};

const logoutUser = async (player: Player, sessionId: string) => {
  const conf = getConfiguration(player);
  await soap(conf)(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://casinomodule.com/api">
     <soapenv:Header/>
     <soapenv:Body>
        <api:logoutUser>
           <sessionId>${xmlEncode(sessionId)}</sessionId>
           <merchantId>${conf.brands[conf.defaultBrand].merchantId}</merchantId>
           <merchantPassword>${conf.brands[conf.defaultBrand].merchantPassword}</merchantPassword>
        </api:logoutUser>
     </soapenv:Body>
  </soapenv:Envelope>`);
};

const isUserSessionAlive = async (player: Player, sessionId: string): Promise<boolean> => {
  const conf = getConfiguration(player);
  const result = await soap(conf)(`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://casinomodule.com/api">
     <soapenv:Header/>
     <soapenv:Body>
        <api:isUserSessionAlive>
          <sessionId>${xmlEncode(sessionId)}</sessionId>
          <merchantId>${conf.brands[conf.defaultBrand].merchantId}</merchantId>
          <merchantPassword>${conf.brands[conf.defaultBrand].merchantPassword}</merchantPassword>
        </api:isUserSessionAlive>
     </soapenv:Body>
  </soapenv:Envelope>`);
  return result.isUserSessionAliveResponse[0].isUserSessionAliveReturn[0] === 'true';
};

module.exports = {
  userName,
  loginUserDetailed,
  getGameInfo,
  logoutUser,
  ping,
  isUserSessionAlive,
  getConfiguration,
  defaultConfiguration,
};
