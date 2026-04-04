/* @flow */
const campaignServer = require('gstech-core/modules/clients/campaignserver-api');
const configuration = require('./configuration');

const sendMailer = async (
  mailerId: string,
  email: string,
  languageId: string,
  currencyId: string,
  properties: { firstName?: string, link?: string, values?: { [key: string]: string | number } },
) => {
  await campaignServer.sendEmailDirectly({
    email,
    firstName: properties.firstName,
    currencyId,
    languageId,
    mailerId,
    brandId: configuration.shortBrandId(),
    link: properties.link,
    values: properties.values,
  });
};

module.exports = { sendMailer };
