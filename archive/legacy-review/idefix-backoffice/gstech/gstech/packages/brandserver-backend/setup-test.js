// @noflow
require('flow-remove-types/register')({ ignoreUninitializedFields: true });
const chai = require('chai');
const dirtyChai = require('dirty-chai');
const chaiSubset = require('chai-subset');
const chaiHtml = require('chai-html');
const prepare = require('mocha-prepare');
const waitOn = require('wait-on');
const { sendMail } = require('gstech-core/modules/mailer/index');
const logger = require('./src/server/common/logger');
const app = require('./src/server/common/app'); // eslint-disable-line no-unused-vars
const { emailDirectQueue } = require('./src/server/common/queues');
const { registerTestPlayer } = require('./src/server/common/test-tools');

process.env.CI_ENV = 'true';

const emailPinCodeJob = async (job, done) => {
  try {
    const { to, properties } = job.data;
    if (properties?.values?.pinCode) {
      const text = properties.values.pinCode;
      await sendMail({ to, text });
      logger.info('+++ emailPinCodeJob DONE', { to, text });
    }
    done(null, 'emailPinCodeJob ok!');
  } catch (err) {
    if (err.responseCode !== 421) logger.error('XXX emailPinCodeJob', { err });
    done(err, 'emailPinCodeJob failed!');
  }
};

chai.use(dirtyChai);
chai.use(chaiSubset);
chai.use(chaiHtml);

prepare((done) => {
  waitOn({
    resources: [`tcp:${process.env.PORT || 3000}`],
    delay: 2000,
  }).then(() => {
    emailDirectQueue.process(1, emailPinCodeJob);
    done();
  });
});

// eslint-disable-next-line no-unused-vars
const setupPlayers = (override = {}) => registerTestPlayer(override);

global.expect = chai.expect;
global.setup = { player: registerTestPlayer };
