// @flow
import type { PaymentDraft, Payment } from '../../../../types/repository/payments';

const { creditTypes } = require('../../../payment-types');

const createAffiliatePayment = async (knex: Knex, paymentDraft: PaymentDraft, userId: Id): Promise<Payment> => {
  const [payment] = await knex('payments')
    .insert({ ...paymentDraft, createdBy: userId })
    .returning('*');

  return payment;
};

const createAffiliatePayments = async (knex: Knex, paymentDrafts: PaymentDraft[], userId: Id): Promise<Payment[]> => {
  const payments = await knex('payments')
    .insert(paymentDrafts.map(p => ({ ...p, createdBy: userId })))
    .returning('*');

  return payments;
};

const upsertAffiliatePayment = async (
  knex: Knex,
  paymentDraft: PaymentDraft,
  userId: Id,
): Promise<Payment> => {
  let [payment] = await knex
    .from(
      knex.raw(`payments ("${Object.keys({ ...paymentDraft, createdBy: userId }).join('", "')}")`),
    )
    .insert((qb) =>
      qb
        .whereNotExists(
          knex.select('id').from('payments').where({
            affiliateId: paymentDraft.affiliateId,
            month: paymentDraft.month,
            year: paymentDraft.year,
            type: paymentDraft.type,
            description: paymentDraft.description,
          }),
        )
        .select(
          knex.raw(`'${Object.values({ ...paymentDraft, createdBy: userId }).join("', '")}'`),
        ),
    )
    .returning('*');

  if (!payment) { // TODO: wft? why not to use normal upsert
    payment = knex('payments').where({
      affiliateId: paymentDraft.affiliateId,
      month: paymentDraft.month,
      year: paymentDraft.year,
      type: paymentDraft.type,
      description: paymentDraft.description,
    });
  }

  return payment;
};

const getAffiliatePayments = async (knex: Knex, affiliateId: Id, year?: number, month?: number): Promise<Payment[]> => {
  const payments = await knex('payments')
    .select('id', 'affiliateId', 'invoiceId', 'transactionId', 'transactionDate', 'month', 'year', 'type', 'description', 'amount', 'createdBy')
    .where({ affiliateId })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (month && year) {
        qb.where('payments.month', '=', month);
        qb.where('payments.year', '=', year);
      }

      return qb;
    })
    .orderBy('payments.transactionDate', 'desc');

  return payments;
};

const getAffiliateDraftPayments = async (knex: Knex, affiliateId: Id, year?: number, month?: number): Promise<Payment[]> => {
  const payments = await knex('payments')
    .select('id', 'affiliateId', 'invoiceId', 'transactionId', 'transactionDate', 'month', 'year', 'type', 'description', 'amount', 'createdBy')
    .where({ affiliateId, invoiceId: null })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (month && year) {
        qb.where('payments.month', '=', month);
        qb.where('payments.year', '=', year);
      }

      return qb;
    })
    .orderBy('payments.transactionDate', 'desc');

  return payments;
};

const getAffiliatePreviousPayments = async (knex: Knex, affiliateId: Id, year: number, month: number): Promise<Payment[]> => {
  const payments = await knex('payments')
    .select('id', 'affiliateId', 'invoiceId', 'transactionId', 'transactionDate', 'month', 'year', 'type', 'description', 'amount', 'createdBy')
    .where({ affiliateId })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      qb.where(knex.raw('extract(YEAR from payments."transactionDate")'), '<', year);
      qb.orWhere((qbs: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
        qbs.where(knex.raw('extract(MONTH from payments."transactionDate")'), '<=', month);
        qbs.where(knex.raw('extract(YEAR from payments."transactionDate")'), '=', year);

        return qbs;
      });

      return qb;
    })

  return payments;
};

const getAffiliateCurrentPayments = async (knex: Knex, affiliateId: Id, year: number, month: number): Promise<Payment[]> => {
  const payments = await knex('payments')
    .select('id', 'affiliateId', 'invoiceId', 'transactionId', 'transactionDate', 'month', 'year', 'type', 'description', 'amount', 'createdBy')
    .where({ affiliateId })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      qb.where(knex.raw('extract(MONTH from payments."transactionDate")'), '=', month);
      qb.where(knex.raw('extract(YEAR from payments."transactionDate")'), '=', year);

      return qb;
    })
    .orderBy('payments.transactionDate', 'desc');

  return payments;
};

const getAffiliatePaymentsByInvoice = async (knex: Knex, affiliateId: Id, invoiceId: Id): Promise<Payment[]> => {
  const payments = await knex('payments')
    .select('id', 'affiliateId', 'invoiceId', 'transactionId', 'transactionDate', 'month', 'year', 'type', 'description', 'amount', 'createdBy')
    .where({ affiliateId, invoiceId })
    .whereIn('payments.type', creditTypes)
    .orderBy('payments.transactionDate', 'asc');

  return payments;
};

const getAffiliatePaymentsToInvoice = async (knex: Knex, affiliateId: Id, year: number, month: number): Promise<Payment[]> => {
  const payments = await knex('payments')
    .select('id', 'affiliateId', 'invoiceId', 'transactionId', 'transactionDate', 'month', 'year', 'type', 'description', 'amount', 'createdBy')
    .where({ affiliateId, invoiceId: null })
    .whereIn('payments.type', creditTypes)
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      qb.where(knex.raw('extract(YEAR from payments."transactionDate")'), '<', year);
      qb.orWhere((qbs: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
        qbs.where(knex.raw('extract(MONTH from payments."transactionDate")'), '<=', month);
        qbs.where(knex.raw('extract(YEAR from payments."transactionDate")'), '=', year);

        return qbs;
      });

      return qb;
    })

  return payments;
};

const getActiveAffiliatesPaymentsCount = async (knex: Knex, year: number, month: number): Promise<{ affiliateId: Id, payments: number }[]> => {
  const payments = knex('affiliates')
    .select(knex.raw('affiliates.id as "affiliateId"'), knex.raw('COUNT(payments.id)::INT as payments'))
    .joinRaw(`LEFT JOIN payments ON affiliates.id = payments."affiliateId" AND "payments"."month" = ${month} AND "payments"."year" = ${year} AND "payments"."type" IN ('${creditTypes.join('\', \'')}')`)
    .where('affiliates.masterId', 'IS', null)
    .groupBy('affiliates.id');

  return payments;
};

const getAffiliatesBalance = (knex: Knex): Knex$QueryBuilder<{ affiliateId: Id, balance: Money, }[]> => {
  const query = knex('payments')
    .select('payments.affiliateId', knex.raw('COALESCE(SUM(payments.amount), 0) as "balance"'))
    .groupBy('payments.affiliateId')
    .orderBy('payments.affiliateId');

  return query;
};

const getAffiliateBalance = (knex: Knex, affiliateId: Id): Knex$QueryBuilder<{ affiliateId: Id, balance: Money, }> => {
  const query: any = getAffiliatesBalance(knex)
    .where({ affiliateId })
    .first();

  return query;
};

module.exports = {
  createAffiliatePayment,
  createAffiliatePayments,
  upsertAffiliatePayment,
  getAffiliatePayments,
  getAffiliateDraftPayments,
  getAffiliatePreviousPayments,
  getAffiliateCurrentPayments,
  getAffiliatePaymentsByInvoice,
  getAffiliatePaymentsToInvoice,
  getActiveAffiliatesPaymentsCount,
  getAffiliatesBalance,
  getAffiliateBalance,
};
