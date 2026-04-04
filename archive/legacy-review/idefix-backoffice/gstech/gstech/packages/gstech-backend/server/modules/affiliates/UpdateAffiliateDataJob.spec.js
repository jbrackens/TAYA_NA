/* @flow */
// eslint-disable max-len
const nock = require('nock');  
const UpdateAffiliateDataJob = require('./UpdateAffiliateDataJob');
const Affiliate = require('./Affiliate');

// nock.recorder.rec();

nock('http://localhost:4000', { encodedQueryParams: true })
  .get('/api/v1/affiliates')
  .reply(200, { data:
    {
      affiliates: [
        { affiliateId: '1000436', affiliateName: 'SweGaming Affiliates AB' }
      ]
    }
  });

describe('Affiliate data', function test(this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);

  it(
    'fetches updated affiliates and stores them',
    async () => {
      await UpdateAffiliateDataJob.update();
      const aff = await Affiliate.find('1000436');
      expect(aff).to.deep.equal(
        {
          id: '1000436',
          name: 'SweGaming Affiliates AB',
        },
      );
    },
  );
});
