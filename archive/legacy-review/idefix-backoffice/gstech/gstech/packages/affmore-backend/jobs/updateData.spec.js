/* @flow */
/* eslint-disable no-unused-vars */
import type { CreateOrUpdateAdminFeeResponse } from '../types/api/admin-fees';

const request = require('supertest');

const { DateTime, Interval } = require('luxon');
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const { serializeDateRange } = require('gstech-core/modules/knex');
const app = require('../server/app');
const { updateAdminFees } = require('./updateData');

describe('#updateAdminFees', () => {
  let fee;
  let rules;
  let affFees;
  let token = '';

  const mkPeriodInterval = (offset: number, length: number) => {
    const ref = DateTime.utc(DateTime.local().year, DateTime.local().month, 1);
    const start = ref.plus({ month: offset }).startOf('month');
    const end = start.plus({ month: length }).startOf('month');
    return Interval.fromDateTimes(start, end);
  };

  const fakeData = {
    fee: {
      id: 1,
      name: 'test-fee',
      percent: 10,
      active: true,
      createdBy: 0,
      createdAt: DateTime.utc().minus({ months: 5 }).toJSDate(),
    },
    rules: [
      {
        id: 1,
        adminFeeId: 1,
        percent: 12,
        countryId: 'FI',
        createdAt: DateTime.utc().minus({ months: 5 }).toJSDate(),
      },
      {
        id: 2,
        adminFeeId: 1,
        percent: 13,
        countryId: 'MT',
        createdAt: DateTime.utc().minus({ months: 5 }).toJSDate(),
      },
      {
        id: 3,
        adminFeeId: 1,
        percent: 15,
        countryId: 'US',
        createdAt: DateTime.utc().minus({ months: 3 }).toJSDate(),
      },
    ],
    affiliates: [
      {
        id: 1,
        affiliateId: 3232323,
        adminFeeId: 1,
        brandId: 'LD',
        period: mkPeriodInterval(0, 2),
        createdBy: 0,
      },
      {
        id: 11,
        affiliateId: 3232323,
        adminFeeId: 1,
        brandId: 'LD',
        period: mkPeriodInterval(2, 1),
        createdBy: 0,
      },
      {
        id: 2,
        affiliateId: 3232323,
        adminFeeId: 1,
        brandId: 'CJ',
        period: mkPeriodInterval(-3, 1),
        createdBy: 0,
      },
      {
        id: 12,
        affiliateId: 3232323,
        adminFeeId: 1,
        brandId: 'CJ',
        period: mkPeriodInterval(-1, 3),
        createdBy: 0,
      },
    ],
  };

  const insertFakeData = async (): Promise<any> =>
    await pg.transaction(async (tx) => {
      const [dF] = await tx('admin_fees').insert(fakeData.fee).returning('*');
      await tx('admin_fees').insert({ ..._.omit(fakeData.fee, 'id'), draftId: dF.id });
      const dR = await Promise.all(
        fakeData.rules.map(async (r) => {
          const [ddR] = await tx('admin_fee_rules').insert(r).returning('*');
          await tx('admin_fee_rules').insert({ ..._.omit(r, 'id'), draftId: ddR.id });
          return ddR;
        }),
      );
      const dA = await tx('admin_fee_affiliates')
        .insert(
          fakeData.affiliates.map(({ period, ...rest }) => ({
            period: serializeDateRange(period),
            ...rest,
          })),
        )
        .returning('*');
      return [dF, dR, dA];
    });

  beforeEach(async () => {
    await pg('admin_fee_rules').delete();
    await pg('admin_fee_affiliates').delete();
    await pg('admin_fees').delete();
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({ email: 'admin@luckydino.com', password: 'Foobar123' })
      .expect((res) => {
        token = res.header['x-auth-token'];
      });
    const [dbFee, dbRules, dbAffs] = await insertFakeData();
    expect(dbFee).to.containSubset(fakeData.fee);
    expect(dbRules).to.containSubset(fakeData.rules);
    expect(dbAffs).to.containSubset(fakeData.affiliates);
    fee = dbFee;
    rules = dbRules;
    affFees = dbAffs;
  });

  describe('updating admin fees', () => {
    const mockUpdateFee = async (
      args: any,
      { respCode = 200, message = 'Server Error' }: { respCode?: number, message?: string } = {},
    ): Promise<Partial<CreateOrUpdateAdminFeeResponse>> => {
      let updatedFee;
      let updatedRules;
      await request(app)
        .put(`/api/v1/admin/fees/${fee.id}`)
        .set('x-auth-token', token)
        .send(args)
        .expect(respCode)
        .expect(({ body }) => {
          if (respCode !== 200) {
            expect(body.error).to.containSubset({ message });
            return;
          }
          updatedFee = body.data.fee;
          updatedRules = body.data.rules;
        });

      const changedRules = _.filter(
        args.rules,
        (r) =>
          !_.find(fakeData.rules, { countryId: r.countryId, percent: r.percent }) ||
          !_.find(fakeData.rules, { countryId: r.countryId }),
      );
      const dbFee = await pg('admin_fees').where({ id: fee.id }).first();
      const dbDraftFee = await pg('admin_fees').where({ draftId: fee.id }).first();
      const dbRules = await pg('admin_fee_rules').where({ adminFeeId: fee.id, draftId: null });
      const dbDraftRules = await pg('admin_fee_rules')
        .where({ adminFeeId: fee.id })
        .whereNot({ draftId: null });
      if (respCode !== 200) {
        expect(dbFee).to.containSubset(fakeData.fee);
        expect(dbRules).to.have.length(fakeData.rules.length);
        expect(dbRules).to.containSubset(fakeData.rules);
        expect(dbDraftFee).to.containSubset({ updatedAt: null, removedAt: null });
        dbDraftRules.forEach((r) =>
          expect(r).to.containSubset({ updatedAt: null, removedAt: null }),
        );
        return {};
      }
      if (!_.isMatch(fakeData.fee, args.fee)) {
        expect(dbFee).to.containSubset(fee);
        expect(updatedFee).to.containSubset(args.fee);
        expect(dbDraftFee).to.containSubset(args.fee);
        expect(dbDraftFee).to.have.property('updatedAt').that.is.closeToTime(new Date(), 1);
      } else {
        expect(dbDraftFee).to.have.property('updatedAt', null);
      }
      if (changedRules && changedRules.length) {
        expect(updatedRules).to.have.length(changedRules.length);
        expect(updatedRules).to.containSubset(changedRules);
        expect(dbRules).to.have.length(_.uniqBy([...rules, ...args.rules], 'countryId').length);
        expect(dbRules).to.containSubset(rules);
        expect(dbDraftRules).to.containSubset(args.rules);
        _.differenceBy(args.rules, rules, 'countryId').forEach(({ countryId, percent }) => {
          expect(_.find(dbRules, { countryId })).to.have.property('percent', null);
          expect(_.find(dbDraftRules, { countryId })).to.have.property('percent', percent);
        });
        _.differenceBy(rules, args.rules, 'countryId').forEach(({ countryId }) => {
          expect(_.find(dbRules, { countryId })).to.containSubset({
            updatedAt: null,
            removedAt: null,
          });
          expect(_.find(dbDraftRules, { countryId }))
            .to.have.property('removedAt')
            .that.is.closeToTime(new Date(), 1);
        });
        _.intersectionBy(args.rules, rules, 'countryId').forEach(({ countryId, percent }) => {
          const draft = _.find(dbDraftRules, { countryId });
          expect(draft).to.have.property('percent', percent);
        });
        _.intersectionBy(rules, args.rules, 'countryId').forEach(({ countryId, percent }) => {
          expect(_.find(dbRules, { countryId })).to.have.property('percent', percent);
          expect(_.find(dbRules, { countryId })).to.containSubset({
            updatedAt: null,
            removedAt: null,
          });
          const draft = _.find(dbDraftRules, { countryId });
          if (draft && draft.percent !== percent)
            expect(draft).to.have.property('updatedAt').that.is.closeToTime(new Date(), 1);
          if (draft && draft.percent === percent) expect(draft).to.have.property('updatedAt', null);
        });
      } else {
        expect(dbRules).to.containSubset(rules);
        dbDraftRules.forEach((r) => expect(r).to.have.property('updatedAt', null));
      }
      return { fee: updatedFee, rules: updatedRules };
    };

    it('propagates fee and rule updates', async () => {
      const { fee: feeUpdates, rules: rulesUpdates } = await mockUpdateFee({
        fee: { name: 'test-fee2', percent: 10, active: false },
        rules: [
          { countryId: 'FI', percent: 13 },
          { countryId: 'MT', percent: 14 },
          { countryId: 'BR', percent: 16 },
        ],
      });

      await updateAdminFees();

      const dbFee = await pg('admin_fees').where({ id: fee.id }).first();
      const dbDraftFee = await pg('admin_fees').where({ draftId: fee.id }).first();
      expect(_.omit(dbFee, ['id', 'draftId'])).to.containSubset(
        _.omit(dbDraftFee, ['id', 'draftId']),
      );

      const dbRules = await pg('admin_fee_rules').where({ adminFeeId: fee.id, draftId: null });
      const dbDraftRules = await pg('admin_fee_rules')
        .where({ adminFeeId: fee.id })
        .whereNot({ draftId: null });
      expect(dbRules.map((r) => _.omit(r, ['id', 'draftId']))).to.containSubset(
        dbDraftRules.map((dr) => _.omit(dr, ['id', 'draftId'])),
      );
    });
  });

  describe('updating affiliate admin fees', () => {
    const testAffId = 3232323;
    let existingSchedArgs;
    let rmFees;

    const mapDbToResp = (dbAffFee: any) => ({
      affiliateFeeId: dbAffFee.id,
      affiliateId: testAffId,
      adminFeeId: dbAffFee.adminFeeId,
      brandId: dbAffFee.brandId,
      isRunning: dbAffFee.period.contains(DateTime.local()),
      periodFrom: dbAffFee.period.start.toISODate(),
      periodTo: dbAffFee.period.end.minus({ days: 1 }).toISODate(),
      draftRemovedAt: null,
      createdBy: dbAffFee.createdBy,
      createdAt: dbAffFee.createdAt.toISOString(),
      name: fee.name,
      percent: fee.percent,
      active: fee.active,
      nextMonthPercent: fee.percent,
      rules: rules.map((r) => ({
        countryId: r.countryId,
        percent: r.percent,
        nextMonthPercent: r.percent,
      })),
    });
    const mapArgToResp = (argAffFee: any) => {
      const periodFromArg = DateTime.fromISO(argAffFee.periodFrom);
      const periodToArg = DateTime.fromISO(argAffFee.periodTo);
      const period = Interval.fromDateTimes(
        periodFromArg,
        periodToArg.plus({ days: 1 }).startOf('month'),
      );

      return {
        affiliateId: testAffId,
        adminFeeId: argAffFee.adminFeeId,
        brandId: argAffFee.brandId,
        isRunning: period.contains(DateTime.local()),
        periodFrom: periodFromArg.toISODate(),
        periodTo: periodToArg.endOf('month').toISODate(),
        draftRemovedAt: null,
        createdBy: 0,
        name: fee.name,
        percent: fee.percent,
        active: fee.active,
        nextMonthPercent: fee.percent,
        rules: rules.map((r) => ({
          countryId: r.countryId,
          percent: r.percent,
          nextMonthPercent: r.percent,
        })),
      };
    };
    const mockMutateAffFees = async (
      args: any,
      { respCode = 200, message = 'Server Error' }: { respCode?: number, message?: string } = {},
    ) => {
      await request(app)
        .put(`/api/v1/admin/affiliates/${testAffId}/fees`)
        .set('x-auth-token', token)
        .send(args)
        .expect(({ body, status }) => {
          expect(status).to.equal(respCode);
          if (respCode !== 200) {
            expect(body.error).to.containSubset({ message });
            return;
          }
          const { brandId: argBrand, fees: argFees } = args;
          const { fees: respFees } = body.data;
          const thisAffDbFees = affFees.filter(
            (aF) => aF.affiliateId === testAffId && !aF.period.isBefore(DateTime.local()),
          );
          const otherBrandDbFees = thisAffDbFees.filter(({ brandId }) => brandId !== argBrand);
          const brandArgDbFees = thisAffDbFees.filter(({ brandId }) => brandId === argBrand);
          rmFees = brandArgDbFees
            .filter(({ id }) => !argFees.some((af) => af.affiliateFeeId === id))
            .map(({ id }) => id);
          const brandRungDbFees = brandArgDbFees.filter((f) => f.period.contains(DateTime.local()));
          expect(brandRungDbFees).to.be.an('array').with.lengthOf(1);
          const rungDbFee = brandRungDbFees[0];
          const isRungFeeInArgs = argFees.some((f) => f.affiliateFeeId === rungDbFee.id);
          if (!isRungFeeInArgs) {
            expect(respFees).to.deep.containSubset([
              mapDbToResp({
                ...rungDbFee,
                period: rungDbFee.period.set({
                  end: DateTime.local().plus({ months: 1 }).startOf('month'),
                }),
              }),
            ]);
          }
          expect(respFees)
            .to.be.an('array')
            .with.lengthOf([...otherBrandDbFees, ...argFees].length + (isRungFeeInArgs ? 0 : 1));
          expect(respFees).to.deep.containSubset([
            ...otherBrandDbFees.map(mapDbToResp),
            ...argFees
              .filter((f) => _.has(f, 'affiliateFeeId'))
              .map((argFee) => ({
                affiliateFeeId: argFee.affiliateFeeId,
                ...mapArgToResp(argFee),
              })),
            ...argFees.filter((f) => !_.has(f, 'affiliateFeeId')).map(mapArgToResp),
          ]);
          respFees.forEach((respFee) => {
            const dbFee = brandArgDbFees
              .map(mapDbToResp)
              .find(({ affiliateFeeId }) => affiliateFeeId === respFee.affiliateFeeId);
            if (dbFee) {
              const feeChanged = !_.isEqual(
                ...[dbFee, respFee].map((dd) =>
                  _.pick(dd, ['adminFeeId', 'periodFrom', 'periodTo']),
                ),
              );
              if (feeChanged) {
                expect(new Date(respFee.updatedAt)).to.be.closeToTime(new Date(), 1);
              } else {
                expect(respFee.updatedAt).to.be.null();
              }
            } else {
              expect(new Date(respFee.createdAt)).to.be.closeToTime(new Date(), 1);
            }
          });
        });
      if (respCode === 200 && rmFees && rmFees.length > 0) {
        const removedDbFees = await pg('admin_fee_affiliates')
          .select('id', 'period', 'draftId', 'removedAt')
          .whereIn('id', rmFees)
          .orWhereIn('draftId', rmFees);
        removedDbFees.forEach(({ draftId, period, removedAt }) => {
          if (period.contains(DateTime.local()) && draftId === null) {
            expect(removedAt).to.be.null();
          } else {
            expect(new Date(removedAt)).to.be.closeToTime(new Date(), 1);
          }
        });
      }
    };

    beforeEach(() => {
      existingSchedArgs = _.groupBy<BrandId, any>(
        affFees.map((sched) => ({
          affiliateFeeId: sched.id,
          adminFeeId: sched.adminFeeId,
          brandId: sched.brandId,
          periodFrom: sched.period.start.toISO(),
          periodTo: sched.period.end.minus({ months: 1 }).minus(1).toISO(),
        })),
        'brandId',
      );
    });

    it('propagates removed aff fee schedule info', async () => {
      await mockMutateAffFees({ brandId: 'LD', fees: [] });

      const removedNotRunning = await pg('admin_fee_affiliates')
        .first()
        .where({ id: existingSchedArgs.LD[1].affiliateFeeId });
      expect(removedNotRunning)
        .to.be.an('object')
        .with.property('removedAt')
        .that.is.closeToTime(new Date(), 1);
      const removedNotRunningDraft = await pg('admin_fee_affiliates')
        .first()
        .where({ draftId: existingSchedArgs.LD[1].affiliateFeeId });
      expect(removedNotRunningDraft).to.not.exist();

      const removedRunning = await pg('admin_fee_affiliates')
        .first()
        .where({ id: existingSchedArgs.LD[0].affiliateFeeId });
      expect(removedRunning).to.be.an('object').with.property('removedAt', null);
      const removedRunningDraft = await pg('admin_fee_affiliates')
        .first()
        .where({ draftId: existingSchedArgs.LD[0].affiliateFeeId });
      expect(removedRunningDraft)
        .to.be.an('object')
        .with.property('removedAt')
        .that.is.closeToTime(new Date(), 1);

      await updateAdminFees();

      const removedRunningAfterUpdate = await pg('admin_fee_affiliates')
        .first()
        .where({ id: existingSchedArgs.LD[0].affiliateFeeId });
      expect(removedRunningAfterUpdate)
        .to.be.an('object')
        .with.property('removedAt')
        .that.is.closeToTime(removedRunningDraft.removedAt, 1);
      const removedRunningDraftAfterUpdate = await pg('admin_fee_affiliates')
        .first()
        .where({ draftId: existingSchedArgs.LD[0].affiliateFeeId });
      expect(removedRunningDraftAfterUpdate).to.not.exist();
    });
  });
});
