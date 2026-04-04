/* @flow */

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const slack = require('gstech-core/modules/slack');

const { brandDefinitions } = require('gstech-core/modules/constants');

const sqlQuery = `
SELECT
p.id AS "playerId",
p.username,
p."brandId",
p."firstName",
p."lastName",
c."name" AS "country",
l.name AS "language",
p."lastLogin",
p.tags,
MAX(t.timestamp) AS "lastDepositDate"
FROM
players p
LEFT JOIN payments t ON p.id = t."playerId"
    AND t."paymentType" = 'deposit'
    AND t.status = 'complete'
LEFT JOIN base_countries c ON p."countryId" = c.id
LEFT JOIN base_languages l ON p."languageId" = l.id
WHERE
EXTRACT(MONTH FROM p."dateOfBirth") = EXTRACT(MONTH FROM CURRENT_DATE)
AND EXTRACT(DAY FROM p."dateOfBirth") = EXTRACT(DAY FROM CURRENT_DATE)
AND p.tags \\? 'vip'
GROUP BY
p.id,
p.username,
p."brandId",
p."firstName",
p."lastName",
c."name",
l.name,
p."lastLogin",
p.tags
ORDER BY
p."lastLogin" DESC;
`;

const run = async () => {
  logger.info(`+++ VIPBirthdaysJob.run() started`);
  let list;
  try {
    list = await pg.raw(sqlQuery);
  } catch (error) {
    logger.error('XXX VIPBirthdaysJob Player List Query Error. Exiting...', { error, sqlQuery });
    return;
  }
  if (!list) {
    logger.error('XXX VIPBirthdaysJob Player List Query Failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logger.error('XXX VIPBirthdaysJob Player List Empty. Exiting...');
    return;
  }
  logger.info(
    `+++ VIPBirthdaysJob ${rowCount} Birthday VIP players ${new Date().toISOString()}`,
    rows,
  );
  const batchSize = 100;
  const total = rows.length;
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      logger.info(`VIPBirthdaysJob - Processing batch ${i} to ${i + batchSize}`, batchRows);
      for (const [index, row] of batchRows.entries()) {
        const {
          playerId,
          username,
          brandId,
          firstName,
          lastName,
          country,
          language,
          lastLogin,
          lastDepositDate,
        } = row;
        logger.info(
          `++++ VIPBirthdaysJob - Processing player ${index + 1}/${batchRows.length}`,
          row,
        );
        const fields = {
          playerId,
          username,
          name: `${firstName} ${lastName}`,
          country,
          language,
          lastLogin,
          lastDepositDate,
        };
        slack.logVipBirthdayMessage(
          brandDefinitions[brandId].site,
          `Birthday of ${firstName} ${lastName}`,
          fields,
          'good',
        );
      }
    }
  } catch (error) {
    logger.error('XXX VIPBirthdaysJob Error.', error);
  }
  logger.info(`+++ VIPBirthdaysJob.run() completed`, list);
};

module.exports = { run };
