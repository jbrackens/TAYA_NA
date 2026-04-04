/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

const moment = require('moment');
const { axios } = require('gstech-core/modules/axios');
const { parseString, processors } = require('xml2js');
const xmlescape = require('xml-escape');

const logger = require('gstech-core/modules/logger');
const { guard } = require('gstech-core/modules/utils');
const config = require('../../../config');

const conf = config.providers.worldpay;

const paymentMethods = {
  CreditCard: {
    token: true,
    methods: ['VISA-SSL', 'ECMC-SSL', 'MAESTRO-SSL', 'AMEX-SSL', 'CB-SSL', 'CARTEBLEUE-SSL', 'DINERS-SSL', 'DISCOVER-SSL', 'JCB-SSL'],
  },
  PaySafe: {
    shortId: true,
    methods: ['PAYSAFECARD-SSL'],
  },
  Sofort: {
    methods: ['SOFORT-SSL'],
  },
  Moneta: {
    methods: ['MONETA-SSL'],
  },
};

const createRequest = (merchantCode: string, user: PlayerWithDetails, transactionKey: string, descriptionKey: string, amount: Money, paymentDetails: string, description: string, createToken: string = '', browser: string = ''): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//Worldpay//DTD Worldpay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${merchantCode}">
  <submit>
    <order orderCode="${transactionKey}" installationId="${conf.installationId}">
      <description>${xmlescape(description)} (${xmlescape(descriptionKey)})</description>
      <amount currencyCode="${user.currencyId}" exponent="2" value="${amount}"/>
      ${paymentDetails}
      <shopper>
        <shopperEmailAddress>${xmlescape(user.email)}</shopperEmailAddress>
        <authenticatedShopperID>${xmlescape(user.username)}</authenticatedShopperID>
        ${browser}
      </shopper>
      <billingAddress>
        <address>
          <firstName>${xmlescape(user.firstName)}</firstName>
          <lastName>${xmlescape(user.lastName)}</lastName>
          <address1>${xmlescape(user.address)}</address1>
          <postalCode>${xmlescape(user.postCode)}</postalCode>
          <city>${xmlescape(user.city)}</city>
          <countryCode>${xmlescape(user.countryId)}</countryCode>
        </address>
      </billingAddress>
      ${createToken}
    </order>
  </submit>
</paymentService>`;

const parseXml = (xml: string) => {
  logger.debug('parseXml', xml);
  const parser = new Promise((resolve, reject) => {
    parseString(xml, { attrNameProcessors: [processors.stripPrefix], tagNameProcessors: [processors.stripPrefix] },
      (err, result) => (err ? reject(err) : resolve(result)));
  });
  return parser;
};

const doRequest = async (
  body: mixed,
  headers: { [key: string]: mixed } = {},
  auth: { merchantCode: string, username: string, password: string, ... } = conf,
): Promise<{ error: any, headers: any, reply: any }> => {
  logger.debug('Worldpay request', body, headers);
  const res = await axios.post(conf.url, body, {
    auth: {
      username: auth.username,
      password: auth.password,
    },
    headers,
    responseType: 'text',
  });

  const r = await parseXml(res.data);
  const reply: any = guard<any, any>(r, (rr) => rr.paymentService.reply[0]);
  const error: any = guard(reply, (re) => re.error[0].$.code);
  const result = { reply, error, headers: res.headers };
  return result;
};

const parseToken = (token: any): {...} | {token: any | void, tokenExpires: Date} => {
  const tokenDetails = token.tokenDetails != null ? token.tokenDetails[0] : undefined;
  logger.debug(' parseToken', { token });
  if (tokenDetails != null) {
    const paymentTokenID = tokenDetails.paymentTokenID != null ? tokenDetails.paymentTokenID[0] : undefined;
    const paymentTokenExpiry = guard(tokenDetails, t => t.paymentTokenExpiry[0].date[0].$, {});
    const expires = moment().year(Number(paymentTokenExpiry.year)).month(Number(paymentTokenExpiry.month)).date(Number(paymentTokenExpiry.dayOfMonth))
      .hour(0)
      .minute(0)
      .toDate();
    return { token: paymentTokenID, tokenExpires: expires };
  }
  return {};
};

module.exports = {
  createRequest,
  doRequest,
  paymentMethods,
  parseToken,
};
