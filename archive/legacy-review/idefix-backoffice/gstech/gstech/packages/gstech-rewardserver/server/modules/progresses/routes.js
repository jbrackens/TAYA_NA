/* @flow */
import type { GetPlayerProgressesResponse } from 'gstech-core/modules/clients/rewardserver-api-types';

const validate = require('gstech-core/modules/validate');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const _ = require('lodash');

const { getRewardTypeGroup } = require('../reward-definitions/utils');
const { initializeAndReturnPlayerProgresses } = require('./Progresses');
const { getPlayerLedgersCount } = require('../ledgers/Ledgers');

const getPlayerProgress = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const playerId: Id = validate(req.query.playerId, joi.number().required());
    const includeBalances = validate(req.query.includeBalances, joi.boolean().default(false));

    const result = await pg.transaction(async (tx) => {
      const progresses = await initializeAndReturnPlayerProgresses(tx, req.brandId, playerId);
      const ledgersCount = await getPlayerLedgersCount(tx, playerId);

      const rewardDefinitionIds = _.uniq([
        ...progresses.map(({ rewardDefinitionId }) => rewardDefinitionId),
        ...includeBalances ? ledgersCount.map(({ rewardDefinitionId }) => rewardDefinitionId) : []
      ]);
      return rewardDefinitionIds.map((rewardDefinitionId) => {
        const progress = progresses.find((el) => el.rewardDefinitionId === rewardDefinitionId);
        const ledgerCount = ledgersCount.find((el) => el.rewardDefinitionId === rewardDefinitionId);
        const rewardType = (progress && progress.rewardType) || (ledgerCount && ledgerCount.rewardType) || '';
        const groupId = getRewardTypeGroup(req.brandId, rewardType);
        return { ledgers: ledgerCount ? ledgerCount.count : 0, ...progress, groupId, rewardType, rewardDefinitionId };
      });
    });
    const response: DataResponse<GetPlayerProgressesResponse> = { data: { progresses: result } };
    return res.json(response);
  } catch (e) {
    logger.error('getPlayerProgresses error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getPlayerProgress,
};
