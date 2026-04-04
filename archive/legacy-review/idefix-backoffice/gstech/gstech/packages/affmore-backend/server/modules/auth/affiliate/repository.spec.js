/* @flow */
const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Affiliates Auth Repository', () => {
  it('can validate pin code', async () => {
    const email = 'johnny@bravo.com';
    const pinCode = await repository.createPin(pg, email, 'reset', 5);
    const check = await repository.validatePin(pg, email, pinCode, 'reset');

    expect(check).to.equal(true);
  });

  it('can validate last created pin code only', async () => {
    const email = 'johnny@bravo.com';
    const pinCode1 = await repository.createPin(pg, email, 'reset', 5);
    const pinCode2 = await repository.createPin(pg, email, 'reset', 5);
    const pinCode3 = await repository.createPin(pg, email, 'reset', 5);

    const check1 = await repository.validatePin(pg, email, pinCode1, 'reset');
    const check2 = await repository.validatePin(pg, email, pinCode2, 'reset');
    const check3 = await repository.validatePin(pg, email, pinCode3, 'reset');

    expect(check1).to.equal(false);
    expect(check2).to.equal(false);
    expect(check3).to.equal(true);
  });

  it('can fail validation when using same pin more than once', async () => {
    const email = 'johnny@bravo.com';
    const pinCode = await repository.createPin(pg, email, 'reset', 5);
    const check = await repository.validatePin(pg, email, pinCode, 'reset');

    expect(check).to.equal(true);

    const check2 = await repository.validatePin(pg, email, pinCode, 'reset');
    expect(check2).to.equal(false);
  });

  it('can fail validation with wrong pin code', async () => {
    const email = 'johnny@bravo.com';
    await repository.createPin(pg, email, 'reset', 5);
    const check = await repository.validatePin(pg, email, '213548', 'reset');

    expect(check).to.equal(false);
  });

  it('can fail validation with wrong pin type', async () => {
    const email = 'johnny@bravo.com';
    const pinCode = await repository.createPin(pg, email, 'reset', 5);
    const check = await repository.validatePin(pg, email, pinCode, 'activate');

    expect(check).to.equal(false);
  });

  it('can fail validation with expired pins', async () => {
    const email = 'johnny@bravo.com';
    const pinCode = await repository.createPin(pg, email, 'reset', -1);
    const check = await repository.validatePin(pg, email, pinCode, 'reset');

    expect(check).to.equal(false);
  });

  it('can delete expired pin', async () => {
    const check = await repository.deleteExpiredPins(pg);
    expect(check > 0).to.equal(true);
  });
});
