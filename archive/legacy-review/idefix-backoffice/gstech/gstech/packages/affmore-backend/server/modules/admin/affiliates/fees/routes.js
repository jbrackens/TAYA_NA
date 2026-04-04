// @flow
import type {
  GetAffiliateAdminFeesRequest,
  GetAffiliateAdminFeesResponse,
  UpdateAffiliateAdminFeesRequest,
  UpdateAffiliateAdminFeeResponse,
} from '../../../../../types/api/affiliate-admin-fees';

import type {
  AffiliateAdminFee,
  AffiliateAdminFeeWithRules,
} from "../../../../../types/repository/affiliate-admin-fees";

const _ = require('lodash');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const {
  formatAffiliateAdminFeeRequest,
  hasOverlaps,
  startsAfterThisMonth,
  includesCurrentMonth,
  compareSchedules,
  scheduleDiffNote,
} = require('./utils');
const affiliatesRepository = require('../repository');
const {
  getAffiliateAdminFees,
  getCurrentFeeScheduleForAffiliate,
  deleteAffiliateAdminFees,
  createAffiliateAdminFee,
  draftDeleteAffiliateAdminFee,
  undoDraftDeleteAffiliateAdminFee,
  updateAffiliateAdminFee,
} = require('./repository');
const { anyAdminFeesDeleted } = require('../../fees/repository');
const { getAffiliateAdminFeesSchema, updateAffiliateAdminFeesSchema } = require('./schemas');
const { createAffiliateLog } = require('../logs/repository');

const getAffiliateAdminFeesHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> getAffiliateAdminFeesHandler', { session, params, body });
    const {
      params: { affiliateId },
    } = validate<GetAffiliateAdminFeesRequest>({ params }, getAffiliateAdminFeesSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate not found' } });

    const affiliateAdminFees = await getAffiliateAdminFees(pg, affiliateId);
    const response: DataResponse<GetAffiliateAdminFeesResponse> = {
      data: { fees: affiliateAdminFees },
    };

    logger.debug('<<< getAffiliateAdminFeesHandler', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getAffiliateAdminFeesHandler', { error: e, message: e.message });
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateAffiliateAdminFeesHandler = async (
  { session, params, body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> updateAffiliateAdminFeesHandler', { session, params, body });
    const {
      params: { affiliateId },
      brandId,
      fees: requestedFeeSchedule,
      session: { user },
    } = validate<UpdateAffiliateAdminFeesRequest>(
      { session, params, ...body },
      updateAffiliateAdminFeesSchema,
    );

    const newSchedule = requestedFeeSchedule.map(formatAffiliateAdminFeeRequest);

    if (await anyAdminFeesDeleted(pg, _.map(newSchedule, 'adminFeeId'))) {
      return res.status(400).json({ error: { message: 'Invalid admin fees selected' } });
    }

    if (hasOverlaps(newSchedule))
      return res.status(400).json({ error: { message: 'Overlapping periods detected' } });

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    if (!affiliate) return res.status(404).json({ error: { message: 'Affiliate not found' } });

    const fees = await pg.transaction(async (tx): Promise<AffiliateAdminFeeWithRules[]> => {
      const diffNotes = [];
      let delRunningSchedule;
      const currentSchedule = await getCurrentFeeScheduleForAffiliate(tx, affiliateId, brandId);
      const newSchedulesAfterThisMonth = newSchedule.filter(startsAfterThisMonth);

      const delIds = _.differenceBy(currentSchedule, newSchedulesAfterThisMonth, 'affiliateFeeId');
      const deletedSchedules = await deleteAffiliateAdminFees(tx, _.map(delIds, 'affiliateFeeId'));
      for (const delSched of _.flatten<AffiliateAdminFee, AffiliateAdminFee>(deletedSchedules))
        diffNotes.push(await scheduleDiffNote(tx, 'delete', brandId, delSched));

      const updatedSchedules = _.flatten<AffiliateAdminFee, AffiliateAdminFee>(
        await Promise.all(
          newSchedulesAfterThisMonth
            .filter(({ affiliateFeeId, ...schedule }) => {
              const currSched = _.find(currentSchedule, { affiliateFeeId });
              return currSched && !_.isEqualWith(schedule, currSched, compareSchedules);
            })
            .map(async (updatedFee) => updateAffiliateAdminFee(tx, updatedFee)),
        ),
      );
      for (const { id: affiliateFeeId, ...updtSched } of updatedSchedules) {
        const currSched = _.find(currentSchedule, { affiliateFeeId });
        if (currSched)
          diffNotes.push(await scheduleDiffNote(tx, 'update', brandId, updtSched, currSched));
      }

      const [newRunningSched] = newSchedule.filter(
        (schedule) => schedule.affiliateFeeId && includesCurrentMonth(schedule),
      );
      const [currRunningSched] = currentSchedule.filter(includesCurrentMonth);
      if (currRunningSched && currRunningSched.affiliateFeeId) {
        if (!newRunningSched?.period) {
          delRunningSchedule = await draftDeleteAffiliateAdminFee(
            tx,
            currRunningSched.affiliateFeeId,
          );
          diffNotes.push(
            await scheduleDiffNote(tx, 'update', brandId, delRunningSchedule, currRunningSched),
          );
          deletedSchedules.push(delRunningSchedule);
        } else if (!_.isEqualWith(newRunningSched, currRunningSched, compareSchedules)) {
          const [updatedSchedule] = await updateAffiliateAdminFee(tx, newRunningSched);
          diffNotes.push(
            await scheduleDiffNote(tx, 'update', brandId, updatedSchedule, currRunningSched),
          );
          updatedSchedules.push(updatedSchedule);
          await undoDraftDeleteAffiliateAdminFee(tx, updatedSchedule.id);
        }
      }

      const createdSchedules = await Promise.all(
        newSchedulesAfterThisMonth
          .filter((newSched) => !newSched.affiliateFeeId)
          .map(async (newSched) =>
            createAffiliateAdminFee(tx, affiliateId, user.id, {
              brandId,
              adminFeeId: newSched.adminFeeId,
              period: newSched.period,
            }),
          ),
      );
      for (const createdSched of _.flatten<AffiliateAdminFee, AffiliateAdminFee>(createdSchedules))
        diffNotes.push(await scheduleDiffNote(tx, 'create', brandId, createdSched));

      logger.debug('+++ updateAffiliateAdminFeesHandler', {
        delRunningSchedule,
        deletedSchedules,
        updatedSchedules,
        createdSchedules,
      });

      await createAffiliateLog(tx, { note: diffNotes.join('\n') }, affiliateId, user.id);
      return await getAffiliateAdminFees(tx, affiliateId);
    });

    const response: DataResponse<UpdateAffiliateAdminFeeResponse> = { data: { fees } };
    logger.debug('<<< updateAffiliateAdminFeesHandler', { response });

    return res.json(response);
  } catch (e) {
    logger.error('XXX updateAffiliateAdminFeesHandler', { error: e, message: e.message });
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliateAdminFeesHandler,
  updateAffiliateAdminFeesHandler,
};
