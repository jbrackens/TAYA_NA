/* @flow */
const request = require('supertest');  
const client = require('gstech-core/modules/clients/affiliate-backend-api');
const ports = require('gstech-core/modules/ports');
const superClient = require('gstech-core/modules/superClient');

const app = require('./api-server');

describe('Affiliate API Routes', () => {
  it('can get list of affiliate', async () => {
    await request(app)
      .get('/api/v1/affiliates')
      .expect((res) => {
        expect(res.body.data.affiliates.filter(a => [3232323, 5454545, 7676767].includes(a.affiliateId))).to.deep.equal([{
          affiliateId: 3232323,
          affiliateName: 'Giant Affiliate',
          affiliateEmail: 'elliot@gmail.com',
        }, {
          affiliateId: 7676767,
          affiliateName: 'Super Affiliate',
          affiliateEmail: 'snow@gmail.com',
        }, {
          affiliateId: 5454545,
          affiliateName: 'Mega Affiliate',
          affiliateEmail: 'bravo@gmail.com',
        }]);
      })
      .expect(200);
  });

  it('can get list of affiliate (superClient style)', async () => {
    await superClient(app, ports.affmoreBackend.apiPort, client)
      .call(api => api.getAffiliates())
      .expect(200, (result) => {
        expect(result.affiliates.filter(a => [3232323, 5454545, 7676767].includes(a.affiliateId))).to.deep.equal([{
          affiliateId: 3232323,
          affiliateName: 'Giant Affiliate',
          affiliateEmail: 'elliot@gmail.com',
        }, {
          affiliateId: 7676767,
          affiliateName: 'Super Affiliate',
          affiliateEmail: 'snow@gmail.com',
        }, {
          affiliateId: 5454545,
          affiliateName: 'Mega Affiliate',
          affiliateEmail: 'bravo@gmail.com',
        }]);
      });
  });
});
