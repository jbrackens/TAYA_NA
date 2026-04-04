/* @flow */
 
import type { ConversionRate } from 'gstech-core/modules/types/backend';
import type { PaymentReportType } from './PaymentReport';

const moment = require('moment-timezone');
const uniq = require('lodash/fp/uniq');
const find = require('lodash/fp/find');
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');
const { getMonthRates } = require('../settings');

const queryReport = async (paymentType: PaymentReportType, month: Date, brandId: ?string) => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const params: mixed[] = [];
  const statuses = paymentType === 'deposit' ? "'complete', 'pending'" : "'complete'";
  const parts = [
    `
    SELECT
    payment_methods.name AS "paymentMethod",
    payment_providers.name AS "paymentProvider",
    p."paymentProviderId",
    p."paymentMethodId",
    p."currencyId",
    p.amount,
    p.count
    FROM
    (SELECT "payments"."paymentMethodId", "payments"."paymentProviderId", "currencyId", sum(amount) AS amount, count(amount) AS COUNT FROM "payments" INNER JOIN "players" ON "payments"."playerId" = "players"."id"
    JOIN payment_providers ON "payment_providers".id="payments"."paymentProviderId"
    JOIN payment_event_logs ON payment_event_logs."paymentId"=payments.id and payments."transactionId"=payment_event_logs."transactionId"
    WHERE payments."status" IN (${statuses}) AND "paymentType" = ? and "testPlayer"=false
    AND date_trunc('month', payment_event_logs.timestamp AT TIME zone 'Europe/Rome') = date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')`,
  ];
  params.push(paymentType);
  if (brandId != null) {
    parts.push('AND players."brandId"=?');
    params.push(brandId);
  }
  parts.push(` GROUP BY "currencyId", "payments"."paymentMethodId", "payments"."paymentProviderId") p
      JOIN payment_methods ON p."paymentMethodId"=payment_methods.id
      JOIN payment_providers ON p."paymentProviderId"=payment_providers.id`);

  parts.push('ORDER BY "currencyId", "paymentMethodId", "paymentProviderId"');
  const query = pg.raw(parts.join(' '), params);
  const result = await query;
  return result.rows;
};

type PaymentSummaryReportRow =
    | { amount: string, rawAmount: number, title: string, transactions: any }
    | { amount: string, rawAmount: number, title: string, transactions: any, type: string }

const report = async (
  paymentType: PaymentReportType,
  month: Date,
  selectedBrandId: ?string,
): Promise<PaymentSummaryReportRow[]> => {
  const rows = await queryReport(paymentType, month, selectedBrandId);
  const paymentProviders = uniq(rows.map(({ paymentProviderId }) => paymentProviderId));
  const currencies = uniq(rows.map(({ currencyId }) => currencyId));
  const conversionRates = await getMonthRates(month);

  const convertAmount = (amount: Money, currencyId: string) => {
    if (amount == null) {
      throw Error('Convert amount failed');
    }
    const rate = find<ConversionRate>((row) => row.currencyId === currencyId)(conversionRates);
    if (rate && rate.conversionRate !== 1) {
      return amount / rate.conversionRate;
    }
    return amount;
  };

  const calculateValues = (
    predicate: ({ currencyId: string, paymentProviderId: Id, paymentMethodId: Id }) => boolean,
    convertAmounts: boolean = false,
  ) => {
    const matchingRows = rows.filter(predicate);
    if (matchingRows.length === 0) {
      return null;
    }

    const initialValue = matchingRows[0];
    const total = matchingRows
      .map(({ amount, currencyId }) =>
        convertAmounts ? convertAmount(amount, currencyId) : amount,
      )
      .reduce((a, b) => a + b, 0);
    const transactions = matchingRows.map(({ count }) => Number(count)).reduce((a, b) => a + b, 0);
    const {
      currencyId,
      paymentProviderId,
      paymentMethodId,
      paymentProvider,
      paymentMethod,
    } = initialValue;
    return {
      initialValue,
      total,
      currencyId,
      paymentProviderId,
      paymentMethodId,
      paymentProvider,
      paymentMethod,
      transactions,
    };
  };
  const result: PaymentSummaryReportRow[] = [];

  paymentProviders.forEach((paymentProviderId) => {
    const values = calculateValues((row) => row.paymentProviderId === paymentProviderId, true);
    if (values != null) {
      result.push({
        title: `${values.initialValue.paymentProvider}`,
        type: 'total',
        transactions: values.transactions,
        amount: formatMoney(values.total, 'EUR'),
        rawAmount: values.total,
      });
    }
    uniq(rows.map(({ paymentMethodId }) => paymentMethodId)).forEach((paymentMethodId) => {
      currencies.forEach((currencyId) => {
        const currencyValues = calculateValues(
          (row) =>
            row.paymentMethodId === paymentMethodId &&
            row.paymentProviderId === paymentProviderId &&
            row.currencyId === currencyId,
        );
        if (currencyValues !== null) {
          result.push({
            title: `${currencyValues.paymentMethod} ${currencyId}`,
            amount: formatMoney(currencyValues.total, currencyId),
            rawAmount: currencyValues.total,
            transactions: currencyValues.transactions,
          });
        }
      });
    });
  });
  const values = calculateValues(() => true, true);
  if (values != null) {
    result.push({
      title: 'TOTAL',
      type: 'total',
      amount: formatMoney(values.total, 'EUR'),
      rawAmount: values.total,
      transactions: values.transactions,
    });
  }
  return result;
};
module.exports = { report };
