/* @flow */
require('flow-remove-types/register');

const { sleep } = require('gstech-core/modules/utils');
const logger = require('gstech-core/modules/logger');
const { addTag } = require('../server/modules/players/Player');

(async () => {
  const vipIds = require('./assets/19-08-2024-vip.json');

  let progress = 0;

  logger.info('VIP tagging has started ...');

  const failedVIPs = [];

  for (let index = 0; index < vipIds.length; index += 1) {
    await addTag(vipIds[index], 'vip').catch((err) =>
      failedVIPs.push({ vipId: vipIds[index], error: err }),
    );

    await sleep(1000);

    const newProgress = parseInt(((index + 1) * 100) / vipIds.length, 10);

    if (newProgress > progress + 10) {
      progress = newProgress;

      logger.info(`Completed ${index + 1} of ${vipIds.length} (${progress}%)`);
    }
  }
  logger.info('VIP tagging finished!');

  if (failedVIPs.length) {
    logger.error({ failedVIPs });
  }

  process.exit();
})();
