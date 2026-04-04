/* @flow */
import type { Journey, PaymentMethod, LegacyPlayer } from '../../api';

const ccId = require('credit-card-identifier');
const _ = require('lodash');
const repository = require('../../repository');
const configuration = require('../../configuration');
const { formatMoney, parseMoney, moneyFrom } = require('../../money');
const { localize } = require('../localize');
const api = require('../../api');
const logger = require('../../logger');
const datastorage = require('../../datastorage');
const { getDetails } = require('../legacy-player');
const { disallowBonuses } = require('../../payment/payments');
const { createJourney } = require('../../journey');
const { getDepositAmountsByCurrency } = require('../../datasources/deposit-amounts');

export type DepositMethod = {
  lowerLimit: Money,
  upperLimit: Money,
  currencySymbol: string,
  depositMethodStatus: string,
  priority: number,
  disabledWithBonus?: boolean,
};

let _payments; // Circular dependency :(

const payments = () => {
  if (_payments == null) {
    _payments = require('../../payment/payments');
  }
  return _payments;
};

const deposit = async (
  req: express$Request,
  paymentMethod: string,
  amount: string,
  bonusRuleID: number,
  paymentAccountId?: string,
  customOptions: any = {},
): Promise<any> => {
  const journey = await createJourney(req);
  const fee = payments().calculateDepositFee(
    journey,
    paymentMethod,
    moneyFrom(parseMoney(amount), req.user.details.CurrencyISO),
  );
  const campaignIds =
    customOptions.campaignIds && customOptions.campaignIds.length > 0
      ? customOptions.campaignIds
      : undefined;
  logger.debug('deposit!', req.user.username, customOptions, campaignIds);
  const finalAmount = moneyFrom(parseMoney(amount), req.context.currencyISO).add(fee).asFixed();

  const data = {
    sessionKey: req.session.SessionKey,
    paymentMethod,
    amount: finalAmount,
    bonusRuleID: disallowBonuses(req, paymentMethod) || isNaN(bonusRuleID) ? -1 : bonusRuleID,
    parameters: {
      tags: isNaN(bonusRuleID) ? [bonusRuleID] : undefined,
      campaignIds,
    },
    fee: fee.asFixed() > 0 ? fee.asFixed() : undefined,
  };
  logger.debug('External deposit!', paymentMethod, data);

  const x = await api.TransactionProceedWithDeposit(data);
  if (x.CanProceed !== 'true') {
    return Promise.reject(x.FailureReason);
  }
  const txKey = x.TransactionKey;

  await datastorage.setFlag('deposit-tx', txKey);

  const [{ depositMethods }, details] = await Promise.all([
    getDepositInfo(journey),
    getDetails(req),
  ]);

  const method =
    _.find(depositMethods, (x) => x.name === paymentMethod && x.accountId === paymentAccountId) ||
    _.find(depositMethods, (x) => x.name === paymentMethod);
  logger.debug('startPayment', { details, paymentMethod, finalAmount, fee, txKey, method });
  return payments().startPayment(
    req,
    details,
    paymentMethod,
    finalAmount,
    txKey,
    customOptions,
    _.extend({ method }, req.body),
  );
};

const mapDepositMethod = (journey: Journey, method: PaymentMethod, details: LegacyPlayer): Partial<FormattedDepositMethod> => {
  const fee = payments().getDepositFee(journey, method.PaymentMethod);
  const paymentMethod = method.PaymentMethod.split('_')[0];
  const brandId = configuration.shortBrandId();

  return {
    id: paymentMethod,
    name: method.PaymentMethod,
    type: payments().paymentFormType(method.PaymentMethod),
    options: payments().paymentOptions(method.PaymentMethod),
    PlayerLowerLimit: method.PlayerLowerLimit,
    PlayerUpperLimit: method.PlayerUpperLimit,
    currencyISO: details.CurrencyISO,
    title: localize(journey.req, `my-account.deposit.payment-method.${paymentMethod}`),
    fee: fee > 0 ? `${fee}%` : undefined,
    copyrightText: payments().copyrightText(paymentMethod),
    amounts: getDepositAmountsByCurrency(journey.req.context.currencyISO, brandId)
      .map((amount) => moneyFrom(amount, journey.req.context.currencyISO).asFixed())
      .filter((money) => money <= method.PlayerUpperLimit),
  };
};

