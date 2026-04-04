
/* @flow */
import type { ZimplerConfig } from '../../types';

const { axios } = require('gstech-core/modules/axios');

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const config = require('../../../config');

const zimplerConfig = config.providers.zimpler;

const doRequest = (options: any, merchantId: string, apiKey: string) => ({
  auth: {
    username: merchantId,
    password: apiKey,
  },
  ...options,
});

const parseDob = (dob: string, countryISO: string) => {
  if (countryISO === 'SE' && dob) {
    if (dob.length === 10) {
      return dob.replace(/^(\d\d)(\d\d)(\d\d)(.*)$/, (...x) => `19${x[1]}-${x[2]}-${x[3]}`);
    } if (dob.length === 11) {
      return dob.replace(/^(\d\d)(\d\d)(\d\d)([-A])(.*)$/, (...x) => `${x[4] === '-' ? '19' : '20'}${x[1]}-${x[2]}-${x[3]}`);
    }
    return dob.replace(/^(\d\d\d\d)(\d\d)(\d\d)(.*)$/, '$1-$2-$3');
  }
  if (countryISO === 'FI' && dob) {
    return dob.replace(/^(\d\d)(\d\d)(\d\d)([-A])(.*)$/, (...x) => `${x[4] === '-' ? '19' : '20'}${x[3]}-${x[2]}-${x[1]}`);
  }
  return dob;
};

type CapturePaymentType = {
  id: string,
  ref: string,
  state: string,
  authorized_amount: number,
}

type GetAuthorizationType = {
  id: string,
  account_ref: string,
  verified_mobile_phone: string,
  payment: CapturePaymentType,
}

const getAuthorization = async (id: string, brandConfig: ZimplerConfig): Promise<GetAuthorizationType> => {
  const { data: body } = await axios.get(
    `${brandConfig.apiUrl}/v3/authorizations/${id}`,
    doRequest({}, brandConfig.merchantId, brandConfig.apiKey),
  );
  if (body.errors) {
    return Promise.reject(body.errors);
  }
  return body;
};


const capturePayment = async (
  title: string,
  id: string,
  amount: Money,
  brandConfig: ZimplerConfig,
): Promise<CapturePaymentType> => {
  const options = {
    data: [{ title, vat_percentage: '0.00', unit_price_including_vat: amount }],
  };
  const { data: body } = await axios.request({
    method: 'POST',
    url: `${brandConfig.apiUrl}/v3/payments/${id}/capture`,
    ...doRequest(options, brandConfig.merchantId, brandConfig.apiKey),
  });
  if (body.errors) {
    return Promise.reject(body.errors);
  }
  return body;
};

export type KycInfo = {
  user_id: string,
  national_identification_number: string,
  full_name: string,
  first_name: string,
  last_name: string,
  country_code: string,
  date_of_birth: string,
  pep: boolean,
  address_line_1: string,
  address_line_2: string,
  address_postcode: string,
  address_city: string,
  address_country: string,
};

const getKyc = async (id: string, brandConfig: ZimplerConfig): Promise<KycInfo> => {
  const { data: body } = await axios.get(
    `${brandConfig.apiUrl}/v3/authorizations/${id}/kyc`,
    doRequest({}, brandConfig.merchantId, brandConfig.apiKey),
  );
  if (body.errors) {
    return Promise.reject(body.errors);
  }
  return body;
};

const uploadKyc = async (kyc: KycInfo, authorization: any) => {
  const verifiedDOB = parseDob(kyc.national_identification_number, kyc.country_code);
  const lines = [];
  lines.push(`Automatic KYC - Identification ${authorization.id || ''} via Zimpler`);
  lines.push(`- Name: ${kyc.full_name}`);
  lines.push(`- Address: ${[kyc.address_line_1, kyc.address_line_2, kyc.address_postcode, kyc.address_city, kyc.address_country].filter(x => x != null).join(', ')}`);
  lines.push(`- Date of Birth: ${verifiedDOB}`);
  lines.push(`- National ID: ${kyc.national_identification_number}`);

  await client.addDocument(authorization.account_ref, { type: 'identification', content: lines.join('\n'), source: 'Zimpler', fields: kyc });
};

const processHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  const { body } = req;
  try {
    const brandConfig: ZimplerConfig = zimplerConfig.brands[(req.params.brandId: any)];
    logger.debug('Zimpler process', req.body);
    const authorization = await getAuthorization(req.params.authorizationId, brandConfig);
    logger.debug('Zimpler getAuthorization', req.params.authorizationId, authorization);
    const kyc = await getKyc(authorization.id, brandConfig);
    logger.debug('Zimpler getKyc', authorization.id, kyc);
    if (authorization.payment) {
      const amount = money.parseMoney(authorization.payment.authorized_amount);
      const payment = await capturePayment(
        `${authorization.payment.ref}`,
        authorization.payment.id,
        authorization.payment.authorized_amount,
        brandConfig,
      );
      logger.debug('Zimpler capturePayment', payment);
      if (payment.state === 'captured') {
        const deposit = {
          amount,
          account: String(authorization.verified_mobile_phone),
          accountHolder: kyc.full_name,
          externalTransactionId: payment.id,
          accountParameters: { zimplerId: kyc.user_id },
          message: payment.state,
          rawTransaction: { body: req.body, authorization, payment, kyc },
        };
        await client.processDeposit(authorization.account_ref, payment.ref, deposit);
        await uploadKyc(kyc, authorization);

        return res.redirect(body.okUrl);
      }
      return res.redirect(body.failureUrl);
    }
    await uploadKyc(kyc, authorization);

    return res.redirect(body.okUrl);
  } catch (err) {
    logger.error('Zimpler process failed', err);
    return res.redirect(body.failureUrl);
  }
};

module.exports = { processHandler };
