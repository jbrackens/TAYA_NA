// @flow
import type {
  CreateAffiliatePaymentRequest,
  GetAffiliateInvoicesAdminRequest,
  GetAffiliateInvoicesAdminResponse,
  MarkAffiliateInvoiceAsPaidRequest,
  ConfirmAffiliateInvoiceRequest,
  ConfirmAffiliateInvoiceResponse,
  GetAffiliateInvoiceRequest,
  GetAffiliateInvoiceResponse,
  GetAffiliateInvoiceDraftRequest,
  GetAffiliateInvoiceDraftResponse,
  CreateAffiliateInvoiceAttachmentRequest,
  CreateAffiliateInvoiceAttachmentResponse,
} from '../../../../../types/api/payments';

const _ = require('lodash');
const { v1: uuid } = require('uuid');
const { DateTime } = require('luxon');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const { EUCountries } = require('gstech-core/modules/countries');
const minio = require('gstech-core/modules/minio');

const config = require('../../../../config');
const repository = require('./repository');
const affiliatesRepository = require('../repository');
const paymentsRepository = require('../../payments/repository');
const userRepository = require('../../../auth/user/repository');
const logsRepository = require('../logs/repository');
const schemas = require('./schemas');
const { creditTypes, debitTypes } = require('../../../../payment-types');
const { calculateTax } = require('../../../../commissionCalculator');
const { getCompanyInfo } = require('../../../../company-info');
const { canConfirm, canMarkAsPaid } = require('../../../../flags');

const createAffiliatePaymentHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createAffiliatePaymentHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const { session: { user }, params: { affiliateId }, payment } = validate<CreateAffiliatePaymentRequest>({ session, params, payment: body }, schemas.createAffiliatePaymentSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const today = DateTime.utc();
    const amount = debitTypes.includes(payment.type) ? -payment.amount : payment.amount;

    await paymentsRepository.createAffiliatePayment(pg, {
      affiliateId,
      transactionId: uuid(),
      transactionDate: today.toJSDate(),
      month: today.month,
      year: today.year,
      type: payment.type,
      description: payment.description,
      amount,
    }, user.id);

    const response: DataResponse<OkResult> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createAffiliatePaymentHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateInvoicesHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateInvoicesHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const request = validate<GetAffiliateInvoicesAdminRequest>({ session, params }, schemas.getAffiliateInvoicesSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const users = await userRepository.getUsers(pg);

    const payments = await paymentsRepository.getAffiliateDraftPayments(pg, request.params.affiliateId);
    const invoices = await repository.getInvoicesWithAmounts(pg, request.params.affiliateId);

    const totalAmount = _.sumBy(payments, p => p.amount);

    const today = DateTime.local();
    const lastMonth = DateTime.local(today.year, today.month, 1).plus({ month: -1 });
    const closed = await affiliatesRepository.isMonthClosed(pg, lastMonth.year, lastMonth.month);

    const response: DataResponse<GetAffiliateInvoicesAdminResponse> = {
      data: {
        draft: {
          payments: {
            items: payments.map((payment) => {
              const user = users.find((u) => u.id === payment.createdBy);
              if (!user) {
                throw new Error(`User with ID ${payment.createdBy} not found`);
              }

              return {
                paymentId: payment.id,
                transactionDate: payment.transactionDate,
                type: payment.type,
                description: payment.description,
                amount: payment.amount,
                createdBy: user.email, // TODO: other createdBy fields must be user's email too
              };
            }),
            totals: {
              amount: totalAmount,
            },
            total: totalAmount,
          },
          canConfirm: canConfirm(affiliate, request.session) && totalAmount >= affiliate.paymentMinAmount && closed,
        },
        invoices: {
          items: invoices.map((invoice) => {
            const user = users.find((u) => u.id === invoice.createdBy);
            if (!user) {
              throw new Error(`User with ID ${invoice.createdBy} not found`);
            }

            return {
              invoiceId: invoice.id,
              invoiceDate: invoice.createdAt,
              invoiceNumber: invoice.invoiceNumber,
              creditedAmount: invoice.creditedAmount,
              paidAmount: invoice.paidAmount,
              createdBy: user.email, // TODO: other createdBy fields must be user's email too
              status: invoice.isPaid ? 'Paid' : 'Confirmed',
              canMarkAsPaid: canMarkAsPaid(affiliate, request.session) && invoice.isPaid === false,
            };
          }),
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateInvoicesHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateInvoiceDraftHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateInvoiceDraftHandler request', { session: req.session, params: req.params, query: req.query, body: req.body });

    const { session, params } = req;
    const { params: { affiliateId } } = validate<GetAffiliateInvoiceDraftRequest>({ session, params }, schemas.getAffiliateInvoiceDraftSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const today = DateTime.utc();
    const company = getCompanyInfo(today.toJSDate());
    const users = await userRepository.getUsers(pg);
    const rawPayments = await paymentsRepository.getAffiliateDraftPayments(pg, affiliateId);
    const relevantPayments = rawPayments.filter(p => creditTypes.includes(p.type) && p.amount > 0);

    const payments = relevantPayments.map((payment) => {
      const user = users.find((u) => u.id === payment.createdBy);
      if (!user) {
        throw new Error(`User with ID ${payment.createdBy} not found`);
      }

      return {
        paymentId: payment.id,
        transactionDate: payment.transactionDate,
        createdBy: user.email,
        type: payment.type,
        description: payment.description,
        ...calculateTax(payment.amount, affiliate.countryId),
      };
    });

    const response: DataResponse<GetAffiliateInvoiceDraftResponse> = {
      data: {
        company,
        affiliate: {
          name: affiliate.name,
          address: affiliate.address,
          vatNumber: affiliate.vatNumber,
          paymentMethod: affiliate.paymentMethod,
          paymentMethodDetails: affiliate.paymentMethodDetails,
        },
        payments,
        totals: {
          creditAmount: _.sumBy(payments.filter(p => creditTypes.includes(p.type)), p => p.amount),
          debitAmount: _.sumBy(payments.filter(p => debitTypes.includes(p.type)), p => p.amount),
          amount: _.sumBy(payments, p => p.amount),
          tax: _.sumBy(payments, p => p.tax),
          total: _.sumBy(payments, p => p.total),
        },
        note: EUCountries.includes(affiliate.countryId) && affiliate.countryId !== 'MT' ? 'Reverse charge mechanism' : '',
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateInvoiceDraftHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const confirmAffiliateInvoiceHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('confirmAffiliateInvoiceHandler request', { session: req.session, params: req.params, query: req.query, body: req.body });

    // TODO: query parameters from request are ignored.
    const { params: { affiliateId }, session } = validate<ConfirmAffiliateInvoiceRequest>({ session: req.session, params: req.params, query: req.query }, schemas.confirmAffiliateInvoiceSchema);

    const today = DateTime.local();
    const { year, month } = DateTime.utc(today.year, today.month, 1).plus({ month: -1 });

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    if (affiliate.userId !== session.user.id && !session.user.roles.includes('admin')) {
      return res.status(403).json({
        error: { message: 'Operation is not allowed' },
      });
    }

    if (!affiliate.allowPayments) { // TODO: check min payment amount too
      return res.status(403).json({
        error: { message: 'Affiliate payments are not allowed' },
      });
    }

    const closed = await affiliatesRepository.isMonthClosed(pg, year, month);
    if (!closed) {
      return res.status(403).json({
        error: { message: 'Last month is not closed yet. Confirming invoice not allowed.' },
      });
    }

    const existingInvoice = await repository.findInvoice(pg, affiliateId, today.year, today.month);
    if (existingInvoice) {
      return res.status(403).json({
        error: { message: 'Invoice already exists for this month' },
      });
    }

    const payments = await paymentsRepository.getAffiliatePaymentsToInvoice(pg, affiliate.id, today.year, today.month);
    if (payments.length === 0) {
      return res.status(403).json({
        error: { message: 'No payments to create invoice for' },
      });
    }

    const invoice = await repository.createInvoice(pg, affiliateId, payments, today.year, today.month, session.user.id);
    const response: DataResponse<ConfirmAffiliateInvoiceResponse> = {
      data: {
        invoiceId: invoice.id,
        canConfirm: false,
        canMarkAsPaid: canMarkAsPaid(affiliate, session),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('confirmAffiliateInvoiceHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateInvoiceHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateInvoiceHandler request', { session: req.session, params: req.params, query: req.query, body: req.body });

    const { session, params } = req;
    const { params: { affiliateId, invoiceId } } = validate<GetAffiliateInvoiceRequest>({ session, params }, schemas.getAffiliateInvoiceSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const invoice = await repository.getInvoice(pg, invoiceId);
    if (!invoice) {
      return res.status(404).json({
        error: { message: 'Invoice not found' },
      });
    }

    const company = getCompanyInfo(invoice.createdAt);
    const users = await userRepository.getUsers(pg);
    const rawPayments = await paymentsRepository.getAffiliatePaymentsByInvoice(pg, affiliate.id, invoiceId);
    const relevantPayments = rawPayments.filter(p => creditTypes.includes(p.type) && p.amount > 0);

    const payments = relevantPayments.map((payment) => {
      const user = users.find((u) => u.id === payment.createdBy);
      if (!user) {
        throw new Error(`User with ID ${payment.createdBy} not found`);
      }

      return {
        paymentId: payment.id,
        transactionDate: payment.transactionDate,
        createdBy: user.email,
        type: payment.type,
        description: payment.description,
        ...calculateTax(payment.amount, affiliate.countryId),
      };
    });

    const logs = await logsRepository.getAffiliateLogs(pg, affiliate.id);
    const log = logs.find(l => l.note === `External invoice upload for ${invoice.invoiceNumber}`);

    const response: DataResponse<GetAffiliateInvoiceResponse> = {
      data: {
        invoiceDate: invoice.createdAt,
        invoiceNumber: invoice.invoiceNumber,
        company,
        affiliate: {
          name: affiliate.name,
          address: affiliate.address,
          vatNumber: affiliate.vatNumber,
          paymentMethod: affiliate.paymentMethod,
          paymentMethodDetails: affiliate.paymentMethodDetails,
        },
        payments,
        totals: {
          creditAmount: _.sumBy(payments.filter(p => creditTypes.includes(p.type)), p => p.amount),
          debitAmount: _.sumBy(payments.filter(p => debitTypes.includes(p.type)), p => p.amount),
          amount: _.sumBy(payments, p => p.amount),
          tax: _.sumBy(payments, p => p.tax),
          total: _.sumBy(payments, p => p.total),
        },
        note: EUCountries.includes(affiliate.countryId) && affiliate.countryId !== 'MT' ? 'Reverse charge mechanism' : '',
        attachments: log && log.attachments,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateInvoiceHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const markAffiliateInvoiceAsPaidHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('markAffiliateInvoiceAsPaidHandler request', { session: req.session, params: req.params, query: req.query, body: req.body });

    const { session, params } = req;
    const { params: { affiliateId, invoiceId }, session: { user } } = validate<MarkAffiliateInvoiceAsPaidRequest>({ session, params }, schemas.markAffiliateInvoiceAsPaidSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    if (!affiliate.allowPayments) {
      return res.status(403).json({
        error: { message: 'Affiliate payments are not allowed' },
      });
    }

    const invoice = await repository.getInvoice(pg, invoiceId);
    if (!invoice) {
      return res.status(404).json({
        error: { message: 'Invoice not found' },
      });
    }

    if (invoice.isPaid) {
      return res.status(409).json({
        error: { message: 'Invoice already paid' },
      });
    }

    const payments = await paymentsRepository.getAffiliatePaymentsByInvoice(pg, affiliateId, invoiceId);
    if (payments.length === 0) {
      return res.status(404).json({
        error: { message: 'No payments for the invoice' }, // shouldn't be the case
      });
    }

    await pg.transaction(async tx => {
      const now = DateTime.local();
      await repository.updateInvoice(tx, { isPaid: true }, invoice.id);
      await paymentsRepository.createAffiliatePayment(tx, {
        affiliateId,
        invoiceId,
        transactionId: uuid(),
        transactionDate: now.toJSDate(),
        month: invoice.month,
        year: invoice.year,
        type: 'Payment',
        description: 'Affiliate monthly payment',
        amount: _.sumBy(payments, p => p.amount) * -1,
      }, user.id);
    });

    const response: DataResponse<OkResult> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('markAffiliateInvoiceAsPaidHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const createAffiliateInvoiceAttachmentHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createAffiliateInvoiceAttachmentHandler request', { session: req.session, params: req.params, body: req.body, files: req.files && Object.keys(req.files) });

    const { session, params, body, files } = req;
    const request = validate<CreateAffiliateInvoiceAttachmentRequest>({ session, params, log: body }, schemas.createAffiliateInvoiceAttachmentSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const invoice = await repository.getInvoice(pg, request.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({
        error: { message: 'Invoice not found' },
      });
    }

    const logDraft = {
      note: `External invoice upload for ${invoice.invoiceNumber}`,
      attachments: ([]: string[]),
    };

    logDraft.attachments = files && await Promise.all(files.map(f => new Promise((resolve, reject) => {
        const fileName = `${invoice.invoiceNumber}}/${f.originalname}`;
        minio.putObject(config.minio.bucketName, fileName, f.buffer, (error) => {
          if (error) return reject(error);
          return resolve(`/uploads/${fileName}`);
        });
      })
    ));

    const log = await logsRepository.createAffiliateLog(
      pg,
      logDraft,
      request.params.affiliateId,
      request.session.user.id,
    );
    const response: DataResponse<CreateAffiliateInvoiceAttachmentResponse> = {
      data: {
        log: {
          logId: log.id,

          note: log.note,
          attachments: log.attachments,

          createdBy: log.createdBy,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createAffiliateInvoiceAttachmentHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  createAffiliatePaymentHandler,
  getAffiliateInvoicesHandler,
  getAffiliateInvoiceDraftHandler,
  confirmAffiliateInvoiceHandler,
  getAffiliateInvoiceHandler,
  markAffiliateInvoiceAsPaidHandler,
  createAffiliateInvoiceAttachmentHandler,
};
