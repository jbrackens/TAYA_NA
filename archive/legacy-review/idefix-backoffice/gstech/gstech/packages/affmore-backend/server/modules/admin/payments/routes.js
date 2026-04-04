 
// @flow
import type { GetAffiliateBalancesRequest, PaymentStatus, GetAffiliatePaymentBalancesResponse, GetAffiliatePaymentBalanceRequest, GetAffiliatePaymentBalanceResponse } from '../../../../types/api/payments';

const _ = require('lodash');
const { DateTime } = require('luxon');

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');


const schemas = require('./schemas');
const repository = require('./repository');
const affiliatesRepository = require('../affiliates/repository');
const invoicesRepository = require('../affiliates/invoices/repository');
const userRepository = require('../../auth/user/repository');
const { calculateTax } = require('../../../commissionCalculator');
const { canConfirm, canMarkAsPaid } = require('../../../flags');

const getAffiliatePaymentBalancesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatePaymentBalancesHandler request', { session: req.session, params: req.params, query: req.query, body: req.body });

    const { query: { year, month }, session } = validate<GetAffiliateBalancesRequest>({ session: req.session, query: req.query }, schemas.getAffiliatePaymentBalancesSchema);

    const today = DateTime.local();
    const users = await userRepository.getUsers(pg);
    const affiliates = await invoicesRepository.getAffiliatePaymentBalances(pg, year, month);

    const lastMonth = DateTime.local(today.year, today.month, 1).plus({ month: -1 });
    const closed = await affiliatesRepository.isMonthClosed(pg, lastMonth.year, lastMonth.month);

    const response: DataResponse<GetAffiliatePaymentBalancesResponse> = {
      data: {
        affiliates: {
          items: await Promise.all(affiliates.map(async (affiliate) => {
            const user = affiliate.userId != null ? users.find((u) => u.id === affiliate.userId) : null;
            const isThisMonthSelected = today.year === year && today.month === month ;

            let status: PaymentStatus = 'Unconfirmed';
            if (affiliate.isPaid === false) status = 'Confirmed';
            if (affiliate.isPaid === true) status = 'Paid';

            return {
              affiliateId: affiliate.id,
              invoiceId: affiliate.invoiceId,
              invoiceNumber: affiliate.invoiceNumber,
              name: affiliate.name,
              contactName: affiliate.contactName,
              countryId: affiliate.countryId,
              status,
              paymentMethod: affiliate.paymentMethod,
              paymentMethodDetails: affiliate.paymentMethodDetails,
              taxRate: affiliate.countryId === 'MT' ? 18 : 0,
              openingBalance: affiliate.openingBalance,
              creditedAmount: affiliate.creditedAmount,
              paidAmount: affiliate.paidAmount,
              closingBalance: affiliate.closingBalance,
              allowPayments: affiliate.allowPayments,
              canConfirm: canConfirm(affiliate, session) && affiliate.isPaid === null && isThisMonthSelected && closed,
              canMarkAsPaid: canMarkAsPaid(affiliate, session) && affiliate.isPaid === false,
              userId: affiliate.userId, // TODO: this field is probably not needed
              manager: user && user.email,
            };
          })),
          totals: {
            closingBalance: _.sumBy(affiliates, (p) => p.closingBalance),
          },
          total: _.sumBy(affiliates, (p) => p.closingBalance),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatePaymentBalancesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliatePaymentBalanceHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliatePaymentBalanceHandler request', { session: req.session, params: req.params, query: req.query, body: req.body });

    const { session, params, query } = req;
    const { params: { affiliateId }, query: { year, month } } = validate<GetAffiliatePaymentBalanceRequest>({ session, params, query }, schemas.getAffiliatePaymentBalanceSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const invoice = await invoicesRepository.findInvoice(pg, affiliateId, year, month);
    let rawPayments;
    if (invoice) {
      rawPayments = await repository.getAffiliatePaymentsByInvoice(pg, affiliateId, invoice.id);
    } else {
      rawPayments = await repository.getAffiliatePaymentsToInvoice(pg, affiliateId, year, month);
    }
    const payments = rawPayments.filter(p => p.amount > 0).map(p => ({
      description: p.description,
      type: p.type,
      ...calculateTax(p.amount, affiliate.countryId),
    }));

    const lastMonth = DateTime.local(year, month, 1).plus({ months: -1 });
    // TODO: should get these balance in one shot
    const lastMonthPayments = await repository.getAffiliatePreviousPayments(pg, affiliateId, lastMonth.year, lastMonth.month);
    const currentMonthPayments = await repository.getAffiliateCurrentPayments(pg, affiliateId, year, month);

    const response: DataResponse<GetAffiliatePaymentBalanceResponse> = {
      data: {
        payments: {
          items: payments,
          totals: {
            amount: _.sumBy(payments, p => p.amount),
            tax: _.sumBy(payments, p => p.tax),
            total: _.sumBy(payments, p => p.total),
          },
          total: _.sumBy(currentMonthPayments, p => p.amount) + _.sumBy(lastMonthPayments, p => p.amount),
        }
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliatePaymentBalanceHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliatePaymentBalancesHandler,
  getAffiliatePaymentBalanceHandler,
};
