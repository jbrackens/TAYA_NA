/* @flow */

const client = require('gstech-core/modules/clients/complianceserver-api');
const superClient = require('gstech-core/modules/superClient');
const ports = require('gstech-core/modules/ports');

const app = require('../../api-server');

// nock.recorder.rec();

describe('Ip module', () => {
  describe('client', () => {
    it('return if ip address matches vpn/tor addresses', async () => {
      await superClient(app, ports.complianceServer.port, client)
        .call((api) => api.checkIp('11.11.11.11'))
        .expect(200, (result) => {
          // TODO: how to mock ip addresses preparation?
          expect(result).to.deep.equal({ matched: false })
        });
    });
  });
});
