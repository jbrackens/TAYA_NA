/* @flow */
import type { PlayerBlockedResult, ComplianceServerModule } from '../../types';

const client = require('./client');

const checkPlayer = async (nationalId: string): Promise<PlayerBlockedResult> => {
  const result = await client.postBlockingInfo(nationalId);
  const playerResult = {
    nationalId: result.subjectId,
    isBlocked: result.isBlocked,
  };

  return playerResult;
}; // TODO: move to api.js

const complianceModule: ComplianceServerModule = { api: { checkPlayer } };
module.exports = complianceModule;
