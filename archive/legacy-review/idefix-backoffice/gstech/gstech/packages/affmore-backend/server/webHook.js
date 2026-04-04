/* eslint-disable guard-for-in */
// @flow
import type { CallbackTrigger, CallbackUniqueKey } from '../types/repository/callbacks';
import type { Player } from './modules/admin/affiliates/players/repository';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const callbacksRepository = require('./modules/admin/affiliates/callbacks/repository');
const linksRepository = require('./modules/admin/affiliates/links/repository');

const parameters = {
  rid: (url: string, { referralId }: { referralId: ?string }) =>
    url.replace(/{rid}/g, referralId != null ? referralId : ''), // TODO: missing ?? operator
  uid: (url: string, { playerId }: { playerId: ?string }) =>
    url.replace(/{uid}/g, playerId != null ? playerId : ''),
  linkid: (url: string, { linkId }: { linkId: ?string }) =>
    url.replace(/{linkid}/g, linkId != null ? linkId : ''),
  segment: (url: string, { segment }: { segment: ?string }) =>
    url.replace(/{segment}/g, segment != null ? segment : ''),
};

const handleCallback = async (pg: Knex, player: Player, trigger: CallbackTrigger): Promise<boolean> => {
  logger.debug('handleCallback. handling callback start', { player, trigger });

  const { id: playerId, affiliateId, brandId, linkId } = player;
  const callbackKey: CallbackUniqueKey = {
    affiliateId,
    brandId,
    linkId,
    trigger,
  };

  if (!player.clickId) {
    logger.debug('handleCallback. player has no clickId', { playerId });
    return false;
  }

  const click = await linksRepository.getClickById(pg, player.clickId);
  const callback = await callbacksRepository.findCallback(pg, callbackKey);

  logger.debug('handleCallback. callback found', { playerId, click, callback });

  if (callback && callback.enabled) {
    const callbackLog = await callbacksRepository.findCallbackLog(pg, callback.id, player.id);
    if (callbackLog) {
      logger.debug('handleCallback. callback logs for this player exists.', { playerId, callbackLog });
      return true;
    }

    const { id: callbackId, method, url } = callback;

    let callbackUrl = url;
    for (const parameter in parameters) {
      // $FlowFixMe[invalid-computed-prop]
      callbackUrl = parameters[parameter](callbackUrl, { ...click, playerId });
    }

    logger.debug('handleCallback. processing callback...', { playerId, callbackKey, callbackUrl, method, trigger });
    try {
      const { data: callbackResponse } = await axios.request({ url: callbackUrl, method });

      const callbackLogDraft = { callbackId, playerId, status: 'SUCCESS', callbackUrl, callbackResponse: JSON.stringify(callbackResponse) };
      logger.debug('handleCallback. callback response obtained', { callbackLogDraft, callbackKey, callbackResponse});
      await callbacksRepository.createCallbackLog(pg, callbackLogDraft);

      logger.debug('handleCallback. callback completed.', { playerId, callbackKey, callbackResponse });
      return true;
    } catch (e) {
      const callbackLogDraft = { callbackId, playerId, status: 'FAILED', callbackUrl, callbackResponse: JSON.stringify(e.message) };
      logger.debug('handleCallback. callback failed.', { callbackLogDraft, callbackKey, e });
      await callbacksRepository.createCallbackLog(pg, callbackLogDraft);
    }
  }

  return false;
};

module.exports = {
  handleCallback,
};
