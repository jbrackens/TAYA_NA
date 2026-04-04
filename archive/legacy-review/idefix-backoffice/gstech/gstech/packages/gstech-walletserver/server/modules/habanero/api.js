/* @flow */
import type {
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const find = require('lodash/find');
const HabaneroGame = require('./HabaneroGame');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  let sessionId;
  const ticket = find(launchGameRequest.sessions, s => s.type === 'ticket');
  if (ticket == null) sessionId = uuid();
  else sessionId = ticket.sessionId;

  const result = {
    ...(ticket == null
      ? {
          session: {
            sessionId,
            type: 'ticket',
          },
        }
      : {}),
    game: await HabaneroGame.launchGame(
      launchGameRequest.player.brandId,
      launchGameRequest.game.manufacturerGameId,
      sessionId,
      launchGameRequest.player.languageId,
      launchGameRequest.parameters,
    ),
  };
  return result;
};

const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const g = await HabaneroGame.launchDemoGame(brandId, launchDemoGameRequest.game.manufacturerGameId, launchDemoGameRequest.languageId, launchDemoGameRequest.currencyId, launchDemoGameRequest.parameters);
  return { game: g };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
};

module.exports = gameProvider;
