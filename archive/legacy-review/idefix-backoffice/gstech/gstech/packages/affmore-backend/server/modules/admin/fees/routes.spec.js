/* @flow */
import type { CreateOrUpdateAdminFeeResponse } from '../../../../types/api/admin-fees';

const request = require('supertest');
const { DateTime, Interval } = require('luxon');
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const { serializeDateRange } = require('gstech-core/modules/knex');
const app = require('../../../app');

describe('Admin Fees Routes', () => {
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

  const mockCreateFee = async (
    args: any,
    { respCode = 200, message = 'Server Error' }: { respCode?: number, message?: string } = {},
  ): Promise<Partial<CreateOrUpdateAdminFeeResponse>> => {
    let createdFee;
    let createdRules;
    await request(app)
      .post('/api/v1/admin/fees')
      .set('x-auth-token', token)
      .send(args)
      .expect(respCode)
      .expect(({ body }) => {
        if (respCode !== 200) {
          expect(body.error).to.containSubset({ message });
          return;
        }
        createdFee = body.data.fee;
        createdRules = body.data.rules;
        expect(createdFee).to.include({ createdBy: 0, updatedAt: null, removedAt: null });
        expect(new Date(createdFee.createdAt)).to.be.closeToTime(new Date(), 1);
        expect(createdFee).to.containSubset(args.fee);
        expect(createdRules).to.be.an('array');
        expect(createdRules).to.deep.containSubset(args.rules);
        createdRules.forEach((rule) => expect(rule).to.have.property('adminFeeId', createdFee.id));
      });
    if (createdFee && createdFee.id) {
      const dbFee = await pg('admin_fees').where({ id: createdFee.id }).first();
      const dbDraftFee = await pg('admin_fees').where({ draftId: createdFee.id }).first();
      expect(dbDraftFee).to.containSubset(args.fee);
      expect(dbFee).to.containSubset({ draftId: null, percent: null });
    }
    if (createdRules && createdRules.length)
      for (const { adminFeeId, countryId, percent } of createdRules) {
        const dbRule = await pg('admin_fee_rules').where({ adminFeeId, countryId }).first();
        expect(dbRule).to.containSubset({ draftId: null, percent: null });
        const dbDraftRule = await pg('admin_fee_rules').where({ draftId: dbRule.id }).first();
        expect(dbDraftRule).to.containSubset({ adminFeeId, percent, countryId });
      }
    return { fee: createdFee, rules: createdRules };
  };

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

  describe('#CREATE', () => {
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
    });
    it('can create fee', async () =>
      mockCreateFee({ fee: { percent: 44, name: 'test-fee' }, rules: [] }));
    it('can create fee with rule', async () =>
      mockCreateFee({
        fee: {
          percent: 44,
          name: 'test-fee',
        },
        rules: [
          {
            countryId: 'MT',
            percent: 21,
          },
        ],
      }));
    it('creates fee with multiple rules', async () =>
      mockCreateFee({
        fee: {
          percent: 44,
          name: 'test-fee',
        },
        rules: [
          {
            countryId: 'MT',
            percent: 21,
          },
          {
            countryId: 'US',
            percent: 21,
          },
        ],
      }));
    it('does not create fee with multiple rules with same country', async () =>
      mockCreateFee(
        {
          fee: {
            percent: 44,
            name: 'test-fee',
          },
          rules: [
            {
              countryId: 'MT',
              percent: 21,
            },
            {
              countryId: 'MT',
              percent: 21,
            },
          ],
        },
        { respCode: 500 },
      ));
  });

  describe('#READ', () => {
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
      const [dbFee, dbRules, dbAffs] = await insertFakeData()
      expect(dbFee).to.containSubset(fakeData.fee);
      expect(dbRules).to.containSubset(fakeData.rules);
      expect(dbAffs).to.containSubset(fakeData.affiliates);
      fee = dbFee;
      rules = dbRules;
      affFees = dbAffs;
    });

    it('can get fees', async () => {
      await request(app)
        .get('/api/v1/admin/fees')
        .set('x-auth-token', token)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            fees: [
              {
                adminFeeId: fee.id,
                name: fee.name,
                active: fee.active,
                percent: fee.percent,
                nextMonthPercent: fee.percent,
                isRunning: true,
                updatedAt: null,
                draftRemovedAt: null,
              },
            ],
          });
        });
    });

    it('can get fee', async () => {
      await request(app)
        .get(`/api/v1/admin/fees/${fee.id}`)
        .set('x-auth-token', token)
        .expect(200)
        .expect(({ body }) => {
          const { fee: feeResp, rules: rulesResp, affiliates: affsResp } = body.data;
          expect(feeResp).to.containSubset({
            name: fee.name,
            active: fee.active,
            percent: fee.percent,
            nextMonthPercent: fee.percent,
            isRunning: true,
            updatedAt: null,
          });
          expect(rulesResp).to.have.length(rules.length);
          expect(rulesResp).to.containSubset(rules.map((r) => _.pick(r, ['countryId', 'percent'])));
          expect(affsResp).to.be.an('array');
          affsResp.forEach((affResp) => {
            expect(affResp).to.have.property('affiliateId', affFees[0].affiliateId);
            const thisAffFees = affFees.filter(
              ({ affiliateId, period }) =>
                affiliateId === affResp.affiliateId && !period.isBefore(DateTime.local()),
            );
            expect(affResp.brands).to.be.an('array');
            expect(affResp.brands).to.containSubset(
              thisAffFees.map(({ brandId, period }) => ({
                brandId,
                periodFrom: period.start.toISODate(),
                periodTo: period.end.minus({ days: 1 }).toISODate(),
              })),
            );
          });
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

      it('can get fees', async () => {
        await request(app)
          .get('/api/v1/admin/fees')
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            const { fees: feesResp } = body.data;
            expect(feesResp).to.containSubset([
              {
                adminFeeId: fee.id,
                name: fee2?.name,
                active: fee.active,
                percent: fee.percent,
                nextMonthActive: fee2?.active,
                nextMonthPercent: fee.percent,
                isRunning: true,
                createdAt: fee2?.createdAt,
                updatedAt: fee2?.updatedAt,
                draftRemovedAt: null,
              },
            ]);
          });
      });

      it('can get fee', async () => {
        await request(app)
          .get(`/api/v1/admin/fees/${fee.id}`)
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            const { fee: feeResp, rules: rulesResp } = body.data;
            expect(feeResp).to.containSubset({
              name: fee2?.name,
              active: fee2?.active,
              percent: fee.percent,
              nextMonthPercent: fee2?.percent,
              isRunning: true,
              updatedAt: fee2?.updatedAt,
            });
            rulesResp.forEach((ruleResp) => {
              const rule1 = rules.find((r) => r.countryId === ruleResp.countryId);
              const rule2 = rules2?.find((r) => r.countryId === ruleResp.countryId);
              expect(_.compact<number>([rule1?.percent, rule2?.percent])).to.not.be.empty();
              expect(ruleResp).to.containSubset({
                percent: rule1?.percent || null,
                nextMonthPercent: rule2?.percent || null,
              });
            });
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

      it('can get fees', async () => {
        await request(app)
          .get('/api/v1/admin/fees')
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            const { fees: feesResp } = body.data;
            expect(feesResp).to.containSubset([
              {
                adminFeeId: fee.id,
                name: fee.name,
                active: fee.active,
                percent: fee.percent,
                nextMonthPercent: null,
                isRunning: true,
                updatedAt: null,
              },
            ]);
            expect(new Date(feesResp[0].draftRemovedAt)).to.be.closeToTime(new Date(), 1);
          });
      });

      it('can get fee', async () => {
        await request(app)
          .get(`/api/v1/admin/fees/${fee.id}`)
          .set('x-auth-token', token)
          .expect(200)
          .expect(({ body }) => {
            const { fee: feeResp, rules: rulesResp, affiliates: affsResp } = body.data;
            expect(feeResp).to.containSubset({
              name: fee.name,
              active: fee.active,
              percent: fee.percent,
              nextMonthPercent: null,
              isRunning: true,
              updatedAt: null,
            });
            expect(new Date(feeResp.draftRemovedAt)).to.be.closeToTime(new Date(), 1);
            expect(rulesResp).to.have.length(rules.length);
            expect(rulesResp).to.containSubset(
              rules.map((r) => _.pick(r, ['countryId', 'percent'])),
            );
            expect(affsResp).to.be.an('array');
            affsResp.forEach((affResp) => {
              expect(affResp).to.have.property('affiliateId', affFees[0].affiliateId);
              const thisAffFees = affFees.filter(
                ({ affiliateId, period }) =>
                  affiliateId === affResp.affiliateId && !period.isBefore(DateTime.local()),
              );
              expect(affResp.brands).to.be.an('array');
              expect(affResp.brands).to.containSubset(
                thisAffFees
                  .filter(({ period }) => period.contains(new Date()))
                  .map(({ brandId, period }) => ({
                    brandId,
                    periodFrom: period.start.toISODate(),
                    periodTo: DateTime.fromJSDate(new Date()).endOf('month').toISODate(),
                  })),
              );
            });
          });
      });
    });
  });

  describe('#UPDATE', () => {
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
      const [dbFee, dbRules] = await insertFakeData();
      expect(dbFee).to.containSubset(fakeData.fee);
      expect(dbRules).to.containSubset(fakeData.rules);
      fee = dbFee;
      rules = dbRules;
    });

    it('can update fee', async () =>
      mockUpdateFee({
        fee: { name: 'test-fee2', percent: 10, active: false },
        rules: [
          { countryId: 'FI', percent: 13 },
          { countryId: 'MT', percent: 14 },
          { countryId: 'US', percent: 16 },
        ],
      }));

    it('only updates changed fields', async () =>
      mockUpdateFee({
        fee: { name: 'test-fee', percent: 10, active: true },
        rules: [
          { countryId: 'FI', percent: 12 },
          { countryId: 'MT', percent: 13 },
          { countryId: 'US', percent: 16 },
        ],
      }));

    it('deletes rules not in request', async () =>
      mockUpdateFee({
        fee: { name: 'test-fee', percent: 10, active: false },
        rules: [
          { countryId: 'FI', percent: 12 },
          { countryId: 'MT', percent: 13 },
        ],
      }));

    it('creates newly added rules', async () =>
      mockUpdateFee({
        fee: { name: 'test-fee', percent: 11, active: true },
        rules: [
          { countryId: 'FI', percent: 12 },
          { countryId: 'MT', percent: 13 },
          { countryId: 'BR', percent: 16 },
        ],
      }));

    it('can handle malformed fee in request', async () =>
      mockUpdateFee(
        {
          fee: { percent: 10, active: false },
          rules: [
            { countryId: 'FI', percent: 12 },
            { countryId: 'MT', percent: 13 },
            { countryId: 'US', percent: 16 },
          ],
        },
        { respCode: 400 },
      ));

    it('can handle malformed rules in request', async () =>
      mockUpdateFee(
        {
          fee: { name: 'test-fee', percent: 11, active: true },
          rules: [
            { countryId: 0, percent: 12 },
            { countryId: 'MT', percent: 13 },
            { countryId: 'US', percent: 16 },
          ],
        },
        { respCode: 400 },
      ));
  });

  describe('#DELETE', () => {
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
      affFees = dbAffs;
    });

    it('can delete fee', async () => {
      await request(app)
        .delete(`/api/v1/admin/fees/${fee.id}`)
        .set('x-auth-token', token)
        .expect(200)
        .expect(({ body }) => {
          expect(body).to.have.property('data').that.has.property('ok', true);
        });
      const dbFee = await pg('admin_fees').where({ id: fee.id }).first();
      const dbDraftFee = await pg('admin_fees').where({ draftId: fee.id }).first();
      const dbAffFees = await pg('admin_fee_affiliates')
        .where({ adminFeeId: fee.id })
        .whereNull('draftId');
      const dbDraftAffFees = await pg('admin_fee_affiliates')
        .where({ adminFeeId: fee.id })
        .whereNotNull('draftId');

      expect(dbFee).to.have.property('removedAt', null);
      expect(dbDraftFee).to.have.property('removedAt').that.is.closeToTime(new Date(), 1);

      affFees
        .filter(({ period }) => period.isAfter(DateTime.local()))
        .forEach((futureAffFee) => {
          const dbAffFee = dbAffFees.find(({ id }) => id === futureAffFee.id);
          expect(dbAffFee)
            .to.exist()
            .and.to.have.property('removedAt')
            .that.is.closeToTime(new Date(), 1);
          const dbDraftAffFee = dbDraftAffFees.find(({ draftId }) => draftId === futureAffFee.id);
          expect(dbDraftAffFee).not.to.exist();
        });

      affFees
        .filter(({ period }) => period.isBefore(DateTime.local()))
        .forEach((pastAffFee) => {
          const dbAffFee = dbAffFees.find(({ id }) => id === pastAffFee.id);
          expect(dbAffFee).to.exist().and.to.have.property('removedAt', null);
          const dbDraftAffFee = dbDraftAffFees.find(({ draftId }) => draftId === pastAffFee.id);
          expect(dbDraftAffFee).not.to.exist();
        });

      affFees
        .filter(({ period }) => period.contains(DateTime.local()))
        .forEach((runningAffFee) => {
          const dbAffFee = dbAffFees.find(({ id }) => id === runningAffFee.id);
          expect(dbAffFee).to.exist().and.to.have.property('removedAt', null);
          const dbDraftAffFee = dbDraftAffFees.find(({ draftId }) => draftId === runningAffFee.id);
          expect(dbDraftAffFee).to.exist();
          expect(dbDraftAffFee).to.have.property('removedAt').that.is.closeToTime(new Date(), 1);
          expect(dbDraftAffFee).to.have.property('createdAt').that.is.closeToTime(new Date(), 1);
          expect(dbDraftAffFee)
            .to.have.property('period')
            .that.satisfies(({ end }) =>
              end.equals(DateTime.utc().plus({ months: 1 }).startOf('month')),
            );
        });
    });
  });
});
