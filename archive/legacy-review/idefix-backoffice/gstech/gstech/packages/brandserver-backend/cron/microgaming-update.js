/* @flow */
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');
const { toFormData } = require('axios');
const { axios } = require('gstech-core/modules/axios');
const { wrapper } = require('axios-cookiejar-support');
const logger = require('../src/server/common/logger');

const jar = new CookieJar();
const request = wrapper(axios);

const pageUrl = 'https://aps.gameassists.co.uk/operatorreports/';
const config = {
  pageUrl,
  loginVerifyUrl: `${pageUrl}OpMGSModule/Login_Verify.asp`,
  operatorReportUrl: `${pageUrl}OpMGSModule/Display_Operators.asp`,
  username: 'LuckyDino',
  password: 'TF|zu^]8',
  slackUrl: 'https://hooks.slack.com/services/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',
};
const getPage = () => request({ url: config.pageUrl, jar });

const verifyLogin = () =>
  request({
    method: 'POST',
    url: config.loginVerifyUrl,
    data: toFormData({
      username: config.username,
      password: config.password,
      GetTemplateButton: 'Submit',
      ul: 'en',
    }),
    jar,
  });

const getOperatorReports = () =>
  request({
    uri: config.operatorReportUrl,
    method: 'POST',
    data: toFormData({
      id: config.username,
      cas: config.password,
    }),
    jar,
  }).then(({ data }) => cheerio.lod(data));

const getOperatorAccountBalance = async () => {
  await getPage();
  await verifyLogin();
  const $ = await getOperatorReports();
  const accountBalance = $('tr.info td').last().text();

  return accountBalance;
};

const sendToSlack = (text: string) =>
  request({
    method: 'POST',
    url: config.slackUrl,
    data: { text },
    jar,
  });

(async function microgamingUpdate() {
  process.on('unhandledRejection', (reason, p) => {
    logger.error('X?X MG:Update UNHANDLED REJECTION', { p, reason });
  });

  try {
    const accountBalance = await getOperatorAccountBalance();
    await sendToSlack(`Microgaming jackpot float ${accountBalance}`);
  } catch (err) {
    logger.error('XXX MG:Update', { err });
    process.exit(1);
  }
})();
