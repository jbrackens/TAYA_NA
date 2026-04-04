/* @flow */
import type { Journey } from '../common/api';

const logger = require('gstech-core/modules/logger');

const client = require('gstech-core/modules/clients/rewardserver-api');
const configuration = require('../common/configuration');

const brandId = configuration.shortBrandId();

const shopBalance = async (
  journey: Journey,
): Promise<{ balance: number, progress: number, theme: 'default' | 'double', target: number }> => {
  try {
    const r = await client.getPlayerProgresses(brandId, journey.req.context.playerId);
    const { progresses } = r;
    const balance = progresses.find((p) => p.rewardType === 'markka') || {
      ledgers: 0,
      progress: 0,
      rewards: [],
    };
    const result = {
      balance: balance.ledgers,
      progress: balance.progress,
      target: (balance.rewards.length > 0 && balance.rewards[0].quantity) || 0,
      theme: balance.multiplier === 2 ? 'double' : 'default',
    };
    logger.debug('shopBalance', r, balance, result);
    return result;
  } catch (e) {
    logger.error('shopBalance failed', e);
    // $FlowFixMe[prop-missing]
    return {};
  }
};

module.exports = { shopBalance };
