/* @flow */

const { elegibleForEmail } = require('./utils');

describe('elegibleForEmail', () => {
  const audience: any[] = [
    {
      subscriptionOptions: { emails: 'all', snoozeEmailsUntil: null },
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      gamblingProblem: false,
      invalidMobilePhone: false,
      invalidEmail: false,
      segments: ['selfexcluded'],
    },
    {
      subscriptionOptions: { emails: 'all', snoozeEmailsUntil: null },
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      gamblingProblem: false,
      invalidMobilePhone: false,
      invalidEmail: false,
      segments: [],
    },
    {
      subscriptionOptions: { emails: 'best_offers', snoozeEmailsUntil: null },
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      gamblingProblem: false,
      invalidMobilePhone: false,
      invalidEmail: false,
      segments: [],
    },
    {
      subscriptionOptions: { emails: 'new_games', snoozeEmailsUntil: null },
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      gamblingProblem: false,
      invalidMobilePhone: false,
      invalidEmail: false,
      segments: [],
    },
    {
      subscriptionOptions: { emails: 'all', smses: 'all' },
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      gamblingProblem: false,
      potentialGamblingProblem: true,
      invalidMobilePhone: false,
      invalidEmail: false,
      segments: [],
    },
  ];

  it('should filter out players with segments selfexcluded and specified subscription', () => {
    const results = audience.filter(elegibleForEmail('campaign'));

    expect(results.length).to.equal(1);
  });

  it('should filter out players not selecting "best_offers"', () => {
    const results = audience.filter(elegibleForEmail('best_offer'));

    expect(results.length).to.equal(2);
  });

  it('should filter out players not selecting "best_offers"', () => {
    const results = audience.filter(elegibleForEmail('new_game'));

    expect(results.length).to.equal(2);
  });

  it('should include absolutely all subscription options', () => {
    const results = audience.filter(elegibleForEmail('new_and_best'));

    expect(results.length).to.equal(3);
  });
});
