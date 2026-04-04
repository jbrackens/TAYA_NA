/* @flow */
import type { CMoney } from 'gstech-core/modules/money-class';
import type { Player, DepositDetails } from '../common/api';

const logger = require('../common/logger');
const rewards = require('./rewards');
const landers = require('../common/landers');

const defaultReward = 'b55';

const getUserWelcomeReward = async (req: express$Request) => {
  const { user } = req;
  if (user.details.RegistrationSource != null && user.details.RegistrationSource !== '') {
    const lander = landers.get(req, user.details.RegistrationSource);
    const result = (lander != null ? lander.bonus : undefined) || defaultReward;
    logger.debug('getUserWelcomeReward', user.username, user.details.RegistrationSource, lander != null ? lander.bonus : '-', result);
    return result;
  }
  return defaultReward;
};

const register = async (user: Player, req: express$Request) => {
  logger.debug('Responders! register', user.email);
  const rewardid = await getUserWelcomeReward(req);
  logger.debug('Registration reward?', rewardid);
  if (rewardid != null && (rewardid != null ? rewardid.toLowerCase() : undefined) !== 'no_free_spins') {
    logger.debug('Crediting welcome rewards for player', user.username, rewardid);
    await rewards.addToUser([{ id: 'registration-reward', rewardid }], user);
  }
};

// eslint-disable-next-line no-unused-vars
const deposit = async (user: Player, req: express$Request, value: CMoney, tags: string[], depositDetails: DepositDetails) => {
};

// eslint-disable-next-line no-unused-vars
const login = async (user: Player, req: express$Request) => {
};

module.exports = { register, deposit, login };
