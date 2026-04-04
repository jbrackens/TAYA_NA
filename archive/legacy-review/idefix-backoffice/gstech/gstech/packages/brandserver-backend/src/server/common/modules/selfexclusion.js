/* @flow */
const _ = require('lodash');
const moment = require('moment-timezone');
const api = require('../api');
const logger = require('../logger');
const { localize } = require('./localize');
const { handleError } = require('../extensions');

const removeSelfExclusion = async (req: express$Request, exclusionKey: string): Promise<mixed> => {
  const res = await api.removeSelfExclusion(exclusionKey);
  const openTime = moment(res.exclusion.expires);
  const time = `<span class="date">${openTime
    .utcOffset(-parseInt(req.body.tz))
    .locale(req.context.languageISO)
    .format('D.M.YYYY, H:mm')}</span>`;
  const r: any = { restrictionActive: true, showRestrictionRequest: false, content: '' };
  r.content = localize(req, 'restrictions.pending', { time });
  return r;
};

const setSelfExclusion = async (req: express$Request, duration: string): Promise<{ok: boolean}> => {
  const numMinutes = parseInt(duration) * 24 * 60;
  logger.debug('Self exclusion requested by user', req.user.username, duration);
  await Promise.all([
    api.PlayerRestrictionSetSelfExlusion({
      sessionKey: req.session.SessionKey,
      isIndefinite: false,
      numMinutes,
      reason: `${duration} days self exclusion requested`,
    }),
  ]);
  return { ok: true };
};

const handleSelfExclusion = async (req: express$Request, response: { exclusion: { permanent: boolean, expires: string, limitType: string } }): Promise<any> => {
  logger.debug('User with restriction trying to log in', response);
  const r: any = _.extend({ restrictionActive: true }, response.exclusion);
  const openTime = moment(response.exclusion.expires || moment('2999-01-01'));
  const coolOffPeriod = (response.exclusion.permanent || response.exclusion.limitType === 'exclusion') ? 7 : 1;
  r.showRestrictionRequest = openTime.diff(moment(), 'days') > coolOffPeriod;

  const params = {
    time: `<span class="date">${openTime.utcOffset(-parseInt(req.body.tz)).format('D.M.YYYY, H:mm')}</span>`,
  };
  if (response.exclusion.expires !== null) {
    r.content = openTime.diff(moment(), 'days') < 400 ? localize(req, 'restrictions.pending', params) : '';
  } else {
    r.content = localize(req, 'restrictions.pending.indefinite');
  }
  logger.debug('Returning selfExclusion', r);
  return r;
};

const removeSelfexclusionHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const response = await removeSelfExclusion(req, req.body.exclusionKey);
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
}
const setSelfexclusionHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const result = await setSelfExclusion(req, req.body.duration);
    return res.json(result);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const removeSelfexclusionsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  const result = await removeSelfExclusion(req, req.params.exclusionKey);
  return res.json(result);
};

module.exports = {
  setSelfExclusion,
  removeSelfExclusion,
  handleSelfExclusion,
  removeSelfexclusionHandler,
  setSelfexclusionHandler,
  removeSelfexclusionsHandler,
};
