/* @flow */
import type {
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  CreateFreeSpinsRequest,
  CreateFreeSpinsResponse,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
  GetJackpotsRequest,
  GetJackpotsResponse,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';

const _ = require('lodash');
const moment = require('moment');
const { v1: uuid } = require('uuid');
const { DateTime } = require('luxon');
const logger = require('gstech-core/modules/logger');

const { getExternalPlayerId, returnGameScript } = require('gstech-core/modules/helpers');
const { authenticate, demo } = require('./ua');
const { parseBonusCode } = require('./utils');
const oss = require('./oss');

const config = require('../../../config');

const configuration = config.providers.evoOSS;

const JACKPOTS_MAPPING = {
  // mobile/not_mobile means nothing here. Just something inherited from NETENT
  megafortune_not_mobile_sw: 'megajackpot1',
  hallofgods_mobile_sw: 'hog_large',
  godsoffortune_not_mobile_sw: 'gof_mega',
  imperialriches_not_mobile_sw: 'imperialriches_mega',
  vegasnightlife_not_mobile_sw: 'vegasnightlife_mega',
};

const returnIFrameGameScript = (url: string) => {
  const result = {
    html: `
    <!doctype html>
      <html>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"/>
      <style type="text/css">
          html,body {
            margin: 0;
            padding: 0;
            height:100%;
            width:100%;
            overflow:hidden;
          }
          iframe {
            padding: 0;
            margin: 0;
            border: none;
          }
        </style>
        <script src="https://studio.evolutiongaming.com/mobile/js/iframe.js"></script>
      </head>
      <body>
        <script>
          EvolutionGaming.init({ url: "${url}", topBar: 0 });
        </script>
      </body>
    </html>`,
  };
  return result;
};

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  logger.debug('>>> EvoOSS LAUNCHGAME', { launchGameRequest });
  const { player, parameters, game, client } = launchGameRequest;
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;
  const { forceIframe } = parameters;
  logger.debug('+++ EvoOSS LAUNCHGAME', { parameters });
  const tableId = parameters && parameters.options && parameters.options.tableId;
  if (!tableId || typeof tableId !== 'string')
    throw new Error(`Found no tableId for game: ${game.gameId || ''}`)
  const isMobile = (parameters != null && parameters.mobile) || false;
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const bankingUrl = parameters && parameters.bankingUrl;
  const response = await authenticate(
    player,
    sessionId,
    client,
    game.manufacturerGameId,
    tableId,
    isMobile,
    lobbyUrl,
    bankingUrl,
  );
  const url = `https://${configuration.hostname}${response.entry}`;
  const result = {
    ...(newSession
      ? { session: { sessionId, type: 'game', parameters: { gameId: game.gameId } } }
      : {}),
    game: forceIframe ? returnIFrameGameScript(url) : returnGameScript(url),
  };
  logger.debug('<<< EvoOSS LAUNCHGAME', { url, result });
  return result;
};

const launchDemoGame = async (
  brandId: string,
  launchDemoGameRequest: LaunchDemoGameRequest,
): any => {
  logger.debug('>>> EvoOSS LAUNCHDEMOGAME', { launchDemoGameRequest });
  const { languageId, currencyId, game, parameters } = launchDemoGameRequest;
  const { forceIframe } = parameters;
  logger.debug('+++ EvoOSS LAUNCHDEMOGAME', { parameters });
  const tableId = parameters && parameters.options && parameters.options.tableId;
  const isMobile = (parameters != null && parameters.mobile) || false;
  if (!tableId || typeof tableId !== 'string')
    throw new Error(`Found no tableId for demo game: ${game.gameId || ''}`)
  const response = await demo(languageId, currencyId, tableId, isMobile);
  const url = `https://${configuration.hostname}${response.entry}`;
  // result.game = forceIframe ? returnIFrameGameScript(url) : returnGameScript(url);
  const result = {
    game: forceIframe ? returnIFrameGameScript(url) : returnGameScript(url),
  }
  logger.debug('<<< EvoOSS LAUNCHDEMOGAME', { url, result });
  return result;
};

const creditFreeSpins = async (
  brandId: string,
  creditFreeSpinsRequest: CreditFreeSpinsRequest,
): Promise<CreditFreeSpinsResponse> => {
  logger.debug('>>> EvoOSS CREDITFREESPINS', { creditFreeSpinsRequest });

  const { player, bonusCode, id, metadata, spinType, spinValue, spinCount } =
    creditFreeSpinsRequest;

  // $FlowFixMe
  const { campaignId, tableId } = metadata;

  const { spinCount: spinCountCode, spinType: spinTypeCode } = parseBonusCode(bonusCode);
  logger.debug('+++ EvoOSS CREDITFREESPINS', { bonusCode, spinCountCode, spinTypeCode });
  const betAmount = await oss.resolveSpinValueCurrency(
    tableId,
    spinType || spinTypeCode,
    spinValue,
    player.currencyId,
  );
  const freeRoundsCount = spinCount || spinCountCode;

  const body = {
    playerId: getExternalPlayerId({ id: player.id, brandId: player.brandId }),
    currency: player.currencyId,
    settings: { freeRoundsCount, betAmount, $type: 'freeRounds' },
  };
  logger.debug('>>> EvoOSS CREDITFREESPINS', { body });
  const result = await oss.issueVoucher(campaignId, body);
  logger.debug('<<< EvoOSS CREDITFREESPINS', bonusCode, id, player.username, result);
  const {
    pk,
    lifetime: { issuedAt, expirationDuration },
  } = result;
  const expires = moment(issuedAt).add(moment.duration(expirationDuration)).toDate();
  return { ok: true, externalId: pk.voucherId, expires };
};

const createFreeSpins = async (
  createFreeSpinsRequest: CreateFreeSpinsRequest,
): Promise<CreateFreeSpinsResponse> => {
  const { bonusCode, tableId } = createFreeSpinsRequest;
  const intervalStart = new Date();
  const intervalEnd = DateTime.fromJSDate(intervalStart).plus({ years: 15 }).toJSDate();
  const {
    pk: { campaignId },
  } = await oss.createCampaign({
    title: bonusCode,
    timezone: 'Europe/Malta',
    campaignInterval: {
      start: intervalStart,
      end: intervalEnd,
    },
    tableSettings: {
      forAll: {
        tableIds: [tableId],
        $type: 'ParticularTables',
      },
      forDesktopOnly: { $type: 'Non' },
      forMobileOnly: { $type: 'Non' },
    },
    sites: { $type: 'All' },
    expirationDuration: 'P90D',
  });
  await oss.launchCampaign(campaignId);
  return { campaignId };
};

const getJackpots = async (
  brandId: BrandId,
  { games, currencies }: GetJackpotsRequest,
): Promise<GetJackpotsResponse> => {
  const evoJackpotAmounts = await oss.getJackpotAmounts();
  const evoJackpotsInMapping = _.filter(evoJackpotAmounts, ({ jackpotId }) =>
    _.values(JACKPOTS_MAPPING).includes(jackpotId),
  );
  const jackpotsResponse = _.map(evoJackpotsInMapping, (jp) => ({
    game: _.findKey(JACKPOTS_MAPPING, (v) => v === jp.jackpotId) || '',
    currencies: _.map(
      _.toPairs(_.pickBy(jp.amount, (v, k) => currencies.includes(k))),
      ([currency, amount]) => ({
        amount,
        currency,
      }),
    ),
  }));
  return _.filter(jackpotsResponse, ({ game }) => _.find(games, { manufacturerGameId: game }));
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  createFreeSpins,
  creditFreeSpins,
  getJackpots,
};

module.exports = gameProvider;
