/* @flow */
const nock = require('nock');  
const pg = require('gstech-core/modules/pg');
const webHook = require('./webHook');

// nock.recorder.rec();
nock('http://localhost')
  .post('/webhook?rid=sampleRetardId&uid=354732&segment=dummy_segment').times(2).reply(200, { ok: true });

nock('http://localhost')
  .post('/webhook?rid=sampleRetardId&uid=354733&segment=dummy_segment').times(2).reply(500, { ok: false });

describe('Web Hook Tests', () => {
  before(() => pg('callback_logs').delete());

  it('can handle callback for a player registration', async () => {
    const player: any = {
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,
      brandId: 'LD',
      countryId: 'CA',
      registrationDate: '2019-10-01 02:00:00',
    };

    const result = await webHook.handleCallback(pg, player, 'NRC');
    expect(result).to.be.equal(true);
  });

  it('can handle callback for a player deposit', async () => {
    const player: any = {
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,
      brandId: 'LD',
      countryId: 'CA',
      registrationDate: '2019-10-01 02:00:00',
    };

    const result = await webHook.handleCallback(pg, player, 'NDC');
    expect(result).to.be.equal(true);
  });

  it('can handle callback for a player registration with error from callback', async () => {
    const player: any = {
      id: 354733,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,
      brandId: 'LD',
      countryId: 'CA',
      registrationDate: '2019-10-01 02:00:00',
    };

    const result = await webHook.handleCallback(pg, player, 'NRC');
    expect(result).to.be.equal(false);
  });

  it('can handle callback for a player deposit', async () => {
    const player: any = {
      id: 354733,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,
      brandId: 'LD',
      countryId: 'CA',
      registrationDate: '2019-10-01 02:00:00',
    };

    const result = await webHook.handleCallback(pg, player, 'NDC');
    expect(result).to.be.equal(false);
  });
});
