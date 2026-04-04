/* @flow */
import type {
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';
import type { RelaxBetAmounts, RelaxAddFreeRoundsRequest } from './types';

const gamesClient = require('gstech-core/modules/clients/backend-games-api');
const logger = require('gstech-core/modules/logger');
const joi = require('gstech-core/modules/joi');
const querystring = require('querystring');
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const { returnGameScript, getExternalPlayerId } = require('gstech-core/modules/helpers');
const config = require('../../../config');
const { MANUFACTURER_ID, DEFAULT_JURISDICTION } = require('./constants');
const partnerApi = require('./partnerapi');

const configuration = config.providers.relax;

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, parameters, game } = launchGameRequest;
  const { manufacturerGameId: gameCode } = game;

  const lobbyUrl = parameters && parameters.lobbyUrl;
  const launcherUri = configuration.api.gameLauncherUri;

  const params = {
    lang: player.languageId,
    ticket: sessionId,
    partnerid: configuration.api.partnerId,
    moneymode: 'real',
    gameid: gameCode,
    partner: 'eeg',
    channel: parameters.mobile ? 'mobile' : 'web',
    jurisdiction: DEFAULT_JURISDICTION,
    currency: player.currencyId,
    homeurl: lobbyUrl,
  };

  const fullUri = `${launcherUri}?${querystring.stringify(params)}`;
  const result = {
    ...(newSession
      ? {
          session: {
            sessionId,
            parameters: { expires: moment().add(20, 'minutes') },
          },
        }
      : {}),
    game: returnGameScript(fullUri),
  };

  logger.debug('<<< RLX launchGame ', { result });
  return result;
};

const launchDemoGame = async (
  brandId: string,
  launchDemoGameRequest: LaunchDemoGameRequest,
): Promise<DemoGameLaunchInfo> => {
  const { parameters, game, languageId, currencyId } = launchDemoGameRequest;
  const { manufacturerGameId: gameCode } = game;

  const lobbyUrl = parameters && parameters.lobbyUrl;
  const launcherUri = configuration.api.gameLauncherUri;

  const params = {
    lang: languageId,
    partnerid: configuration.api.partnerId,
    moneymode: 'fun',
    gameid: gameCode,
    partner: 'eeg',
    channel: parameters.mobile ? 'mobile' : 'web',
    jurisdiction: DEFAULT_JURISDICTION,
    currency: currencyId,
    homeurl: lobbyUrl,
  };

  const fullUri = `${launcherUri}?${querystring.stringify(params)}`;
  const result = {
    game: returnGameScript(fullUri),
  }
  logger.debug('<<< RLX launchDemoGame ', { result });
  return result;
};

const gamesArraySchema = joi.array().min(1);

// BonusCode expecting to be in format BrandId:Name:SpinCount:SpinValue
// All games at Request "games" array
const creditFreeSpins = async (
  brandId: string,
  creditFreeSpinsRequest: CreditFreeSpinsRequest,
): Promise<CreditFreeSpinsResponse> => {
  const { player, bonusCode, id, games, spinCount, spinValue } = creditFreeSpinsRequest;

  const { error } =  gamesArraySchema.validate(games);
  if (error) {
    logger.warn('!!! RLX Empty Games list at FreeSpins request');
    throw new Error('Empty Games list at FreeSpins request');
  }

  if (bonusCode.split(':').length !== 4)
    logger.warn(`!!! RLX creditFreeSpins: bonusCode '${bonusCode}' has invalid format`);

  const externalId = getExternalPlayerId(player);
  const parts = bonusCode.split(':');

  logger.debug('>>> RLX creditFreeSpins', { bonusCode, id, externalId, games, player });

  const mappedGamesWithParameters = await Promise.all(
    games.map(async ({ manufacturerGameId }): Promise<{ gameId: string, parameters: any }> => {
      const gameData = await gamesClient.getGame(`${MANUFACTURER_ID}_${manufacturerGameId}`);
      return { gameId: manufacturerGameId, parameters: gameData.parameters || {} };
    }),
  );

  const gamesMissingParameters = mappedGamesWithParameters.filter((x) => !x.parameters?.betAmounts);

  if (gamesMissingParameters.length > 0) {
    logger.error('XXX RLX creditFreeSpins', { gamesMissingParameters });
    throw new Error('Some of Games has no betAmounts!');
  }

  const effectiveSpinCount = spinCount || +parts[3];
  const effectiveSpinValue = spinValue || +parts[4];

  for (const { gameId, parameters } of mappedGamesWithParameters) {
    const { betAmounts } = (parameters: RelaxBetAmounts);

    logger.debug('+++ RLX creditFreeSpins', { gameId, betAmounts });

    const closestSpinValue = betAmounts.reduce((a, b) =>
      Math.abs(b - effectiveSpinValue) < Math.abs(a - effectiveSpinValue) ? b : a,
    );

    const addFSRequest: RelaxAddFreeRoundsRequest = {
      txid: uuid(),
      remoteusername: getExternalPlayerId(player),
      gameid: gameId,
      amount: effectiveSpinCount,
      freespinvalue: closestSpinValue,
      promocode: bonusCode,
    };

    logger.debug('+++ RLX creditFreeSpins', { addFSRequest });

    const result = await partnerApi.addFreeRounds(addFSRequest);

    logger.debug('<<< RLX creditFreeSpins', { result });
  }

  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
