/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type { ClientInfo } from 'gstech-core/modules/clients/paymentserver-api-types';

const { axios } = require('gstech-core/modules/axios');
const { v1: uuid } = require('uuid');
const logger = require('gstech-core/modules/logger');
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');
const config = require('../../../config');

const configuration = config.providers.evolution;

const authenticate = async (player: Player, sessionId: string, client: ClientInfo, manufacturerGameId: string, tableId: string, isMobile: boolean, lobbyUrl: string, bankingUrl: string): Promise<{entry: any, entryEmbedded: any}> => {
  const body = {
    uuid: uuid(),
    player: {
      id: getExternalPlayerId({ id: player.id, brandId: player.brandId }),
      update: true,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: nickName(player),
      country: player.countryId,
      language: player.languageId,
      currency: player.currencyId,
      session: {
        id: sessionId,
        ip: client.ipAddress,
      },
    },
    config: {
      brand: {
        id: '1',
        skin: '1',
      },
      game: {
        category: manufacturerGameId,
        interface: 'view1',
        table: tableId && {
          id: tableId,
        },
      },
      channel: {
        wrapped: isMobile,
        mobile: isMobile,
      },
      urls: {
        cashier: bankingUrl,
        lobby: lobbyUrl,
      },
    },
  };

  const { hostname, casino, api } = configuration;
  logger.debug('Evolution AUTH', body);
  const { data: response } = await axios.request({
    method: 'POST',
    url: `https://${hostname}/ua/v1/${casino.key}/${api.token}`,
    data: body,
  });
  logger.debug('Evolution AUTH response', response);
  return { entry: response.entry, entryEmbedded: response.entryEmbedded };
};

module.exports = {
  authenticate,
};
