/* @flow */
import type { CreateOrUpdateAdminFeeResponse } from '../../../../../types/api/admin-fees';

const request = require('supertest');

const { DateTime, Interval } = require('luxon');
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const { serializeDateRange } = require('gstech-core/modules/knex');
const app = require('../../../../app');

describe('Affiliate Admin Fees Routes', () => {
  const testAffId = 3232323;
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
      dbDraftRules.forEach((r) => expect(r).to.containSubset({ updatedAt: null, removedAt: null }));
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

  describe('#READ', () => {
    it('can get affiliate admin fee schedules', async () => {
      await request(app)
        .get(`/api/v1/admin/affiliates/${testAffId}/fees`)
        .set('x-auth-token', token)
        .expect(200)
        .expect(({ body }) => {
          const { fees: affFeesResp } = body.data;
          const thisAffFees = affFees.filter(
            ({ affiliateId, period }) =>
              affiliateId === testAffId && !period.isBefore(DateTime.local()),
          );
          expect(affFeesResp).to.be.an('array').with.lengthOf(thisAffFees.length);
          expect(affFeesResp).to.deep.containSubset(
            thisAffFees.map((affFee) => ({
              name: fee.name,
              percent: fee.percent,
              active: fee.active,
              nextMonthPercent: fee.percent,
              affiliateId: affFee.affiliateId,
              adminFeeId: affFee.adminFeeId,
              brandId: affFee.brandId,
              isRunning: affFee.period.contains(DateTime.local()),
              periodFrom: affFee.period.start.toISODate(),
              periodTo: affFee.period.end.minus({ days: 1 }).toISODate(),
              draftRemovedAt: null,
              createdBy: affFee.createdBy,
              createdAt: affFee.createdAt.toISOString(),
              updatedAt: null,
              rules: rules.map((r) => ({
                countryId: r.countryId,
                percent: r.percent,
                nextMonthPercent: r.percent,
              })),
            })),
          );
        });
    });

    describe('fees with updates', () => {
      let fee2;
      let rules2;

      beforeEach(async () => {
        const updated = await mockUpdateFee({
          fee: { name: 'test-fee2', percent: 10, active: false },
          rules: [
            { countryId: 'FI', percent: 13 },
            { countryId: 'MT', percent: 14 },
            { countryId: 'BR', percent: 16 },
          ],
        });
        fee2 = updated.fee;
        rules2 = updated.rules;
      });

      it('has updated info from draft properly merged', async () => {
        await request(app)
          .get(`/api/v1/admin/affiliates/${testAffId}/fees`)
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            const { fees: affFeesResp } = body.data;
            const thisAffFees = affFees.filter(
              ({ affiliateId, period }) =>
                affiliateId === testAffId && !period.isBefore(DateTime.local()),
            );
            expect(affFeesResp).to.be.an('array').with.lengthOf(thisAffFees.length);
            expect(affFeesResp).to.deep.containSubset(
              thisAffFees.map((affFee) => ({
                name: fee2?.name,
                percent: fee.percent,
                active: fee.active,
                nextMonthPercent: fee2?.percent,
                affiliateId: affFee.affiliateId,
                adminFeeId: affFee.adminFeeId,
                brandId: affFee.brandId,
                isRunning: affFee.period.contains(DateTime.local()),
                periodFrom: affFee.period.start.toISODate(),
                periodTo: affFee.period.end.minus({ days: 1 }).toISODate(),
                draftRemovedAt: null,
                createdBy: affFee.createdBy,
                createdAt: affFee.createdAt.toISOString(),
                updatedAt: null,
                rules: [
                  ...rules.map((r) => {
                    const rule2 = _.find(rules2, { countryId: r.countryId });
                    return {
                      countryId: r.countryId,
                      percent: r.percent,
                      nextMonthPercent: rule2?.percent || null,
                    };
                  }),
                  ..._.differenceBy(rules2, rules, 'countryId').map((r2) => ({
                    countryId: r2.countryId,
                    percent: null,
                    nextMonthPercent: r2.percent,
                  })),
                ],
              })),
            );
          });
      });
    });

    describe('deleted fees', () => {
      beforeEach(async () =>
        request(app)
          .delete(`/api/v1/admin/fees/${fee.id}`)
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            expect(body).to.have.property('data').that.has.property('ok', true);
          }),
      );

      it('has draftRemovedAt properly set', async () => {
        await request(app)
          .get(`/api/v1/admin/affiliates/${testAffId}/fees`)
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            const { fees: affFeesResp } = body.data;
            const thisAffFees = affFees.filter(
              ({ affiliateId, period }) =>
                affiliateId === testAffId && period.contains(DateTime.local()),
            );
            expect(affFeesResp).to.be.an('array').with.lengthOf(thisAffFees.length);
            expect(affFeesResp).to.deep.containSubset(
              thisAffFees.map((affFee) => ({
                name: fee.name,
                percent: fee.percent,
                active: fee.active,
                nextMonthPercent: fee.percent,
                affiliateId: affFee.affiliateId,
                adminFeeId: affFee.adminFeeId,
                brandId: affFee.brandId,
                isRunning: affFee.period.contains(DateTime.local()),
                periodFrom: affFee.period.start.toISODate(),
                periodTo: DateTime.fromJSDate(new Date()).endOf('month').toISODate(),
                createdBy: affFee.createdBy,
                createdAt: affFee.createdAt.toISOString(),
                rules: rules.map((r) => ({
                  countryId: r.countryId,
                  percent: r.percent,
                  nextMonthPercent: r.percent,
                })),
              })),
            );
            affFeesResp.forEach(({ draftRemovedAt }) =>
              expect(new Date(draftRemovedAt)).to.be.closeToTime(new Date(), 1),
            );
          });
      });
    });
  });

  describe('#MUTATE', () => {
    let existingSchedArgs;
    let rmFees;

    beforeEach(() => {
      existingSchedArgs = _.groupBy<BrandId, any>(
        affFees.map((sched) => ({
          affiliateFeeId: sched.id,
          adminFeeId: sched.adminFeeId,
          brandId: sched.brandId,
          periodFrom: sched.period.start.toISO(),
          periodTo: sched.period.end.minus({ weeks: 1 }).minus(1).toISO(),
        })),
        'brandId',
      );
    });

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

    it('can add new fee to schedule', async () => {
      const nextAvailMo = _.max(affFees.map((f) => f.period.end));
      return await mockMutateAffFees({
        brandId: 'LD',
        fees: [
          existingSchedArgs.LD[0],
          existingSchedArgs.LD[1],
          {
            adminFeeId: 1,
            brandId: 'LD',
            periodFrom: `${nextAvailMo.toISODate()}T00:00:00.000Z`,
            periodTo: `${nextAvailMo.endOf('month').minus({ days: 1 }).toISODate()}T23:59:59.999Z`, // FE sends 1 day before EOM
          },
        ],
      });
    });

    it('can remove future fee from schedule', async () =>
      mockMutateAffFees({
        brandId: 'LD',
        fees: [existingSchedArgs.LD[0]],
      }));

    it('does not remove running fee, only cuts it short', async () =>
      mockMutateAffFees({
        brandId: 'LD',
        fees: [],
      }));

    it('can update existing fee', async () =>
      mockMutateAffFees({
        brandId: 'LD',
        fees: [
          {
            ...existingSchedArgs.LD[0],
            periodTo: `${DateTime.local()
              .plus({ months: 1 })
              .endOf('month')
              .minus({ days: 1 }) // FE sends 1 day before EOM
              .toISODate()}T23:59:59.999Z`,
          },
        ],
      }));

    it('fails if fees overlap', async () =>
      mockMutateAffFees(
        {
          brandId: 'LD',
          fees: [
            {
              adminFeeId: 1,
              brandId: 'LD',
              periodFrom: '2023-06-01T00:00:00.000Z',
              periodTo: '2023-06-29T23:59:59.999Z', // FE sends 1 day before EOM
            },
            {
              adminFeeId: 1,
              brandId: 'LD',
              periodFrom: '2023-06-01T00:00:00.000Z',
              periodTo: '2023-06-29T23:59:59.999Z', // FE sends 1 day before EOM
            },
          ],
        },
        { respCode: 400, message: 'Overlapping periods detected' },
      ));

    it('fails if invalid fee Id is provided', async () =>
      mockMutateAffFees(
        {
          brandId: 'LD',
          fees: [
            {
              adminFeeId: 2,
              brandId: 'LD',
              periodFrom: `${DateTime.local()
                .plus({ months: 1 })
                .startOf('month')
                .toISODate()}T00:00:00.000Z`,
              periodTo: `${DateTime.local()
                .plus({ months: 1 })
                .endOf('month')
                .minus({ days: 1 }) // FE sends 1 day before EOM
                .toISODate()}T23:59:59.999Z`,
            },
          ],
        },
        { respCode: 500 },
      ));

    it('fails if selected admin fee is scheduled for deletion', async () => {
      await request(app)
        .delete(`/api/v1/admin/fees/${fee.id}`)
        .set('x-auth-token', token)
        .expect(200)
        .expect(({ body }) => {
          expect(body).to.have.property('data').that.has.property('ok', true);
        });

      await mockMutateAffFees(
        {
          brandId: 'LD',
          fees: [
            {
              adminFeeId: 1,
              brandId: 'LD',
              periodFrom: '2023-06-01T00:00:00.000Z',
              periodTo: '2023-06-29T23:59:59.999Z', // FE sends 1 day before EOM
            },
          ],
        },
        { respCode: 400, message: 'Invalid admin fees selected' },
      );
    });
  });
});
