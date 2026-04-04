/* @flow */
import type { Player } from 'gstech-core/modules/types/player'

const moment = require('moment-timezone');
const errorCodes = require('gstech-core/modules/errors/error-codes');

// enables 72h block for not verified german players  
const enabled = false;

const checkGameStart = async (player: Player): Promise<any> | Promise<boolean> => {
  if (enabled && player.countryId === 'DE' && !player.verified) {
    if (moment() > moment(player.createdAt).add(72, 'hours')) {
      return Promise.reject({ error: errorCodes.GAME_PLAY_BLOCKED });
    }
  }

  return true;
};

const checkDeposit = async (player: Player): Promise<any> | Promise<boolean> => {
  if (enabled && player.countryId === 'DE' && !player.verified) {
    if (moment() > moment(player.createdAt).add(72, 'hours')) {
      return Promise.reject({ error: errorCodes.DEPOSITS_NOT_ALLOWED });
    }
  }

  return true;
};

module.exports = {
  checkGameStart,
  checkDeposit,
}