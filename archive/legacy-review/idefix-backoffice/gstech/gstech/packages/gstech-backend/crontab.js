/* @flow */
require('dd-trace').init({ logInjection: true });

const cronCluster = require('cron-cluster');
const moment = require('moment-timezone');
const logger = require('gstech-core/modules/logger');
const redis = require('./server/modules/core/redis');

const { CronJob } = cronCluster(redis.create());

const ConversionRates = require('./server/modules/settings/ConversionRates');
const Promotion = require('./server/modules/promotions/Promotion');
const DailyActivityUpdateJob = require('./server/modules/reports/jobs/DailyActivityUpdateJob');
const HourlyActivityUpdateJob = require('./server/modules/reports/jobs/HourlyActivityUpdateJob');
const AccountStatementUpdateJob = require('./server/modules/reports/jobs/AccountStatementUpdateJob');
const GameTurnoverUpdateJob = require('./server/modules/reports/jobs/GameTurnoverUpdateJob');
const PlayerGameSummaryUpdateJob = require('./server/modules/reports/jobs/PlayerGameSummaryUpdateJob');
const ReportIntegrityCheckJob = require('./server/modules/reports/jobs/ReportIntegrityCheckJob');
const ExpirePlayerSessionsJob = require('./server/modules/sessions/ExpirePlayerSessionsJob');
const ExpireLocksJob = require('./server/modules/locks/ExpireLocksJob');
const BonusExpireJob = require('./server/modules/bonuses/BonusExpireJob');
// const UpdateAffiliateDataJob = require('./server/modules/affiliates/UpdateAffiliateDataJob');
const DeleteExpiredPinsJob = require('./server/modules/players/jobs/DeleteExpiredPinsJob');
const UpdateSegmentsJob = require('./server/modules/segments/UpdateSegmentsJob');
// const AutoAcceptWithdrawalsJob = require('./server/modules/payments/withdrawals/AutoAcceptWithdrawalsJob');
const DepositLimitFraudTriggerJob = require('./server/modules/reports/jobs/DepositLimitFraudTriggerJob');
const LifetimeDepositFraudTriggerJob = require('./server/modules/reports/jobs/LifetimeDepositFraudTriggerJob');
const DeactivateLimitCountersJob = require('./server/modules/limits/DeactivateLimitCountersJob')
const RunDailySanctionChecksJob = require('./server/modules/players/jobs/RunDailySanctionChecksJob');
const DailyUpdateSegmentsJob = require('./server/modules/segments/DailyUpdateSegmentsJob');
const InactivityNotificationJob = require('./server/modules/players/jobs/InactivityNotificationJob');
const InactivityActionsJob = require('./server/modules/players/jobs/InactivityActionsJob');
const DeleteDanglingPersonIdsJob = require('./server/modules/persons/jobs/DeleteDanglingPersonIdsJob');
const DSRUpdateJob = require('./server/modules/reports/jobs/DSRUpdateJob');
const VIPBirthdaysJob = require('./server/modules/players/jobs/VIPBirthdaysJob');
const { executeJob } = require('./server/modules/jobs');

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
const scheduleJob = (pattern: string, job: () => Promise<void>) =>
  new CronJob(pattern, job).start();

logger.info('Crontab started');
scheduleJob('0 6 * * *', executeJob('Conversion rates', ConversionRates.update));
scheduleJob('1 0 * * MON', executeJob('Tournament Standings', Promotion.refreshTournamentStandings));

scheduleJob('*/15 * * * *', executeJob('Daily partial aggregates', () => DailyActivityUpdateJob.update(moment())));
scheduleJob('2 0 * * *', executeJob('Daily aggregates end of day', () => DailyActivityUpdateJob.update(moment().subtract(1, 'days'))));

scheduleJob('4 5 1 * *', executeJob('Account statements', () => AccountStatementUpdateJob.update(moment())));

scheduleJob('0 * * * *', executeJob('Hourly aggregates', () => HourlyActivityUpdateJob.update(moment())));
scheduleJob('1 * * * *', executeJob('Hourly aggregates end of hour', () => HourlyActivityUpdateJob.update(moment().subtract(1, 'hours'))));

scheduleJob('4 * * * *', executeJob('Game turnover aggregates', () => GameTurnoverUpdateJob.update(moment())));
scheduleJob('4 0 * * *', executeJob('Game turnover aggregates end of day', () => GameTurnoverUpdateJob.update(moment().subtract(1, 'days'))));

scheduleJob('6 * * * *', executeJob('Game summary aggregates', () => PlayerGameSummaryUpdateJob.update(moment())));
scheduleJob('6 0 * * *', executeJob('Game summary aggregates end of day', () => PlayerGameSummaryUpdateJob.update(moment().subtract(1, 'days'))));

scheduleJob('8 * * * *', executeJob('DSR update', () => DSRUpdateJob.update(moment())));
scheduleJob('8 0 * * *', executeJob('DSR update end of day', () => DSRUpdateJob.update(moment().subtract(1, 'days'))));

scheduleJob('* * * * *', executeJob('Expire player sessions', ExpirePlayerSessionsJob.update));
scheduleJob('* * * * *', executeJob('Expire user sessions', ExpireLocksJob.update));
scheduleJob('15 * * * *', executeJob('Expire bonuses', BonusExpireJob.update));
// scheduleJob('*/30 * * * *', executeJob('Update affiliates', () => UpdateAffiliateDataJob.update()));

scheduleJob('1 0 * * *', executeJob('Delete expired pins', () => DeleteExpiredPinsJob.run()));

scheduleJob('*/60 * * * *', executeJob('Update segments', () => UpdateSegmentsJob.update()));

scheduleJob('30 1 * * *', executeJob('Daily Update segments at 1:30am', () => DailyUpdateSegmentsJob.update()));

// scheduleJob('*/5 * * * *', executeJob('Auto accept withdrawals', () => AutoAcceptWithdrawalsJob.update()));

scheduleJob('0 1 * * *', executeJob('Deposit limit fraud trigger daily at 1am', () => DepositLimitFraudTriggerJob.update()));
scheduleJob('0 1 * * *', executeJob('Lifetime deposit fraud trigger daily at 1am', () => LifetimeDepositFraudTriggerJob.update()));
scheduleJob('0 1 * * *', executeJob('Deactivate expired limit counters at 1am', () => DeactivateLimitCountersJob.update()));

scheduleJob('*/5 * * * *', executeJob('Run daily sanction checks', () => RunDailySanctionChecksJob.run()));

scheduleJob('8 0 * * *', executeJob('Report integrity check', () => ReportIntegrityCheckJob.run()));

scheduleJob('0 2 * * *', executeJob('Player inactivity notification daily job', () => InactivityNotificationJob.run()));
scheduleJob('30 2 * * *', executeJob('Player inactivity actions daily job', () => InactivityActionsJob.run()));

scheduleJob('0 7 * * *', executeJob('Daily Person table clean up', () => DeleteDanglingPersonIdsJob.run()));

scheduleJob('0 8 * * *', executeJob('Slack Notification for VIP Accounts with Birthdays', () => VIPBirthdaysJob.run()));
