/* @flow */
const backend = require('../server/common/backend');
const mailer = require('../server/common/mailer');
const logger = require('../server/common/logger');

const { emailDirectQueue } = require('../server/common/queues');

const emailDirectJob: jobCallback = async (job, done) => {
  try {
    const { mailer: id, to, languageId, currencyId, properties } = job.data;
    await mailer.sendMailer(id, to, languageId, currencyId, properties);
    done(null, 'Email ok!');
  } catch (err) {
    if (err.responseCode !== 421) logger.error('XXX emailDirectJob', { err });
    done(err, 'Email failed!');
  }
};

const init = async () => {
  await backend.init();
  emailDirectQueue.process(3, emailDirectJob);
};

module.exports = { init, emailDirectJob };
