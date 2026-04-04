/* @flow */

import type { GetGamesResponse, GetGameManufacturerResponse } from './backend-api-types';
import type { GameManufacturersResponse } from './backend-payment-api';
import type { GameWithParameters } from '../types/backend';

const config = require('../config');
const request = require('../request')('backend games api', config.api.backend.url);

const doReq = (brandId: BrandId, method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens[brandId];
  return request(method, `/api/${brandId}/v1/${path}`, body, { 'X-Token': token });
};

const getGames = async (brandId: BrandId): Promise<GetGamesResponse> =>
  doReq(brandId, 'GET', 'game');

const getGame = async (gameId: string): Promise<GameWithParameters> =>
  doReq('LD', 'GET', `game/${gameId}`);

const getGameManufacturer = async (
  gameManufacturerId: string,
): Promise<GetGameManufacturerResponse> =>
  doReq('LD', 'GET', `game-manufacturers/${gameManufacturerId}`);

const getGameManufacturers = async (countryId?: CountryId): Promise<GameManufacturersResponse> =>
  doReq('LD', 'GET', 'game-manufacturers', { countryId });

module.exports = {
  getGames,
  getGame,
  getGameManufacturer,
  getGameManufacturers,
};
