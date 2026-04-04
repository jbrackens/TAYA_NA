/* @flow */
import type { LegacyPlayer, Player } from "../api";

const api = require('../api');
const redis = require('../redis');
const logger = require('../logger');

const updatePlayerCache = async (player: LegacyPlayer): Promise<void> => {
  await redis.setTemporary<LegacyPlayer>('player', player.Username, player);
}

const getDetailsWithSessionKey = async (sessionKey: string): Promise<LegacyPlayer> => {
  const player = await api.PlayerGetDetails({ sessionKey });
  await updatePlayerCache(player);
  return player;
}

const getDetails = async (req: express$Request): Promise<LegacyPlayer> => {
  const player = await api.PlayerGetDetails({ sessionKey: req.session.SessionKey });
  await updatePlayerCache(player);
  return player;
};

const findPlayer = async (username: string): Promise<Player> => {
  const player = await redis.getTemporary<LegacyPlayer>('player', username);
  if (player) {
    return api.mapLegacyPlayer(player);
  }
  const player2 = await api.PlayerGetDetails({ username });
  if (player2) {
    await updatePlayerCache(player2);
    return api.mapLegacyPlayer(player2);
  }
  logger.error('Unable to find player with username', username);
  throw new Error(`Unable to find player with username ${username}`);
};


module.exports = { getDetails, getDetailsWithSessionKey, findPlayer, updatePlayerCache };
