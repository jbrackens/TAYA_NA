// @flow
import type {
  AffiliateAdminFeeDraft,
  AffiliateAdminFee,
} from '../../../../../types/repository/affiliate-admin-fees';
import type { AffiliateAdminFeeRequest } from '../../../../../types/api/affiliate-admin-fees';

const _ = require('lodash');
const { DateTime, Interval } = require('luxon');
const { getAdminFee } = require('../../fees/repository');

function isDate(value: any): boolean %checks {
  return value instanceof Date;
}

function dTGuard(date: Date | DateTime): DateTime {
  return isDate(date) ? DateTime.fromJSDate(date) : date;
}

const formatAffiliateAdminFeeRequest = ({
  periodFrom,
  periodTo,
  ...fee
}: AffiliateAdminFeeRequest): AffiliateAdminFeeDraft => {
  const { year: fromYear, month: fromMonth } = dTGuard(periodFrom);
  const { year: toYear, month: toMonth } = dTGuard(periodTo);
  let [tM, tY] = [toMonth+1, toYear];
  if (tM === 13) {
    tM = 1;
    tY = toYear + 1;
  }
  return {
    ...fee,
    period: Interval.fromDateTimes(
      DateTime.fromObject({ year: fromYear, month: fromMonth, day: 1 }, { zone: 'UTC' }),
      DateTime.fromObject({ year: tY, month: tM, day: 1 }, { zone: 'UTC' }),
    ),
  };
};

const compareSchedules = (a: AffiliateAdminFeeDraft, b: AffiliateAdminFeeDraft): boolean =>
  a.adminFeeId === b.adminFeeId && a.period.equals(b.period);

const hasOverlaps = (feesSchedule: AffiliateAdminFeeDraft[]): boolean =>
  _.some(feesSchedule, ({ period }, ix, arr) =>
    _.some(_.without(arr, _.nth(arr, ix)), (f) => period.overlaps(f.period)),
  );

const startsAfterThisMonth = ({ period }: AffiliateAdminFeeDraft): boolean =>
  period.isAfter(DateTime.local().endOf('month'));

const includesCurrentMonth = ({ period }: { period: AffiliateAdminFee['period'], ... }): boolean =>
  period.contains(DateTime.local());

const periodStr = ({ start, end }: Interval): string => {
  const endInclusive = end.minus({ day: 1 });
  if (start.hasSame(endInclusive, 'year') && start.hasSame(endInclusive, 'month'))
    return start.toFormat('LLL yyyy');
  if (start.hasSame(endInclusive, 'year'))
    return `${start.toFormat('LLL')}-${endInclusive.toFormat('LLL yyyy')}`;
  return `${start.toFormat('LLL yyyy')} - ${endInclusive.toFormat('LLL yyyy')}`;
};

type ScheduleDiff = {
  adminFeeId: Id,
  period: Interval,
  ...
};
const scheduleDiffNote = async (
  knex: Knex,
  action: 'delete' | 'update' | 'create',
  brandId: BrandId,
  changedSchedule: ScheduleDiff,
  prevSchedule: ?ScheduleDiff,
): Promise<string> => {
  if (action === 'delete') {
    const { adminFeeId: adminFeeIdA, period: periodA } = changedSchedule;
    const feeName = (await getAdminFee(knex, adminFeeIdA))?.name || '??';
    return `'${brandId} ${feeName}' ${periodStr(periodA)} schedule ${
      includesCurrentMonth({ period: periodA }) ? 'will be deleted this month' : 'was deleted'
    }.`;
  }
  if (action === 'update' && prevSchedule) {
    const { adminFeeId: adminFeeIdA, period: periodA } = changedSchedule;
    const { adminFeeId: adminFeeIdB, period: periodB } = prevSchedule;
    const feeNameA = (await getAdminFee(knex, adminFeeIdA))?.name || '??';
    const feeNameB = (await getAdminFee(knex, adminFeeIdB))?.name || '??';
    const prevRunning = includesCurrentMonth({ period: periodB });
    const before = `'${brandId} ${feeNameB}' ${periodStr(periodB)}`;
    const after =
      (feeNameB === feeNameA ? '' : `'${feeNameA}' `) +
      (periodB.equals(periodA) ? '' : `${periodStr(periodA)}`);
    return `${before} ${prevRunning ? 'running' : ''} schedule was updated to ${after}.`;
  }
  const { adminFeeId: adminFeeIdA, period: periodA } = changedSchedule;
  const feeName = (await getAdminFee(knex, adminFeeIdA))?.name || '??';
  return `'${brandId} ${feeName}' ${periodStr(periodA)} schedule was added.`;
};

const bulkSchedulesDiffNotes = async (
  knex: Knex,
  action: 'delete' | 'create',
  schedules: AffiliateAdminFee[],
): Promise<{ [affiliateId: string]: string[] }> => {
  const notes: { [affiliateId: string]: Array<string> } = {};
  for (const { adminFeeId, brandId, affiliateId, period } of schedules) {
    if (!notes[`${affiliateId}`]) notes[`${affiliateId}`] = [];
    notes[`${affiliateId}`].push(await scheduleDiffNote(knex, action, brandId, { adminFeeId, period }));
  }
  return notes;
};

module.exports = {
  formatAffiliateAdminFeeRequest,
  hasOverlaps,
  startsAfterThisMonth,
  includesCurrentMonth,
  compareSchedules,
  scheduleDiffNote,
  bulkSchedulesDiffNotes,
};
