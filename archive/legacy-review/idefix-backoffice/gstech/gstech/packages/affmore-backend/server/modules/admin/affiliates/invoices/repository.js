// @flow
import type { Invoice, InvoiceWithAmounts } from '../../../../../types/repository/invoices';
import type { Payment, PaymentBalance } from '../../../../../types/repository/payments';

const { DateTime } = require('luxon');
const { creditTypes, debitTypes } = require('../../../../payment-types');

const getAffiliatePaymentBalances = async (knex: Knex, year: number, month: number): Promise<PaymentBalance[]> => {
  const lastMonth = DateTime.local(year, month, 1).plus({ months: -1 });
  const payments = await knex
    .with(
      'lastPayments',
      knex
        .select(
          'affiliates.id',
          'affiliates.name',
          'affiliates.contactName',
          'affiliates.countryId',
          'affiliates.paymentMethod',
          'affiliates.paymentMethodDetails',
          'affiliates.userId',
          knex.raw('sum(payments.amount) as "closingBalance"'),
          'affiliates.allowPayments',
          'affiliates.paymentMinAmount',
        )
        .from('payments')
        .leftJoin('affiliates', 'payments.affiliateId', 'affiliates.id')
        .groupByRaw('affiliates.id')
        .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
          qb.where(knex.raw('extract(YEAR from payments."transactionDate")'), '<', year);
          qb.orWhere((qbs: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
            qbs.where(knex.raw('extract(MONTH from payments."transactionDate")'), '<=', month);
            qbs.where(knex.raw('extract(YEAR from payments."transactionDate")'), '=', year);

            return qbs;
          });

          return qb;
        })
    )
    .with(
      'prevPayments',
      knex
        .select(
          'affiliates.id',
          knex.raw('sum(payments.amount) as "openingBalance"'),
        )
        .from('payments')
        .leftJoin('affiliates', 'payments.affiliateId', 'affiliates.id')
        .groupBy('affiliates.id')
        .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
          qb.where(knex.raw('extract(YEAR from payments."transactionDate")'), '<', lastMonth.year);
          qb.orWhere((qbs: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
            qbs.where(knex.raw('extract(MONTH from payments."transactionDate")'), '<=', lastMonth.month);
            qbs.where(knex.raw('extract(YEAR from payments."transactionDate")'), '=', lastMonth.year);

            return qbs;
          });

          return qb;
        })
    )
    .with(
      'thisPayments',
      knex
        .select(
          'affiliates.id',
          knex.raw('sum(payments.amount) as "creditedAmount"'),
        )
        .from('payments')
        .leftJoin('affiliates', 'payments.affiliateId', 'affiliates.id')
        .groupByRaw('affiliates.id')
        .whereIn('payments.type', creditTypes)
        .where(knex.raw('extract(MONTH from payments."transactionDate")'), '=', month)
        .where(knex.raw('extract(YEAR from payments."transactionDate")'), '=', year)
    )
    .with(
      'paymentsToInvoice',
      knex
        .select(
          'affiliates.id',
          knex.raw('sum(payments.amount) as "amount"'),
        )
        .from('payments')
        .leftJoin('affiliates', 'payments.affiliateId', 'affiliates.id')
        .groupByRaw('affiliates.id')
        .whereIn('payments.type', creditTypes)
        .where({ invoiceId: null })
    )
    .select(
      'lastPayments.id',
      'invoices.id as invoiceId',
      'invoices.invoiceNumber',
      'lastPayments.name',
      'lastPayments.contactName',
      'lastPayments.countryId',
      'lastPayments.paymentMethod',
      'lastPayments.paymentMethodDetails',
      'lastPayments.paymentMinAmount',
      knex.raw('coalesce("prevPayments"."openingBalance", 0) as "openingBalance"'),
      knex.raw('coalesce("thisPayments"."creditedAmount", 0) as "creditedAmount"'),
      knex.raw('coalesce("invoicePayments"."paidAmount", 0) as "paidAmount"'),
      knex.raw('coalesce("lastPayments"."closingBalance", 0) as "closingBalance"'),
      'lastPayments.allowPayments',
      'lastPayments.userId',
      'invoices.isPaid',
    )
    .from('lastPayments')
    .leftJoin('prevPayments', 'prevPayments.id', 'lastPayments.id')
    .leftJoin('thisPayments', 'thisPayments.id', 'lastPayments.id')
    .leftJoin('paymentsToInvoice', 'paymentsToInvoice.id', 'lastPayments.id')
    .joinRaw(`LEFT JOIN invoices ON "lastPayments".id = invoices."affiliateId" AND invoices.year = ${year} AND invoices.month = ${month}`)
    .joinRaw(`LEFT JOIN
      (SELECT payments."invoiceId", SUM(payments.amount) * -1 as "paidAmount"
       FROM payments
       WHERE "payments"."type" IN ('${debitTypes.join('\', \'')}')
       GROUP BY payments."invoiceId"
      ) as "invoicePayments" ON "invoicePayments"."invoiceId" = invoices.id AND invoices."isPaid" IS TRUE`)
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      qb.orWhere((qbs: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
        qbs.whereRaw('invoices."isPaid" is not null');

        return qbs;
      });
      qb.orWhere((qbs: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
        qbs.where({ 'invoices.isPaid': null });
        qbs.where('paymentsToInvoice.amount', '>', 0);
        qbs.where('closingBalance', '>=', knex.raw('"lastPayments"."paymentMinAmount"'))

        return qbs;
      });

      return qb;
    })
    .orderBy('name')
    .orderBy('id');

  return payments;
};

