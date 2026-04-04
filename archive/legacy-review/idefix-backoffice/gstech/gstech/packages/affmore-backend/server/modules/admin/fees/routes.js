// @flow
import type {
  CreateAdminFeeRequest,
  CreateOrUpdateAdminFeeResponse,
  GetAdminFeesResponse,
  UpdateAdminFeeRequest,
  DeleteAdminFeeRequest,
  AdminFeeRequest,
  AdminFeeWithAffiliatesResponse,
} from '../../../../types/api/admin-fees';

const _ = require('lodash');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const {
  createAdminFee,
  updateAdminFee,
  getAdminFeeWithAffiliates,
  getAdminFeesWithComputedFields,
  deleteAdminFee,
  createAdminFeeRuleSet,
  syncAdminFeeRuleSet,
} = require('./repository');
const {
  getRunningFeeSchedulesUsingAdminFeeId,
  draftDeleteAffiliateAdminFee,
  deleteAffiliateAdminFeesUsingAdminFeeId,
} = require('../affiliates/fees/repository');
const {
  adminFeeRequestSchema,
  createAdminFeeSchema,
  updateAdminFeeSchema,
  deleteAdminFeeRequestSchema,
} = require('./schemas');
const { bulkSchedulesDiffNotes, scheduleDiffNote } = require('../affiliates/fees/utils');
const { createAffiliateLog } = require('../affiliates/logs/repository');

const createAdminFeeHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> createAdminFeeHandler', { session, params, body });
    const {
      session: { user },
      fee: requestedFee,
      rules: requestedRules,
    } = validate<CreateAdminFeeRequest>({ session, ...body }, createAdminFeeSchema);

    const { fee, rules } = await pg.transaction(async (tx) => {
      const createdFee = await createAdminFee(tx, requestedFee, user.id);
      const createdFeeRules = await createAdminFeeRuleSet(tx, createdFee.id, requestedRules);
      return { fee: createdFee, rules: createdFeeRules };
    });
    const response: CreateOrUpdateAdminFeeResponse = { fee, rules };
    logger.debug('<<< createAdminFeeHandler', { response });
    return res.json({ data: response });
  } catch (error) {
    logger.error('XXX createAdminFeeHandler', { error, message: error.message });
    return res.status(error.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAdminFeesHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> getAdminFeesHandler', { session, params, body });
    const fees = await getAdminFeesWithComputedFields(pg);
    const response: GetAdminFeesResponse = {
      fees: fees.map(({ id, ...feeRest }) => ({ adminFeeId: id, ...feeRest })),
    };
    logger.debug('<<< getAdminFeesHandler', { response });
    return res.json({ data: response });
  } catch (error) {
    logger.error('XXX getAdminFeesHandler', { error, message: error.message });
    return res.status(error.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAdminFeeHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> getAdminFeeHandler', { session, params, body });
    const { adminFeeId } = validate<AdminFeeRequest>(params, adminFeeRequestSchema);
    const feeWithAffs = await getAdminFeeWithAffiliates(pg, adminFeeId);
    if (!feeWithAffs) return res.status(404).json({ error: { message: 'Admin fee not found' } });
    const { affiliates, rules, ...fee } = feeWithAffs;
    const response: AdminFeeWithAffiliatesResponse = { fee, rules, affiliates };
    logger.debug('<<< getAdminFeeHandler', { response });
    return res.json({ data: response });
  } catch (error) {
    logger.error('XXX getAdminFeeHandler', { error, message: error.message });
    return res.status(error.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateAdminFeeHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> updateAdminFeeHandler', { session, params, body });
    const {
      params: { adminFeeId },
      fee: requestedFee,
      rules: requestedRules,
    } = validate<UpdateAdminFeeRequest>({ session, params, ...body }, updateAdminFeeSchema);

    const { fee, rules } = await pg.transaction(async (tx) => {
      const updatedFee = await updateAdminFee(tx, adminFeeId, requestedFee);
      const { createdRules, deletedRules, updatedRules } = await syncAdminFeeRuleSet(
        tx,
        adminFeeId,
        requestedRules,
      );
      logger.debug('+++ updateAdminFeeHandler', { createdRules, deletedRules, updatedRules });
      return { fee: updatedFee, rules: [...createdRules, ...updatedRules] };
    });
    const response: CreateOrUpdateAdminFeeResponse = { fee, rules };
    logger.debug('<<< updateAdminFeeHandler', { response });
    return res.json({ data: response });
  } catch (error) {
    logger.error('XXX updateAdminFeeHandler', { error, message: error.message });
    return res.status(error.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deleteAdminFeeHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> deleteAdminFeeHandler', { session, params, body });
    const {
      params: { adminFeeId },
      session: { user },
    } = validate<DeleteAdminFeeRequest>({ session, params }, deleteAdminFeeRequestSchema);
    const removed = await pg.transaction(async (tx) => {
      const removedFee = await deleteAdminFee(tx, adminFeeId);
      const shedsToCutShort = await getRunningFeeSchedulesUsingAdminFeeId(tx, adminFeeId);
      const cutShortScheds = [];
      const cutShortDiffNotes: { [affiliateId: string]: Array<string> } = {};
      for (const schedToCutShort of shedsToCutShort) {
        const cutShortSched = await draftDeleteAffiliateAdminFee(tx, schedToCutShort.id);
        cutShortScheds.push(cutShortSched);
        const { brandId, affiliateId, ...cutShortDiff } = cutShortSched;
        if (!cutShortDiffNotes[`${affiliateId}`]) cutShortDiffNotes[`${affiliateId}`] = [];
        cutShortDiffNotes[`${affiliateId}`].push(
          await scheduleDiffNote(tx, 'update', brandId, cutShortDiff, schedToCutShort),
        );
      }
      const deletedAffFees = await deleteAffiliateAdminFeesUsingAdminFeeId(tx, adminFeeId);
      const delDiffNotes = await bulkSchedulesDiffNotes(tx, 'delete', deletedAffFees);
      for (const [affiliateId, diffNotes] of _.entries(_.merge(delDiffNotes, cutShortDiffNotes)))
        await createAffiliateLog(
          tx,
          { note: diffNotes.map((d) => `${d} (due to fee deletion)`).join('\n') },
          +affiliateId,
          user.id,
        );
      logger.debug('+++ deleteAdminFeeHandler', { removedFee, cutShortScheds, deletedAffFees });
      return removedFee;
    });
    if (!removed) return res.status(404).json({ error: { message: 'AdminFee not found' } });
    return res.json({ data: { ok: true } });
  } catch (error) {
    logger.error('XXX deleteAdminFeeHandler', { error, message: error.message });
    return res.status(error.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  createAdminFeeHandler,
  getAdminFeesHandler,
  getAdminFeeHandler,
  updateAdminFeeHandler,
  deleteAdminFeeHandler,
};
