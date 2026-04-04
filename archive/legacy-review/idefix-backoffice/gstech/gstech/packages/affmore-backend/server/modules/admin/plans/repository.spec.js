/* @flow */
const { DateTime } = require('luxon');

// const authRepository = require('../auth/repository');
const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Plans Repository', () => {
  let planId;
  let ruleId;
  it('can get plans with statistics', async () => {
    const plans = await repository.getPlansWithStatistics(pg);
    expect(plans).to.deep.equal([{
      id: 1,
      name: 'FI: deposit: €100 cpa: €25',
      nrs: null,
      cpa: 0,
      archived: false,
      rules: 3,
      usages: 8,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
    }, {
      id: 2,
      name: 'Global: 0% / FI: deposit: €100 cpa: €25',
      nrs: 0,
      cpa: 1000,
      archived: false,
      rules: 3,
      usages: 195,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toJSDate(),
    }, {
      id: 3,
      name: 'Global: 45% / FI: deposit: €100 cpa: €25',
      nrs: 45,
      cpa: 1000,
      archived: false,
      rules: 3,
      usages: 4,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 13, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 13, 18, 15, 30).toJSDate(),
    }, {
      id: 4,
      name: 'Global: 50% / FI: deposit: €100 cpa: €25',
      nrs: 50.5,
      cpa: 0,
      archived: false,
      rules: 3,
      usages: 4,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    }, {
      id: 5,
      name: 'Default Plan',
      nrs: null,
      cpa: 0,
      archived: false,
      rules: 0,
      usages: 0,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
    }, {
      id: 500,
      name: "Zero Plan",
      nrs: 0,
      cpa: 0,
      rules: 0,
      usages: 10,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    }]);
  });

  it('can get plans', async () => {
    const plans = await repository.getPlans(pg);
    expect(plans).to.deep.equal([{
      id: 1,
      name: 'FI: deposit: €100 cpa: €25',
      nrs: null,
      cpa: 0,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
    }, {
      id: 2,
      name: 'Global: 0% / FI: deposit: €100 cpa: €25',
      nrs: 0,
      cpa: 1000,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 12, 18, 15, 30).toJSDate(),
    }, {
      id: 3,
      name: 'Global: 45% / FI: deposit: €100 cpa: €25',
      nrs: 45,
      cpa: 1000,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 13, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 13, 18, 15, 30).toJSDate(),
    }, {
      id: 4,
      name: 'Global: 50% / FI: deposit: €100 cpa: €25',
      nrs: 50.5,
      cpa: 0,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    }, {
      id: 5,
      name: 'Default Plan',
      nrs: null,
      cpa: 0,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
    }, {
      id: 500,
      name: "Zero Plan",
      nrs: 0,
      cpa: 0,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    }]);
  });

  it('can get plan', async () => {
    const plan = await repository.getPlan(pg, 1);
    expect(plan).to.deep.equal({
      id: 1,
      name: 'FI: deposit: €100 cpa: €25',
      nrs: null,
      cpa: 0,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
    });
  });

  it('can get plan by name', async () => {
    const plan = await repository.getPlanByName(pg, 'FI: deposit: €100 cpa: €25');
    expect(plan).to.deep.equal({
      id: 1,
      name: 'FI: deposit: €100 cpa: €25',
      nrs: null,
      cpa: 0,
      archived: false,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),
    });
  });

  it('can archive plan', async () => {
    let plan = await repository.getPlanByName(pg, 'Plan to archive');
    if (plan) await repository.deletePlan(pg, plan.id);

    plan = await repository.createPlan(pg, {
      name: 'Plan to archive',
      nrs: null,
      cpa: 2000,
      archived: false,
    }, 1);

    expect(plan).to.deep.equal({
      id: plan.id,
      name: 'Plan to archive',
      nrs: null,
      cpa: 2000,
      archived: false,
      createdBy: 1,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });

    let plans = await repository.getPlans(pg);
    plans = plans.filter(p => p.name === 'Plan to archive');
    expect(plans.length).to.be.at.least(1);

    plan = await repository.updatePlan(pg, plan.id, ({
      name: 'Plan to archive',
      nrs: 50.5,
      cpa: 2000,
      archived: true,
    }));
    expect(plan).to.deep.equal({
      id: plan.id,
      name: 'Plan to archive',
      nrs: 50.5,
      cpa: 2000,
      archived: true,
      createdBy: 1,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });

    plans = await repository.getPlans(pg);
    plans = plans.filter(p => p.name === 'Plan to archive');
    expect(plans.length).to.be.equal(0);

    const count = await repository.deletePlan(pg, plan.id);
    expect(count).to.be.equal(1);
  });

  it('can create plan', async () => {
    const plan = await repository.createPlan(pg, {
      name: 'Test_Plan',
      nrs: null,
      cpa: 2000,
      archived: false,
    }, 1);
    planId = plan.id;
    expect(plan).to.deep.equal({
      id: plan.id,
      name: 'Test_Plan',
      nrs: null,
      cpa: 2000,
      archived: false,
      createdBy: 1,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });
  });

  it('can update plan', async () => {
    const plan = await repository.updatePlan(pg, planId, ({
      name: 'Test_Plan',
      nrs: 50.5,
      cpa: 2000,
      archived: false,
    }));
    expect(plan).to.deep.equal({
      id: planId,
      name: 'Test_Plan',
      nrs: 50.5,
      cpa: 2000,
      archived: false,
      createdBy: 1,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });
  });

  it('can create rule', async () => {
    const rule = await repository.createRule(pg, {
      countryId: 'FI',
      nrs: 50.5,
      cpa: 3000,
      deposit: 2000,
      deposit_cpa: 1000,
    }, planId);
    ruleId = rule.id;
    expect(rule).to.deep.equal({
      id: rule.id,
      planId,
      countryId: 'FI',
      nrs: 50.5,
      cpa: 3000,
      deposit: 2000,
      deposit_cpa: 1000,
    });
  });

  it('can update rule', async () => {
    const rule = await repository.updateRule(pg, ruleId, ({
      countryId: 'FI',
      nrs: 50.5,
      cpa: 5000,
      deposit: 2000,
      deposit_cpa: 1000,
    }));
    expect(rule).to.deep.equal({
      id: ruleId,
      planId,
      countryId: 'FI',
      nrs: 50.5,
      cpa: 5000,
      deposit: 2000,
      deposit_cpa: 1000,
    });
  });

  it('can delete rule', async () => {
    const count = await repository.deleteRule(pg, ruleId);
    expect(count).to.be.equal(1);
  });

  it('can create many rules', async () => {
    const rules = await repository.createRules(pg, [{
      countryId: 'FI',
      nrs: 50.5,
      cpa: 5000,
      deposit: 2000,
      deposit_cpa: 1000,
    }, {
      countryId: null,
      nrs: 40,
      cpa: 4000,
      deposit: 1000,
      deposit_cpa: 2000,
    }], planId);

    expect(rules).to.deep.equal([{
      id: rules[0].id,
      planId,
      countryId: 'FI',
      nrs: 50.5,
      cpa: 5000,
      deposit: 2000,
      deposit_cpa: 1000,
    }, {
      id: rules[1].id,
      planId,
      countryId: null,
      nrs: 40,
      cpa: 4000,
      deposit: 1000,
      deposit_cpa: 2000,
    }]);
  });

  it('can get rule by country', async () => {
    const ruleOrPlan = await repository.getRuleOrPlan(pg, planId, 'FI');
    expect(ruleOrPlan).to.deep.equal({
      planId,
      ruleId: ruleOrPlan && ruleOrPlan.ruleId,
      nrs: 50.5,
      cpa: 5000,
      deposit: 2000,
      deposit_cpa: 1000,
    });
  });

  it('can get default rule if no country found', async () => {
    const ruleOrPlan = await repository.getRuleOrPlan(pg, planId, 'US');
    expect(ruleOrPlan).to.deep.equal({
      planId,
      ruleId: ruleOrPlan && ruleOrPlan.ruleId,
      nrs: 40,
      cpa: 4000,
      deposit: 1000,
      deposit_cpa: 2000,
    });
  });

  it('can delete all rules', async () => {
    const count = await repository.deleteRules(pg, planId);
    expect(count).to.be.equal(2);
  });

  it('can delete plan', async () => {
    const count = await repository.deletePlan(pg, planId);
    expect(count).to.be.equal(1);

    const plan = await repository.getPlan(pg, planId);
    expect(plan).to.be.equal(undefined);
  });

  it('can get rules', async () => {
    const rules = await repository.getRules(pg, 1);
    expect(rules).to.deep.equal([{
      id: 1,
      planId: 1,
      countryId: 'FI',
      nrs: 25,
      cpa: 1000,
      deposit: 15000,
      deposit_cpa: 3000,
    }, {
      id: 2,
      planId: 1,
      countryId: 'DE',
      nrs: 30,
      cpa: 2000,
      deposit: 10000,
      deposit_cpa: 2500,
    }, {
      id: 3,
      planId: 1,
      countryId: 'SE',
      nrs: 25,
      cpa: 1000,
      deposit: 15000,
      deposit_cpa: 3000,
    }]);
  });

  it('can get rather rule', async () => {
    const ruleOrPlan = await repository.getRuleOrPlan(pg, 1, 'SE');
    expect(ruleOrPlan).to.deep.equal({
      planId: 1,
      ruleId: 3,
      nrs: 25,
      cpa: 1000,
      deposit: 15000,
      deposit_cpa: 3000,
    });
  });

  it('can get rather plan', async () => {
    const ruleOrPlan = await repository.getRuleOrPlan(pg, 1, 'US');
    expect(ruleOrPlan).to.deep.equal({
      planId: 1,
      ruleId: null,
      nrs: null,
      cpa: 0,
      deposit: null,
      deposit_cpa: null,
    });
  });

  it('can get related affiliates', async () => {
    const affiliates = await repository.getRelatedAffiliates(pg, 1);
    expect(affiliates).to.deep.equal([{
      id: 3232323,
      name: 'Giant Affiliate',
      email: 'elliot@gmail.com',
    }, {
      id: 5454545,
      name: 'Mega Affiliate',
      email: 'bravo@gmail.com',
    }, {
      id: 100000,
      name: 'Random Affiliate',
      email: 'some100000@gmail.com',
    }, {
      id: 100001,
      name: 'Random Affiliate',
      email: 'some100001@gmail.com',
    }, {
      id: 7676767,
      name: 'Super Affiliate',
      email: 'snow@gmail.com',
    }]);
  });
});
