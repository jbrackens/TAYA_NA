/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type { PlayerWithBalance } from 'gstech-core/modules/clients/backend-wallet-api';

const { axios } = require('gstech-core/modules/axios');
const crypto = require('crypto');

const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const config = require('../../../config');
const { getJurisdiction } = require('../jurisdiction');

const configuration = config.providers.booming;

const generateSignature = (path: string, body: Object, secret: string, nonce: number): string => {
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const signature = crypto.createHmac('sha512', secret).update(`${path}${nonce}${bodyHash}`).digest('hex');

  return signature;
};

const getBrandConfiguration = (player: ?Player | PlayerWithBalance, brandId: BrandId): { key: string, secret: string, } => {
  if (!player) return configuration.api.brands[brandId];

  const c: any = getJurisdiction(player) === 'GNRS' ? configuration.api.germanBrands : configuration.api.brands;
  const b = c[player.brandId];

  if (!b) throw new Error(`Booming games are no configured for brand ${player.brandId} in ${player.countryId}`);
  return b;
}

const authenticate = async (player: ?Player, brandId: BrandId, balance: ?Money, currencyId: ?string, languageId: ?string, gameId: string, manufacturerGameId: string, isMobile: boolean, isDemo: boolean, lobbyUrl: string, bankingUrl: ?string): Promise<{play_url: any, session_id: any}> => {
  const body = {
    operator_data: gameId,
    game_id: manufacturerGameId,
    balance: balance != null && money.asFloat(balance),
    locale: languageId != null && languageId,
    variant: isMobile ? 'mobile' : 'desktop',
    currency: currencyId != null && currencyId,
    player_id: player ? getExternalPlayerId({ id: player.id, brandId: player.brandId }) : '',
    callback: configuration.callbackUrl,
    rollback_callback: configuration.rollback_callback,
    ...(isMobile ? { exit: lobbyUrl, cashier: bankingUrl } : {}),
    demo: isDemo,
  };

  logger.debug('BoomingAPI.authenticate', body);

  const nonce = new Date().getTime();

  const { secret, key } = getBrandConfiguration(player, brandId);

  const signature = generateSignature('/v2/session', body, secret, nonce);
  const headers = {
    'X-Bg-Api-Key': key,
    'X-Bg-Nonce': nonce,
    'X-Bg-Signature': signature,
  };

  logger.debug('Booming Session request', { headers, body });
  try {
    const { data: response } = await axios.request({
      method: 'POST',
      url: `${configuration.api.url}/v2/session`,
      data: body,
      headers,
    });
    logger.debug('Booming Session response', { response });
    return { session_id: response.session_id, play_url: response.play_url };
  } catch (e) {
    logger.error('Booming authentication failed', e);
    throw e;
  }
};

module.exports = {
  generateSignature,
  getBrandConfiguration,
  authenticate,
};
