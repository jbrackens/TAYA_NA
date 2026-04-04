/* @flow */
const request = require('supertest');  

const pg = require('gstech-core/modules/pg');

const app = require('../../app');
const repository = require('../admin/affiliates/links/repository');

describe('Legacy click Routes', () => {
  it('can handle player click', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/click/0/${code}`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal(null);
        expect(click && click.segment).to.be.equal(null);
      })
      .expect(302);
  });

  it('can handle player click with segment', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/click/1/${code}/default`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal(null);
        expect(click && click.segment).to.be.equal('default');
      })
      .expect(302);
  });

  it('can handle player click with segment as query param', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/click/1/${code}?segment=default`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal(null);
        expect(click && click.segment).to.be.equal('default');
      })
      .expect(302);
  });
});


describe('Clicks Routes', () => {
  it('can handle player click', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/clk/${code}`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal(null);
        expect(click && click.segment).to.be.equal(null);
      })
      .expect(302);
  });

  it('can handle affiliate referral', async () => {
    await request(app)
      .get('/ref/123123?url=https://affmore.com/xxx')
      .expect(async (res) => {
        expect(res.headers.location).to.equal('https://affmore.com/xxx');
        expect(res.headers['set-cookie']).to.match(/affmore-ref=123123; Max-Age(.*)/);
      })
      .expect(302);
  });

  it('can handle player click with segment', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/clk/${code}/default`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal(null);
        expect(click && click.segment).to.be.equal('default');
      })
      .expect(302);
  });

  it('can handle player click with segment as query parameter', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/clk/${code}?segment=default`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal(null);
        expect(click && click.segment).to.be.equal('default');
      })
      .expect(302);
  });

  it('can handle player click with segment and query parameters', async () => {
    const [{ id, code }] = await repository.getAffiliateLinks(pg, 3232323);
    await request(app)
      .get(`/clk/${code}/default?rid=dadada`)
      .expect(async (res) => {
        const { location } = res.headers;

        const redirectUrl = location.match(/https:\/\/beta.luckydino.com\/en\?rid=dadada&btag=.+/);
        const clickId = Number(location.match(/\d+$/));

        const clicks = await repository.getClicks(pg, id);
        const click = clicks.find(c => c.id === clickId);

        expect(redirectUrl).to.have.lengthOf.at.least(1);
        expect(click).to.not.be.equal(undefined);
        expect(click && click.referralId).to.be.equal('dadada');
        expect(click && click.segment).to.be.equal('default');
        expect(click && click.queryParameters).to.deep.equal({
          rid: 'dadada',
        });
      })
      .expect(302);
  });
});
