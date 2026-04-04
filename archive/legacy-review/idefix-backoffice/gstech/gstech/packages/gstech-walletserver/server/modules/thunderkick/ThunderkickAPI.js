/* @flow */
const { axios } = require('gstech-core/modules/axios');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.thunderkick;

const register = async (player: {
  brandId: BrandId,
  id: Id,
  currencyId: string,
  firstName: string,
  lastName: string,
  ...
}): Promise<any> => {
  const body = {
    userName: `${player.brandId}_${player.id}`,
    password: 'topSecret',
    currencyCode: player.currencyId,
    affiliate: player.brandId,
    displayName: api.nickName(player),
    externalReference: `${player.brandId}_${player.id}`,
  };
  logger.debug('Register player', body);
  const { data: res } = await axios.request({
    method: 'POST',
    url: `https://${configuration.apiServer}/casino/3013/player/register`,
    auth: {
      username: configuration.apiServerUser,
      password: configuration.apiServerPass,
    },
    data: body,
  });
  logger.debug('Register done', res);
  const { playerId } = res;
  return playerId;
};

const login = async (player: { brandId: BrandId, id: Id, ... }, sessionId: string): Promise<any> => {
  const {
    data: { playerSessionToken },
  } = await axios.request({
    method: 'POST',
    url: `https://${configuration.apiServer}/casino/3013/player/session/login`,
    auth: {
      username: configuration.apiServerUser,
      password: configuration.apiServerPass,
    },
    data: {
      userName: `${player.brandId}_${player.id}`,
      password: 'topSecret',
      operatorSessionToken: sessionId,
    },
  });
  return playerSessionToken;
};

const logout = async (playerSessionToken: string): Promise<string> => {
  await axios.request({
    method: 'DELETE',
    url: `https://${configuration.apiServer}/casino/3013/player/session/logout/${playerSessionToken}`,
    auth: {
      username: configuration.apiServerUser,
      password: configuration.apiServerPass,
    },
  });
  return playerSessionToken;
};

module.exports = {
  register,
  login,
  logout,
};
