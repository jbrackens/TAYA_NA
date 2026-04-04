/* @flow */
import type { JobQueue } from "gstech-core/modules/queue";

const { createQueue } = require('gstech-core/modules/queue');

const campaignEmailsQueue: JobQueue<any> = createQueue<any>('campaign-emails');
const campaignSmsesQueue: JobQueue<any> = createQueue<any>('campaign-smses');
const emailQueue: JobQueue<any> = createQueue<any>('email');
const emailReportQueue: JobQueue<any> = createQueue<any>('email-report');
const smsQueue: JobQueue<any> = createQueue<any>('sms');

module.exports = {
  campaignEmailsQueue,
  campaignSmsesQueue,
  emailQueue,
  emailReportQueue,
  smsQueue,
};
