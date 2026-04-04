/* @flow */
require('flow-remove-types/register');

const { sleep } = require('gstech-core/modules/utils');
const logger = require('gstech-core/modules/logger');
const { addTag } = require('../server/modules/players/Player');

(async () => {
  const campaignAbuserIds = require('./assets/13-10-2022-campaign-abusers.json');

  let progress = 0;

  logger.info('Campaign abusers tagging has started ...');

  const failedCampaignAbusers = [];

  for (let index = 0; index < campaignAbuserIds.length; index += 1) {
    await addTag(campaignAbuserIds[index], 'campaign-abuser').catch((err) =>
      failedCampaignAbusers.push({ campaignAbuserId: campaignAbuserIds[index], error: err }),
    );

    await sleep(1000);

    const newProgress = parseInt(((index + 1) * 100) / campaignAbuserIds.length, 10);

    if (newProgress > progress + 10) {
      progress = newProgress;

      logger.info(`Completed ${index + 1} of ${campaignAbuserIds.length} (${progress}%)`);
    }
  }
  logger.info('Campaign abusers tagging finished!');

  if (failedCampaignAbusers.length) {
    logger.error({ failedCampaignAbusers });
  }

  process.exit();
})();