type FormattedDepositMethod = {
  id: string,
  name: string,
  type: string,
  options: any,
  PlayerLowerLimit: number,
  PlayerUpperLimit: number,
  currencyISO: string,
  title: string,
  fee: ?string,
  copyrightText: string,
  uid: string,
  amounts: number[],
  title?: string,
  account?: string,
  accountId?: string,
};

const mapResult =
  (
    req: express$Request,
    accessStatus: {
      KycChecked: string,
    },
  ): any =>
  (x: { name: string, ...Partial<FormattedDepositMethod> }, index: number) => {
    let depositMethodStatus;
    if (accessStatus.KycChecked === 'true') {
      if (parseInt(x.PlayerUpperLimit) < parseInt(x.PlayerLowerLimit)) {
        depositMethodStatus = localize(
          req,
          'my-account.deposit.limit.reached.method-type.kyc-done',
        );
      }
    } else if (parseInt(x.PlayerUpperLimit) < parseInt(x.PlayerLowerLimit)) {
      depositMethodStatus = localize(req, 'my-account.deposit.limit.reached.no-kyc');
    }

    return _.extend({}, x, {
      lowerLimit: formatMoney(x.PlayerLowerLimit),
      upperLimit: formatMoney(x.PlayerUpperLimit),
      currencySymbol: repository.currencySymbol(req.user.details.CurrencyISO),
      depositMethodStatus,
      disabledWithBonus: disallowBonuses(req, x.name),
      priority: payments().priority(req, x.name, x.accountId, index),
    });
  };

const formatDepositMethods = (
  journey: Journey,
  depositMethods: Array<PaymentMethod>,
  accessStatus: {
    KycChecked: string,
  },
) => {
  const result: any[] = [];
  depositMethods.forEach((method) => {
    if (method.PaymentMethod.indexOf('CreditCard_') === 0) {
      for (const ccAccount of Array.from(method.accounts)) {
        let ccType = ccId(ccAccount.account.replace(/\*/g, '0'));
        if (ccType === 'Unknown') {
          ccType = localize(
            journey.req,
            `my-account.deposit.payment-method.${method.PaymentMethod.split('_')[0]}`,
          );
        }
        result.push(
          _.extend({}, mapDepositMethod(journey, method, journey.req.user.details), {
            title: `${ccType || ''} (${ccAccount.account})`,
            account: ccAccount.account,
            accountId: ccAccount.accountId,
            uid: `${method.providerId}_${ccAccount.accountId}`,
          }),
        );
      }

      result.push(
        _.extend({}, mapDepositMethod(journey, method, journey.req.user.details), {
          uid: `${method.providerId}`,
        }),
      );
    } else if (method.PaymentMethod.startsWith('Pay4Fun_')) {
      for (const p4fAccount of Array.from(method.accounts)) {
        result.push(
          _.extend({}, mapDepositMethod(journey, method, journey.req.user.details), {
            title: `Pay4Fun (${p4fAccount.account})`,
            account: p4fAccount.account,
            accountId: p4fAccount.accountId,
            uid: `${method.providerId}_${p4fAccount.accountId}`,
          }),
        );
      }

      result.push(
        _.extend({}, mapDepositMethod(journey, method, journey.req.user.details), {
          uid: `${method.providerId}`,
        }),
      );
    } else {
      const accs = (method.accounts || []).filter((a) => a.account != null && a.account !== '');
      result.push(
        _.extend({}, mapDepositMethod(journey, method, journey.req.user.details), {
          account: __guard__(_.first(accs), (x) => x.account),
          accountId: __guard__(_.first(accs), (x1) => x1.accountId),
          uid: `${method.providerId}${__guard__(_.first(accs), (x1) => `_${x1.accountId}`) || ''}`,
        }),
      );
    }
  });

  return _.sortBy(result.map(mapResult(journey.req, accessStatus)), 'priority');
};

const getDepositInfo = async (
  journey: Journey,
): Promise<{
  depositMethods: any,
  limits: any,
}> => {
  const { depositMethods, limits, accessStatus } = await api.TransactionGetAllDepositMethods({
    sessionKey: journey.req.session.SessionKey,
  });
  return {
    depositMethods: formatDepositMethods(journey, depositMethods, accessStatus),
    limits,
  };
};

function __guard__(value: ?any, transform: ((v: any) => string)) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}

module.exports = { getDepositInfo, deposit };
