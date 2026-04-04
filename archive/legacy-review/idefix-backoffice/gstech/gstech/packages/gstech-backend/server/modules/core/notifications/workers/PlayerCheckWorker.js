/* @flow */
import type { Job } from 'gstech-core/modules/queue';

const logger = require('gstech-core/modules/logger');
const client = require('gstech-core/modules/clients/complianceserver-api');
const { checkIpFraud, applyMultipleSanction } = require('../../../frauds');
const { getPlayerWithDetails, addEvent } = require('../../../players');

const handleJob = async ({ data: { playerId, ipAddress } }: Job<any>) => {
  try {
    const player = await getPlayerWithDetails(playerId);
    await checkIpFraud(playerId, ipAddress);
    const sanctionCheckResult = await client.checkMultipleSanction({
      name: `${player.firstName} ${player.lastName}`,
    });
    const lists = Object.entries(sanctionCheckResult.metadata).map(
      ([key, value]) => `${key}/${String(value)}`,
    );
    await addEvent(playerId, null, 'account', 'sanctionCheck', { lists, ...sanctionCheckResult });

    if (sanctionCheckResult.matched) {
      await applyMultipleSanction(playerId, sanctionCheckResult);
    }
  } catch (err) {
    logger.error('XXX PlayerCheckWorker', { playerId, ipAddress, err });
  }
};

module.exports = { handleJob };
