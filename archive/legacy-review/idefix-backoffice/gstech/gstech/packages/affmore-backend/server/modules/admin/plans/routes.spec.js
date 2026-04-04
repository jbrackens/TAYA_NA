/* @flow */
const { DateTime } = require('luxon');
const request = require('supertest');  

const pg = require('gstech-core/modules/pg');
const app = require('../../../app');
const linksRepository = require('../affiliates/links/repository');

describe('Plans Routes', () => {
  let token = '';
  let planId;
  before(async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'admin@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        token = res.header['x-auth-token'];
      });
  });

  it('can get plans', async () => {
    await request(app)
      .get('/api/v1/admin/plans')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          plans: [{
            planId: 1,
            name: 'FI: deposit: €100 cpa: €25',
            nrs: null,
            isLadder: true,
            cpa: 0,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
            rules: 3,
            usages: 8,
          }, {
            planId: 2,
            name: 'Global: 0% / FI: deposit: €100 cpa: €25',
            nrs: 0,
            isLadder: false,
            cpa: 1000,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toISO(),
            rules: 3,
            usages: 195,
          }, {
            planId: 3,
            name: 'Global: 45% / FI: deposit: €100 cpa: €25',
            nrs: 45,
            isLadder: false,
            cpa: 1000,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 13, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 13, 18, 15, 30).toISO(),
            rules: 3,
            usages: 4,
          }, {
            planId: 4,
            name: 'Global: 50% / FI: deposit: €100 cpa: €25',
            nrs: 50.5,
            isLadder: false,
            cpa: 0,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            rules: 3,
            usages: 4,
          }, {
            planId: 5,
            name: 'Default Plan',
            nrs: null,
            isLadder: true,
            cpa: 0,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
            rules: 0,
            usages: 0,
          }, {
            planId: 500,
            name: "Zero Plan",
            nrs: 0,
            isLadder: false,
            cpa: 0,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            rules: 0,
            usages: 10,
          }],
        });
      })
      .expect(200);
  });

  it('can get plan', async () => {
    await request(app)
      .get('/api/v1/admin/plans/2')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          plan: {
            planId: 2,
            name: 'Global: 0% / FI: deposit: €100 cpa: €25',
            nrs: 0,
            isLadder: false,
            cpa: 1000,
            archived: false,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toISO(),
          },
          rules: [{
            ruleId: 4,
            countryId: 'FI',
            nrs: 30,
            cpa: 2000,
            deposit: 10000,
            deposit_cpa: 2500,
          }, {
            ruleId: 5,
            countryId: 'DE',
            nrs: 25,
            cpa: 1000,
            deposit: 15000,
            deposit_cpa: 3000,
          }, {
            ruleId: 6,
            countryId: 'SE',
            nrs: 30,
            cpa: 2000,
            deposit: 10000,
            deposit_cpa: 2500,
          }],
          affiliates: [
            { affiliateId: 3232323, affiliateName: 'Giant Affiliate', affiliateEmail: 'elliot@gmail.com' },
            { affiliateId: 5454545, affiliateName: 'Mega Affiliate', affiliateEmail: 'bravo@gmail.com' },
            { affiliateId: 100000, affiliateName: 'Random Affiliate', affiliateEmail: 'some100000@gmail.com' },
            { affiliateId: 100001, affiliateName: 'Random Affiliate', affiliateEmail: 'some100001@gmail.com' },
            { affiliateId: 100002, affiliateName: 'Random Affiliate', affiliateEmail: 'some100002@gmail.com' },
            { affiliateId: 100003, affiliateName: 'Random Affiliate', affiliateEmail: 'some100003@gmail.com'  },
            { affiliateId: 100004, affiliateName: 'Random Affiliate', affiliateEmail: 'some100004@gmail.com' },
            { affiliateId: 100005, affiliateName: 'Random Affiliate', affiliateEmail: 'some100005@gmail.com' },
            { affiliateId: 100006, affiliateName: 'Random Affiliate', affiliateEmail: 'some100006@gmail.com' },
            { affiliateId: 100007, affiliateName: 'Random Affiliate', affiliateEmail: 'some100007@gmail.com' },
            { affiliateId: 100008, affiliateName: 'Random Affiliate', affiliateEmail: 'some100008@gmail.com' },
            { affiliateId: 100009, affiliateName: 'Random Affiliate', affiliateEmail: 'some100009@gmail.com' },
            { affiliateId: 100010, affiliateName: 'Random Affiliate', affiliateEmail: 'some100010@gmail.com' },
            { affiliateId: 100011, affiliateName: 'Random Affiliate', affiliateEmail: 'some100011@gmail.com' },
            { affiliateId: 100012, affiliateName: 'Random Affiliate', affiliateEmail: 'some100012@gmail.com' },
            { affiliateId: 100013, affiliateName: 'Random Affiliate', affiliateEmail: 'some100013@gmail.com' },
            { affiliateId: 100014, affiliateName: 'Random Affiliate', affiliateEmail: 'some100014@gmail.com' },
            { affiliateId: 100015, affiliateName: 'Random Affiliate', affiliateEmail: 'some100015@gmail.com' },
            { affiliateId: 100016, affiliateName: 'Random Affiliate', affiliateEmail: 'some100016@gmail.com' },
            { affiliateId: 100017, affiliateName: 'Random Affiliate', affiliateEmail: 'some100017@gmail.com' },
            { affiliateId: 100018, affiliateName: 'Random Affiliate', affiliateEmail: 'some100018@gmail.com' },
            { affiliateId: 7676767, affiliateName: 'Super Affiliate', affiliateEmail: 'snow@gmail.com' },
          ],
        });
      })
      .expect(200);
  });

  it('can create plan without rules', async () => {
    await request(app)
      .post('/api/v1/admin/plans')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_NO_RULES',
          nrs: null,
          cpa: 0,
        },
        rules: [],
      })
      .expect((res) => {
        planId = res.body.data.plan.planId;
        expect(res.body.data).to.containSubset({
          plan: {
            name: 'TEST_PLAN_WITH_NO_RULES',
            nrs: null,
            isLadder: true,
            cpa: 0,
            createdBy: 0,
          },
          rules: [],
        });

      })
      .expect(200);
  });

  it('can delete plan without rules', async () => {
    await request(app)
      .delete(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .expect(200);
  });

  it('can create plan', async () => {
    await request(app)
      .post('/api/v1/admin/plans')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: null,
          cpa: 0,
          archived: false,
        },
        rules: [{
          ruleId: 4,
          countryId: 'FI',
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }],
      })
      .expect((res) => {
        planId = res.body.data.plan.planId;
        expect(res.body.data).to.deep.equal({
          plan: {
            planId,
            name: 'TEST_PLAN_WITH_RULES',
            nrs: null,
            isLadder: true,
            cpa: 0,
            archived: false,
            createdBy: 0,
            createdAt: res.body.data.plan.createdAt,
            updatedAt: res.body.data.plan.updatedAt,
          },
          rules: [{
            ruleId: res.body.data.rules[0].ruleId,
            countryId: 'FI',
            nrs: 30,
            cpa: 2000,
            deposit: 10000,
            deposit_cpa: 2500,
          }],
        });
      })
      .expect(200);
  });

  it('can fail create plan with existing name', async () => {
    await request(app)
      .post('/api/v1/admin/plans')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          cpa: 0,
        },
        rules: [{
          ruleId: 4,
          countryId: 'FI',
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }],
      })
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Plan with this name already exists',
        });
      })
      .expect(409);
  });


  it('can update plan with rule without country', async () => {
    await request(app)
      .put(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
        },
        rules: [{
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }],
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          plan: {
            planId,
            name: 'TEST_PLAN_WITH_RULES',
            nrs: 30,
            isLadder: false,
            cpa: 40,
            archived: false,
            createdBy: 0,
            createdAt: res.body.data.plan.createdAt,
            updatedAt: res.body.data.plan.updatedAt,
          },
          rules: [{
            ruleId: res.body.data.rules[0].ruleId,
            countryId: null,
            nrs: 30,
            cpa: 2000,
            deposit: 10000,
            deposit_cpa: 2500,
          }],
        });
      })
      .expect(200);
  });

  it('can fail update plan with existing name', async () => {
    await request(app)
      .put('/api/v1/admin/plans/1')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
        },
        rules: [{
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }],
      })
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Plan with this name already exists',
        });
      })
      .expect(409);
  });

  it('can update plan with combined rules', async () => {
    await request(app)
      .put(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
        },
        rules: [{
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }, {
          countryId: 'SE',
          nrs: 20,
          cpa: 3000,
          deposit: 20000,
          deposit_cpa: 3500,
        }],
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          plan: {
            planId,
            name: 'TEST_PLAN_WITH_RULES',
            nrs: 30,
            isLadder: false,
            cpa: 40,
            archived: false,
            createdBy: 0,
            createdAt: res.body.data.plan.createdAt,
            updatedAt: res.body.data.plan.updatedAt,
          },
          rules: [{
            ruleId: res.body.data.rules[0].ruleId,
            countryId: null,
            nrs: 30,
            cpa: 2000,
            deposit: 10000,
            deposit_cpa: 2500,
          }, {
            ruleId: res.body.data.rules[1].ruleId,
            countryId: 'SE',
            nrs: 20,
            cpa: 3000,
            deposit: 20000,
            deposit_cpa: 3500,
          }],
        });
      })
      .expect(200);
  });

  it('can fail update plan with many rules without country', async () => {
    await request(app)
      .put(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
        },
        rules: [{
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }, {
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }],
      })
      .expect((res) => {
        expect(res.body.error).to.deep.equal({ message: 'Server Error' });
      })
      .expect(500);
  });

  it('can update plan', async () => {
    await request(app)
      .put(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
        },
        rules: [{
          countryId: 'FI',
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }, {
          countryId: 'DE',
          nrs: 25,
          cpa: 1000,
          deposit: 15000,
          deposit_cpa: 3000,
        }],
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          plan: {
            planId,
            name: 'TEST_PLAN_WITH_RULES',
            nrs: 30,
            isLadder: false,
            cpa: 40,
            archived: false,
            createdBy: 0,
            createdAt: res.body.data.plan.createdAt,
            updatedAt: res.body.data.plan.updatedAt,
          },
          rules: [{
            ruleId: res.body.data.rules[0].ruleId,
            countryId: 'FI',
            nrs: 30,
            cpa: 2000,
            deposit: 10000,
            deposit_cpa: 2500,
          }, {
            ruleId: res.body.data.rules[1].ruleId,
            countryId: 'DE',
            nrs: 25,
            cpa: 1000,
            deposit: 15000,
            deposit_cpa: 3000,
          }],
        });
      })
      .expect(200);
  });

  it('can archive plan', async () => {
    let pId = '';
    await request(app)
      .post('/api/v1/admin/plans')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'Plan to archive',
          nrs: null,
          cpa: 0,
        },
        rules: [],
      }).expect(res => {
        pId = res.body.data.plan.planId;
      }).expect(200);

    await request(app)
      .put(`/api/v1/admin/plans/${pId}`)
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'Plan to archive',
          nrs: 30,
          cpa: 40,
          archived: true,
        },
        rules: [],
      }).expect(200);

    await request(app)
      .get('/api/v1/admin/plans')
      .set('x-auth-token', token)
      .expect((res) => {
        const aPlans = res.body.data.plans.filter((p) => p.name === 'Plan to archive');
        expect(aPlans.length).to.be.equal(0);
      })
      .expect(200);

    await request(app)
      .get(`/api/v1/admin/plans/${pId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.plan).to.deep.equal({
          planId: pId,
          name: 'Plan to archive',
          nrs: 30,
          isLadder: false,
          cpa: 40,
          archived: true,
          createdBy: 0,
          createdAt: res.body.data.plan.createdAt,
          updatedAt: res.body.data.plan.updatedAt,
        });
      })
      .expect(200);
  });

  it('can fail delete plan in use', async () => {
    const linkDraft = {
      planId,
      brandId: 'LD',
      name: 'Temp link',
      landingPage: '',
    };

    const link = await linksRepository.createAffiliateLink(pg, linkDraft, 3232323);

    await request(app)
      .delete(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Plan is in use',
        });
      })
      .expect(409);

    const count = await linksRepository.deleteAffiliateLink(pg, link.id);
    expect(count).to.be.equal(1);
  });

  it('can delete plan with rules', async () => {
    await request(app)
      .delete(`/api/v1/admin/plans/${planId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can fail get plan if not found', async () => {
    await request(app)
      .get('/api/v1/admin/plans/9999999')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Plan not found',
          },
        });
      })
      .expect(404);
  });

  it('can fail update plan if not found', async () => {
    await request(app)
      .put('/api/v1/admin/plans/9999999')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
        },
        rules: [{
          countryId: 'FI',
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }, {
          countryId: 'DE',
          nrs: 25,
          cpa: 1000,
          deposit: 15000,
          deposit_cpa: 3000,
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Server Error',
          },
        });
      })
      .expect(404);
  });

  it('can fail archive plan that is in use', async () => {
    await request(app)
      .put('/api/v1/admin/plans/1')
      .set('x-auth-token', token)
      .send({
        plan: {
          name: 'TEST_PLAN_WITH_RULES',
          nrs: 30,
          cpa: 40,
          archived: true,
        },
        rules: [{
          countryId: 'FI',
          nrs: 30,
          cpa: 2000,
          deposit: 10000,
          deposit_cpa: 2500,
        }, {
          countryId: 'DE',
          nrs: 25,
          cpa: 1000,
          deposit: 15000,
          deposit_cpa: 3000,
        }],
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Plan is in use by deals or links',
          },
        });
      })
      .expect(409);
  });

  it('can fail delete plan non existing plan', async () => {
    await request(app)
      .delete('/api/v1/admin/plans/666')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Plan not found',
        });
      })
      .expect(404);
  });
});