const createInvoice = async (knex: Knex, affiliateId: Id, payments: Payment[], year: number, month: number, userId: Id): Promise<Invoice> => {
  if (payments.length === 0) throw new Error('Cannot create an invoice without any payment record');

  const now = DateTime.utc();
  return knex.transaction(async tx => {
    const [invoice] = await tx('invoices')
      .insert({
        invoiceNumber: `${affiliateId}${(`0${month}`).slice(-2)}${year}`,
        affiliateId,
        month,
        year,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning('*');

    await tx('payments')
      .update({ invoiceId: invoice.id })
      .whereIn('id', payments.map((p) => p.id));

    return invoice;
  });
};

const getInvoice = async (knex: Knex, invoiceId: Id): Promise<?Invoice> => {
  const invoice = await knex('invoices')
    .select('invoices.id', 'invoices.affiliateId', 'invoices.invoiceNumber', 'isPaid', 'month', 'year', 'createdBy', 'createdAt', 'updatedAt')
    .where({ id: invoiceId })
    .first();

  return invoice;
};
const getInvoicesWithAmounts = async (knex: Knex, affiliateId: Id): Promise<InvoiceWithAmounts[]> => {
  const invoices = knex('invoices')
    .select('invoices.id', 'invoices.affiliateId', 'invoices.invoiceNumber', 'invoices.isPaid', 'invoices.month', 'invoices.year', 'invoices.createdBy', 'invoices.createdAt', 'invoices.updatedAt', 'creditPayments.amount as creditedAmount', knex.raw('"debitPayments".amount * -1 as "paidAmount"'))
    .joinRaw(`left join (SELECT "invoiceId", sum(payments.amount) AS "amount" FROM payments WHERE payments.type IN ('${creditTypes.join('\', \'')}') GROUP BY "invoiceId") as "creditPayments" on "creditPayments"."invoiceId" = invoices.id`)
    .joinRaw(`left join (SELECT "invoiceId", sum(payments.amount) AS "amount" FROM payments WHERE payments.type IN ('${debitTypes.join('\', \'')}') GROUP BY "invoiceId") as "debitPayments" on "debitPayments"."invoiceId" = invoices.id`)
    .where({ 'invoices.affiliateId': affiliateId })
    .orderBy('invoices.createdBy', 'desc');

  return invoices;
};

const findInvoice = async (knex: Knex, affiliateId: Id, year: number, month: number): Promise<?Invoice> => {
  const invoice = await knex('invoices')
    .select('invoices.id', 'invoices.affiliateId', 'invoices.invoiceNumber', 'invoices.isPaid', 'invoices.month', 'invoices.year', 'invoices.createdBy', 'invoices.createdAt', 'invoices.updatedAt')
    .where({ affiliateId, month, year })
    .first();

  return invoice;
};

const updateInvoice = async (knex: Knex, invoice: Partial<Invoice>, invoiceId: Id): Promise<?Invoice> => {
  const now = DateTime.utc();
  const [updatedInvoice] = await knex('invoices')
    .update({ ...invoice, updatedAt: now })
    .where({ id: invoiceId })
    .returning('*');

  return updatedInvoice;
};

module.exports = {
  getAffiliatePaymentBalances,
  createInvoice,
  getInvoice,
  getInvoicesWithAmounts,
  findInvoice,
  updateInvoice,
};
