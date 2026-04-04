/* @flow */

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  logger.info('promotional flag mismatch fix: starting...');

  try {
    const loadIdsFromFile = (filename: any) => {
      const filePath = path.resolve(__dirname, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').map(Number);
    };

    const updateFlags = async (filePath: any, queryBuilder: any) => {
      const ids = loadIdsFromFile(filePath);
      const batchSize = 1000; // Adjust this value as needed
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        await queryBuilder(batchIds);
        logger.info(`Updated ${filePath} flags for IDs: ${batchIds[0]} to ${batchIds[batchIds.length - 1]}`);
      }
    };

    await updateFlags('exclusiveSMSMismatch.txt', ids => pg("players").whereIn("externalId", ids).update({ allowSMSPromotions: false }));

    await updateFlags('exclusiveEmailMismatch.txt', ids => pg("players").whereIn("externalId", ids).update({ allowEmailPromotions: false }));

    await updateFlags('bothFlagsMismatch.txt', ids => pg("players").whereIn("externalId", ids).update({ allowSMSPromotions: false, allowEmailPromotions: false }));

    logger.info('promotional flag mismatch fix: finished!');
  } catch (error) {
    logger.error('Error during promotional flag mismatch fix:', error);
  }
};
