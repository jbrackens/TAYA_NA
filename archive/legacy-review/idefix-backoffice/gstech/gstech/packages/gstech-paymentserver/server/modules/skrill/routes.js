
/* @flow */
const { axios } = require('gstech-core/modules/axios');
const countries = require('i18n-iso-countries');

const api = require('gstech-core/modules/clients/backend-payment-api');
const crypt = require('gstech-core/modules/crypt');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const config = require('../../../config');

const skrillConfig = config.providers.skrill;

const processHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { body } = req;
    const {
      mb_transaction_id,
      transaction_id,
      customer_id,
      merchant_id,
      status,
      pay_from_email,
      md5sig,
      amount,
      mb_amount,
      mb_currency,
      uid,
      iban,
      firstname,
      payment_type,
      lastname,
    } = body;
    logger.debug('Skrill process', req.body, req.headers);
    const secret = crypt.md5(skrillConfig.secret).toUpperCase();
    const check = [merchant_id, transaction_id, secret, mb_amount, mb_currency, status].join('');  
    const md5result = crypt.md5(check).toUpperCase();
    if (status === '2' && md5result === md5sig) {
      const processDeposit = {
        amount: money.parseMoney(amount),
        account: (iban !== 'null' && iban) || pay_from_email,
        externalTransactionId: mb_transaction_id,
        accountParameters: { mb_transaction_id },
        message: status,
        rawTransaction: body,
        accountHolder: firstname != null && firstname !== 'null' && lastname != null && lastname !== 'null' ? `${firstname} ${lastname}` : null,
      };

      let content = null;
      let response;
      const { deposit } = await api.getDepositAlt(transaction_id);
      if (payment_type === 'WLT') {
        const player = await api.details(deposit.username);
        try {
          const form = {
            merchantId: skrillConfig.merchantId,
            password: crypt.md5(skrillConfig.secret),
            customerId: customer_id,
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: player.dateOfBirth.replace(/-/g, ''),
            email: pay_from_email,
            postCode: player.postCode,
            country: countries.alpha2ToAlpha3(player.countryId),
          };

          logger.debug('Skrill verification request', { form });
          response = (await axios.post(`${skrillConfig.apiURL}/mqi/customer-verifications`, form)).data;

          logger.debug('Skrill verification response', { response });
          const [skrillVerified, paymentVerified] = response.verificationLevel.split('');
          if (processDeposit.accountHolder === null) {
            if (skrillVerified === '1' && response.firstName === 'MATCH' && response.lastName === 'MATCH') {
              processDeposit.accountHolder = `${player.firstName} ${player.lastName}`;
            }
          }
          content = `
Automatic account verification via Skrill:
- First name (${player.firstName}): ${response.firstName}
- Last name (${player.lastName}): ${response.lastName}
- Date of Birth (${player.dateOfBirth}): ${response.dateOfBirth}
- Post code (${player.postCode}): ${response.postCode}
- Country (${player.countryId}): ${response.country}
- Account verified by Skrill: ${skrillVerified === '1' ? 'yes' : 'no'}
- Payment method verified by Skrill: ${paymentVerified === '1' ? 'yes' : 'no'}
`;
        } catch (e) {
          logger.debug('Skrill verification failed', e);
          if (e.statusCode !== 404) {
            logger.error('Skrill verification failed', e);
          }
        }
      }
      const { accountId } = await api.processDeposit(uid, transaction_id, processDeposit);
      if (content != null && response != null) {
        logger.debug('Adding Skrill payment method verification document', deposit.username, content);
        await api.addDocument(deposit.username, { type: 'payment_method', content, source: 'Skrill', fields: response, accountId, status: processDeposit.accountHolder != null ? 'checked' : 'new' });
      }
      return res.send('ok');
    }
    logger.error('Skrill process failed', { md5result, md5sig });
    return res.send('fail');
  } catch (err) {
    logger.warn('Skrill process failed', err);
    return next(err);
  }
};

module.exports = { processHandler };
