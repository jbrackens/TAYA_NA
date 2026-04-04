/* @flow */

const fs = require('fs').promises;
const { exec } = require('child_process');
const { isMoment } = require('moment');
const { DateTime } = require('luxon')
const { isLocal } = require('gstech-core/modules/config')

const logger = require('../server/common/logger');
const configuration = require('../server/common/configuration');
const redis = require('../server/common/redis');
const { CronJob } = require('cron-cluster')(redis.newClient()); // eslint-disable-line import/order

const puts = (cmd: string) => (error: string, stdout: string, stderr: string) => {
  if (error != null) logger.error('XXX CRONTAB err', { cmd, error });
  if (stdout != null && stdout !== '') { logger.debug('+++ CRONTAB stdout', { cmd, stdout }); }
  if (stderr != null && stderr !== '') { return logger.error('XXX CRONTAB stderr', { cmd, stderr }); }
};

const execute = (cmd: string) => {
  logger.debug('CRONTAB', { cmd });
  if (configuration.productionMode() || isLocal) {
    const cmds = ["node -r './rm-flow.js'", cmd];
    return exec(cmds.join(' '), puts(cmd));
  }
  logger.debug('CRONTAB SKIPPING: not in production mode');
};

/*
* * * * * * *
| | | | | |
| | | | | +-- Year              (range: 1900-3000)
| | | | +---- Day of the Week   (range: 1-7, 1 standing for Monday)
| | | +------ Month of the Year (range: 1-12)
| | +-------- Day of the Month  (range: 1-31)
| +---------- Hour              (range: 0-23)
+------------ Minute            (range: 0-59)
*/
const init = async () => {
  logger.debug('CRONTAB init');
  const file = await fs.readFile(`${__dirname}/../../cron.d/${configuration.project()}`);
  file
    .toString()
    .split('\n')
    .forEach((line) => {
      if (line.indexOf('#') !== 0 && line.indexOf(' /exec ') !== -1) {
        const [pattern, command] = line.split(' /exec ');
        const job = new CronJob(pattern, () => execute(command), null, true, 'Europe/Rome');
        job.start();
        const nextTick = job.nextDate();
        const timeStr = isMoment(nextTick)
          ? nextTick.format()
          : DateTime.isDateTime(nextTick)
            ? nextTick.toISO()
            : nextTick.toString();
        logger.debug('CRONTAB init:task', { pattern, command, time: timeStr });
      }
    });
};

module.exports = { init };
