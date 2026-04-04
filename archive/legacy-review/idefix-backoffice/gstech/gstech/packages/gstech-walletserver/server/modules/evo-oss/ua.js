/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type { ClientInfo } from 'gstech-core/modules/clients/paymentserver-api-types';
import type { AuthenticationResponse } from './types';

const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');

const config = require('../../../config');

const configuration = config.providers.evoOSS;

const authenticate = async (
  player: Player,
  sessionId: string,
  client: ClientInfo,
  manufacturerGameId: string,
  tableId: string,
  isMobile: boolean,
  lobbyUrl: string,
  bankingUrl: string,
): Promise<AuthenticationResponse> => {
  const uniqueRequestId = uuid();
  try {
    logger.debug('+++ EVOOSS AUTH', {
      tableId,
      uniqueRequestId,
      player,
      sessionId,
      client,
      manufacturerGameId,
      isMobile,
      lobbyUrl,
      bankingUrl,
    });
    const body = {
      uuid: uniqueRequestId,
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
    const url = `https://${hostname}/ua/v1/${casino.key}/${api.token}`;
    logger.debug('>>> EvoOSS AUTH request', { url, body });
    const { data: response } = await axios.request({ method: 'POST', url, data: body });
    logger.debug('<<< EvoOSS AUTH response', { response });
    return { entry: response.entry, entryEmbedded: response.entryEmbedded };
  } catch (e) {
    logger.error('XXX EvoOSS AUTH error', { uniqueRequestId, code: e.code, error: e.error });
    throw e;
  }
};

const demo = async (
  languageId: string,
  currencyId: string,
  tableId: string,
  isMobile: boolean,
): Promise<AuthenticationResponse> => {
  const uniqueRequestId = uuid();
  try {
    logger.debug('+++ EVOOSS DEMO', {
      languageId,
      currencyId,
      tableId,
      isMobile,
    });
    const body = {
      uuid: uniqueRequestId,
      demo: {
        language: languageId,
        currency: currencyId,
      },
      config: {
        game: {
          playMode: 'demo',
          table: {
            id: tableId,
          },
        },
        channel: {
          wrapped: isMobile,
        },
      },
    };
    const { hostname, casino, api } = configuration;
    const url = `https://${hostname}/ua/v1/${casino.key}/${api.token}`;
    logger.debug('>>> EvoOSS DEMO request', { url, body });
    const { data: response } = await axios.request({ method: 'POST', url, data: body });
    logger.debug('<<< EvoOSS DEMO response', { response });
    return { entry: response.entry, entryEmbedded: response.entryEmbedded };
  } catch (e) {
    logger.error('XXX EvoOSS DEMO error', { uniqueRequestId, code: e.code, error: e.error });
    throw e;
  }
};

module.exports = { authenticate, demo };
