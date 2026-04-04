/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Links Repository', () => {
  let linkId;
  let code;
  it('can get affiliate links', async () => {
    const links = await repository.getAffiliateLinks(pg, 3232323);
    expect(links).to.deep.equal([
      {
        id: 1,
        affiliateId: 3232323,
        planId: null,
        brandId: 'CJ',
        code: links[0].code,
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
        deal: null,
      },
      {
        id: 2,
        affiliateId: 3232323,
        planId: null,
        brandId: 'KK',
        code: links[1].code,
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
        deal: null,
      },
      {
        id: 3,
        affiliateId: 3232323,
        planId: null,
        brandId: 'LD',
        code: links[2].code,
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
        deal: null,
      },
      {
        id: 4,
        affiliateId: 3232323,
        planId: null,
        brandId: 'OS',
        code: links[3].code,
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
        deal: null,
      },
    ]);
  });

  it('can get affiliate link', async () => {
    const link = await repository.getAffiliateLink(pg, 3232323, 1);
    expect(link).to.deep.equal({
      id: 1,
      affiliateId: 3232323,
      planId: null,
      brandId: 'CJ',
      code: link.code,
      name: 'Beautiful name of the Link',
      landingPage: 'https://beta.luckydino.com/en',
      deal: null,
    });
  });

  it('can get affiliate link by code', async () => {
    const [{ code: codeNew }] = await repository.getAffiliateLinks(pg, 3232323);
    const link = await repository.getAffiliateLinkByCode(pg, codeNew);
    code = codeNew;
    expect(link).to.deep.equal({
      id: 1,
      affiliateId: 3232323,
      planId: null,
      brandId: 'CJ',
      code,
      name: 'Beautiful name of the Link',
      landingPage: 'https://beta.luckydino.com/en',
      deal: null,
    });
  });

  it('can get affiliate link clicks with statistics', async () => {
    const clicks = await repository.getAffiliateLinkClicksWithStatistics(pg, 5454545, 5, {
      from: DateTime.utc(2019, 10, 1),
      to: DateTime.utc(2019, 12, 1),
    });
    expect(clicks).to.deep.equal([
      {
        clickDate: '2019-10-01',
        segment: '',
        clicks: 0,
        nrc: 0,
        ndc: 0,
        deposits: 11000,
        turnover: 21000,
        grossRevenue: 5100,
        bonuses: 1100,
        adjustments: 1600,
        fees: 110,
        tax: 110,
        netRevenue: 4100,
        commission: 110,
        cpa: 1100,
        cpaCount: 1,
      },
      {
        clickDate: '2019-10-01',
        segment: 'dummy_segment',
        clicks: 1,
        nrc: 1,
        ndc: 1,
        deposits: 0,
        turnover: 0,
        grossRevenue: 0,
        bonuses: 0,
        adjustments: 0,
        fees: 0,
        tax: 0,
        netRevenue: 0,
        commission: 0,
        cpa: 0,
        cpaCount: 0,
      },
      {
        clickDate: '2019-10-15',
        segment: '',
        clicks: 0,
        nrc: 0,
        ndc: 0,
        deposits: 25000,
        turnover: 35000,
        grossRevenue: 6500,
        bonuses: 2500,
        adjustments: 3000,
        fees: 250,
        tax: 250,
        netRevenue: 5500,
        commission: 250,
        cpa: 2500,
        cpaCount: 1,
      },
      {
        clickDate: '2019-10-15',
        segment: 'dummy_segment',
        clicks: 1,
        nrc: 0,
        ndc: 0,
        deposits: 0,
        turnover: 0,
        grossRevenue: 0,
        bonuses: 0,
        adjustments: 0,
        fees: 0,
        tax: 0,
        netRevenue: 0,
        commission: 0,
        cpa: 0,
        cpaCount: 0,
      },
      {
        clickDate: '2019-10-31',
        segment: '',
        clicks: 0,
        nrc: 0,
        ndc: 0,
        deposits: 41000,
        turnover: 51000,
        grossRevenue: 8100,
        bonuses: 4100,
        adjustments: 4600,
        fees: 410,
        tax: 410,
        netRevenue: 7100,
        commission: 410,
        cpa: 4100,
        cpaCount: 1,
      },
      {
        clickDate: '2019-10-31',
        segment: 'dummy_segment',
        clicks: 1,
        nrc: 0,
        ndc: 0,
        deposits: 0,
        turnover: 0,
        grossRevenue: 0,
        bonuses: 0,
        adjustments: 0,
        fees: 0,
        tax: 0,
        netRevenue: 0,
        commission: 0,
        cpa: 0,
        cpaCount: 0,
      },
      {
        clickDate: '2019-11-01',
        segment: '',
        clicks: 0,
        nrc: 0,
        ndc: 0,
        deposits: 11000,
        turnover: 21000,
        grossRevenue: 5100,
        bonuses: 1100,
        adjustments: 1600,
        fees: 110,
        tax: 110,
        netRevenue: 4100,
        commission: 110,
        cpa: 1100,
        cpaCount: 1,
      },
      {
        clickDate: '2019-11-01',
        segment: 'dummy_segment',
        clicks: 1,
        nrc: 0,
        ndc: 0,
        deposits: 0,
        turnover: 0,
        grossRevenue: 0,
        bonuses: 0,
        adjustments: 0,
        fees: 0,
        tax: 0,
        netRevenue: 0,
        commission: 0,
        cpa: 0,
        cpaCount: 0,
      },
      {
        clickDate: '2019-11-15',
        segment: '',
        clicks: 0,
        nrc: 0,
        ndc: 0,
        deposits: 25000,
        turnover: 35000,
        grossRevenue: 6500,
        bonuses: 2500,
        adjustments: 3000,
        fees: 250,
        tax: 250,
        netRevenue: 5500,
        commission: 250,
        cpa: 2500,
        cpaCount: 1,
      },
      {
        clickDate: '2019-11-15',
        segment: 'dummy_segment',
        clicks: 1,
        nrc: 0,
        ndc: 0,
        deposits: 0,
        turnover: 0,
        grossRevenue: 0,
        bonuses: 0,
        adjustments: 0,
        fees: 0,
        tax: 0,
        netRevenue: 0,
        commission: 0,
        cpa: 0,
        cpaCount: 0,
      },
      {
        clickDate: '2019-11-30',
        segment: 'dummy_segment',
        clicks: 1,
        nrc: 0,
        ndc: 0,
        deposits: 40000,
        turnover: 50000,
        grossRevenue: 8000,
        bonuses: 4000,
        adjustments: 4500,
        fees: 400,
        tax: 400,
        netRevenue: 7000,
        commission: 400,
        cpa: 4000,
        cpaCount: 1,
      },
    ]);
  });

  it('can create affiliate link', async () => {
    const link = await repository.createAffiliateLink(
      pg,
      {
        planId: null,
        brandId: 'LD',
        name: 'TEST_LINK',
        landingPage: 'https://luckydino.com/test_landing',
      },
      3232323,
    );

    linkId = link.id;
    code = link.code;
    expect(linkId).to.not.equal(undefined);
    expect(code).to.not.equal(undefined);
    expect(link).to.deep.equal({
      id: linkId,
      affiliateId: 3232323,
      planId: null,
      brandId: 'LD',
      code,
      name: 'TEST_LINK',
      landingPage: 'https://luckydino.com/test_landing',
    });
  });

  it('can update affiliate link', async () => {
    const link = await repository.updateAffiliateLink(pg, linkId, {
      planId: 1,
      brandId: 'LD',
      name: 'TEST_LINK',
      landingPage: 'https://luckydino.com/test_landing',
    });

    expect(link).to.deep.equal({
      id: linkId,
      affiliateId: 3232323,
      planId: 1,
      brandId: 'LD',
      code,
      name: 'TEST_LINK',
      landingPage: 'https://luckydino.com/test_landing',
    });
  });

  it('can delete affiliate link', async () => {
    const count = await repository.deleteAffiliateLink(pg, linkId);
    expect(count).to.be.equal(1);

    const link = await repository.getAffiliateLinkByCode(pg, code);
    expect(link).to.be.equal(undefined);
  });

  it('can create click with minimal data', async () => {
    const clickDraft = {
      linkId: 1,
      clickDate: DateTime.utc().toJSDate(),
      ipAddress: '127.0.0.1',
      userAgent: 'UA',
      referer: 'referer',
    };

    const click = await repository.createClick(pg, clickDraft);

    expect(click).to.deep.equal({
      id: click.id,
      referralId: null,
      segment: null,
      queryParameters: null,
      ...clickDraft,
    });
  });

  it('can create click with full data', async () => {
    const clickDraft = {
      linkId: 1,
      clickDate: DateTime.utc().toJSDate(),
      referralId: 'rid',
      segment: 'default',
      queryParameters: {
        rid: 'rid',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'UA',
      referer: 'referer',
    };

    const click = await repository.createClick(pg, clickDraft);

    expect(click).to.deep.equal({
      id: click.id,
      ...clickDraft,
    });
  });
});
