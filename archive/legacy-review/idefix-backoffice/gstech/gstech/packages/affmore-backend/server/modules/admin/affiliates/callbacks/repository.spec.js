/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Callbacks Repository', () => {
  let callbackId;

  it('can get callbacks', async () => {
    const callbacks = await repository.getCallbacks(pg, 3232323);
    expect(callbacks).to.deep.equal([{
      id: 1,
      affiliateId: 3232323,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
      enabled: true,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    }, {
      id: 2,
      affiliateId: 3232323,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NDC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
      enabled: true,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    }]);
  });

  it('can get callback', async () => {
    const callback = await repository.getCallback(pg, 1);
    expect(callback).to.deep.equal({
      id: 1,
      affiliateId: 3232323,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
      enabled: true,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    });
  });

  it('can find callback', async () => {
    const callback = await repository.findCallback(pg, {
      affiliateId: 3232323,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
    });
    expect(callback).to.deep.equal({
      id: 1,
      affiliateId: 3232323,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
      enabled: true,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    });
  });

  it('can find callback that has no link but link is provided in the parameters', async () => {
    const callback = await repository.findCallback(pg, {
      affiliateId: 3232323,
      linkId: 666,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
    });
    expect(callback).to.deep.equal({
      id: 1,
      affiliateId: 3232323,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
      enabled: true,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toJSDate(),
    });
  });

  it('can create callback', async () => {
    const callback = await repository.createCallback(pg, 7676767, {
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
      enabled: true,
    }, 1);
    callbackId = callback.id;
    expect(callback).to.deep.equal({
      id: callback.id,
      affiliateId: 7676767,
      linkId: null,
      brandId: 'LD',
      method: 'POST',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
      enabled: true,
      createdBy: 1,
      createdAt: callback.createdAt,
      updatedAt: callback.updatedAt,
    });
  });

  it('can update callback', async () => {
    const callback = await repository.updateCallback(pg, 7676767, callbackId, ({
      linkId: null,
      brandId: 'LD',
      method: 'GET',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
      enabled: true,
    }));
    expect(callback).to.deep.equal({
      id: callbackId,
      affiliateId: 7676767,
      linkId: null,
      brandId: 'LD',
      method: 'GET',
      trigger: 'NRC',
      url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
      enabled: true,
      createdBy: 1,
      createdAt: callback.createdAt,
      updatedAt: callback.updatedAt,
    });
  });

  it('can create callback log', async () => {
    const callbackLog = await repository.createCallbackLog(pg, {
      callbackId, playerId: 354732, status: 'SUCCESS', callbackUrl: 'http://localhost/', callbackResponse: 'OK',
    });

    expect(callbackLog).to.deep.equal({
      id: callbackLog.id,
      callbackId,
      playerId: 354732,
      status: 'SUCCESS',
      callbackDate: callbackLog.callbackDate,
      callbackUrl: 'http://localhost/',
      callbackResponse: 'OK',
    });
  });

  it('can find callback log', async () => {
    const callbackLog = await repository.findCallbackLog(pg, callbackId, 354732);

    expect(callbackLog).to.deep.equal({
      id: callbackLog && callbackLog.id,
      callbackId,
      playerId: 354732,
      status: 'SUCCESS',
      callbackDate: callbackLog && callbackLog.callbackDate,
      callbackResponse: 'OK',
    });
  });

  it('can delete callback', async () => {
    const count = await repository.deleteCallback(pg, callbackId);
    expect(count).to.be.equal(1);

    const callback = await repository.getCallback(pg, callbackId);
    expect(callback).to.be.equal(undefined);
  });
});
