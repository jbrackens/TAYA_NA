/* @flow */
import type { PaymentReportType } from './PaymentReport';

const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const LiabilitiesReport = require('./PlayerLiabilitiesReport');
const ActiveUsersReport = require('./ActiveUsersReport');
const ResultsReport = require('./ResultsReport');
const GameTurnoverReport = require('./GameTurnoverReport');
const PaymentReport = require('./PaymentReport');
const WithdrawReport = require('./WithdrawReport');
const PendingWithdrawReport = require('./PendingWithdrawReport');
const PaymentSummaryReport = require('./PaymentSummaryReport');
const {
  reportQuerySchema,
  resultsReportSchema,
  weeklyReportQuerySchema,
  riskProfileReportSchema,
  riskTransactionReportSchema,
  licenseReportSchema,
} = require('./schemas');
const DormantPlayerReport = require('./DormantPlayersReport');
const PlayerRiskStatusReport = require('./PlayerRiskStatusReport');
const PlayerRiskTransactionReport = require('./PlayerRiskTransactionReport');
const LicenseReport = require('./LicenseReport');

const liabilitiesReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const query = await validate(req.body, reportQuerySchema, 'Liabilities report failed');

    const { month, brandId } = query;
    const report = await LiabilitiesReport.report(month, brandId !== '' ? brandId : null);

    return res.status(200).json(report);
  } catch (err) {
    logger.warn('Liabilities report failed', err);
    return res.status(200).json({});
  }
};

const resultsReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const query = await validate(req.body, resultsReportSchema, 'Results report failed');
    const { span, time, brandId } = query;
    logger.debug('resultsReportHandler', req.body, query);
    const report = await ResultsReport.report(brandId !== '' ? brandId : null, span, time);

    return res.status(200).json(report);
  } catch (err) {
    logger.warn('Results report failed', err);
    return res.status(200).json({});
  }
};


const gameTurnoverReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const query = await validate(req.body, reportQuerySchema, 'Game turnover report failed');

    const { month, brandId } = query;
    const report = await GameTurnoverReport.report(month, brandId !== '' ? brandId : null);
    return res.json(report);
  } catch (err) {
    logger.warn('Game turnover report failed', err);
    return res.status(200).json({});
  }
};

type PaymentReportHandlerFn = (
  paymentType: PaymentReportType,
) => (req: express$Request, res: express$Response) => Promise<express$Response>;
const paymentReportHandler: PaymentReportHandlerFn =
  (paymentType) => async (req: express$Request, res: express$Response) => {
    try {
      logger.debug('>>> paymentReportHandler', { body: req.body });
      const {
        week,
        brandId,
        paymentProviderName,
        pageSize,
        pageIndex,
        text,
        sortBy,
        sortDirection,
      } = await validate(req.body, weeklyReportQuerySchema, 'Payment report failed');

      const paging = pageSize && { pageIndex, pageSize };
      const sorting = { sortBy, sortDirection };
      const report = await PaymentReport.report(
        paymentType,
        week,
        { brandId: brandId !== '' ? brandId : null, paymentProviderName, text },
        paging,
        sorting
      );
      return res.json(report);
    } catch (err) {
      logger.warn('Payment report failed', err);
      return res.status(200).json({});
    }
  };

const withdrawReportHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> withdrawReportHandler', { body: req.body });
    const {
      month,
      brandId,
      paymentProviderName,
      pageSize,
      pageIndex,
      text,
      sortBy,
      sortDirection,
    } = await validate(req.body, reportQuerySchema, 'Payment report failed');

    const paging = pageSize && { pageIndex, pageSize };
    const sorting = { sortBy, sortDirection };
    const report = await WithdrawReport.report(
      month,
      { brandId: brandId !== '' ? brandId : null, paymentProviderName, text },
      paging,
      sorting,
    );
    return res.json(report);
  } catch (err) {
    logger.warn('XXX withdrawReportHandler', { err });
    return res.status(200).json({});
  }
};

const pendingWithdrawReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const query = await validate(req.body, reportQuerySchema, 'Payment report failed');
    const { brandId } = query;

    const report = await PendingWithdrawReport.report(brandId !== '' ? brandId : null);
    return res.json(report);
  } catch (err) {
    logger.warn('report failed', err);
    return res.status(200).json({});
  }
};


const paymentSummaryReportHandler = (paymentType: PaymentReportType): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (req: express$Request, res: express$Response) => {
  try {
    const query = await validate(req.body, reportQuerySchema, 'Payment summary report failed');

    const { month, brandId } = query;
    const report = await PaymentSummaryReport.report(paymentType, month, brandId !== '' ? brandId : null);
    return res.json(report);
  } catch (err) {
    logger.warn('Payment summary failed', err);
    return res.status(200).json({});
  }
};

const dormantPlayersReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId } = await validate(req.body, reportQuerySchema, 'Dormant player report failed');
    const report = await DormantPlayerReport.report(brandId !== '' ? brandId : null);
    return res.json(report);
  } catch (err) {
    logger.warn('Payment summary failed', err);
    return res.status(200).json({});
  }
};


const activeUsersReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const report = await ActiveUsersReport.report();
    return res.json(report);
  } catch (err) {
    logger.warn('Active users report failed', err);
    return res.status(200).json({});
  }
};

const playerRiskStatusReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId } = await validate(req.body, riskProfileReportSchema, 'Player Risk Status report failed');
    const report = await PlayerRiskStatusReport.report(brandId !== '' ? brandId : null);
    return res.json(report);
  } catch (err) {
    logger.warn('Player Risk Status report failed', err);
    return res.status(200).json({});
  }
};

const playerRiskTransactionReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId, riskProfile, month } = await validate(req.body, riskTransactionReportSchema, 'Player risk transaction report failed');
    const report = await PlayerRiskTransactionReport.report(month, brandId !== '' ? brandId : null, riskProfile);
    return res.json(report);
  } catch (err) {
    logger.warn('Player risk transaction report failed', err);
    return res.status(200).json({});
  }
};

const licenseReportHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const query = await validate(req.body, licenseReportSchema, 'License report failed');
    const { month, license, country, gameProfile } = query;
    const report = await LicenseReport.report(license, month, country, gameProfile);
    return res.json(report);
  } catch (err) {
    logger.warn('report failed', err);
    return res.status(200).json({});
  }
};

module.exports = {
  liabilitiesReportHandler,
  activeUsersReportHandler,
  resultsReportHandler,
  gameTurnoverReportHandler,
  paymentReportHandler,
  paymentSummaryReportHandler,
  dormantPlayersReportHandler,
  pendingWithdrawReportHandler,
  withdrawReportHandler,
  playerRiskStatusReportHandler,
  playerRiskTransactionReportHandler,
  licenseReportHandler,
};
