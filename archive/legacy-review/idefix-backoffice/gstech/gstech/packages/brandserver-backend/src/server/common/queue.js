/* @flow */
const { emailDirectQueue } = require('./queues');

const emailDirect = (
  mailer: string,
  to: string,
  languageId: string,
  currencyId: string,
  properties: { firstName?: string, link?: string, values?: { [string]: string } },
): any =>
  emailDirectQueue.add(
    {
      mailer,
      to,
      languageId,
      currencyId,
      properties,
    },
    {
      removeOnComplete: true,
      attempts: 5,
      priority: 1,
    },
  );

module.exports = {
  emailDirect,
};
