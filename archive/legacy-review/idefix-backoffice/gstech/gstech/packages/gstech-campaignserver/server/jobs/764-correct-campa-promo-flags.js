/* @flow */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

module.exports = async () => {
  const fname = '764-correct-campa-promo-flags.json.gz';
  logger.info('+++ 764-correct-campa-promo-flags [INIT]', { fname });
  try {
    const allNotUpdated = [];
    const promoFlagsZip = fs.readFileSync(path.resolve(__dirname, fname));
    const promoFlags = JSON.parse(zlib.gunzipSync(promoFlagsZip).toString('utf-8'));
    const fileBrief = _.map(promoFlags, _.partialRight(_.omit, ['externalIds']));
    logger.info('+++ 764-correct-campa-promo-flags [LOADED]', { fileBrief });
    for (const { email, sms, count, externalIds } of promoFlags) {
      const notUpdated = externalIds;
      for (const c of _.chunk(externalIds, 1000)) {
        const updated = await pg('players')
          .whereIn('externalId', c)
          .update({ allowSMSPromotions: sms, allowEmailPromotions: email })
          .returning('externalId');
        _.pullAll(notUpdated, _.map(updated, 'externalId'));
        logger.debug(`>>> 764 ${externalIds.length - notUpdated.length}/${externalIds.length}`);
      }
      if (notUpdated.length) {
        const notUpdatedInfo = { email, sms, count, notUpdatedCount: notUpdated.length };
        logger.warn(`!!! 764-correct-campa-promo-flags [NOT UPDATED]`, { notUpdatedInfo });
        allNotUpdated.push({ notUpdated, ...notUpdatedInfo });
      } else logger.info(`+++ 764-correct-campa-promo-flags [UPDATED]`, { email, sms, count });
    }
    if (allNotUpdated.length)
      logger.warn('!!! 764-correct-campa-promo-flags [DONE:WARNINGS]', { allNotUpdated });
    else logger.info('+++ 764-correct-campa-promo-flags [DONE:SUCCESS]');
  } catch (error) {
    logger.error('XXX 764-correct-campa-promo-flags [FAILED]', { error, msg: error.message });
  }
};
