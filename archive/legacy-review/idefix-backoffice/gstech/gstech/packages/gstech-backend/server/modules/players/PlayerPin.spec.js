/* @flow */
const pg = require('gstech-core/modules/pg');
const PlayerPin = require('./PlayerPin');

describe('PlayerPins', () => {
  it('can validate pin code', async () => {
    const mobilePhone = '490394573231';
    const pinCode = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);
    const check = await PlayerPin.validatePin(pg, mobilePhone, pinCode, 'reset');

    expect(check).to.equal(true);
  });

  it('can get old pin if not expired', async () => {
    const mobilePhone = '490394573232';
    const pinCode1 = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);
    const pinCode2 = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);

    expect(pinCode1).to.equal(pinCode2);

    const check1 = await PlayerPin.validatePin(pg, mobilePhone, pinCode1, 'reset');
    const check2 = await PlayerPin.validatePin(pg, mobilePhone, pinCode2, 'reset');

    expect(check1).to.equal(true);
    expect(check2).to.equal(false);
  });

  it('can get new pin if expired', async () => {
    const mobilePhone = '490394573232';
    const pinCode1 = await PlayerPin.createPin(pg, mobilePhone, 'reset', -1);
    const pinCode2 = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);

    expect(pinCode1).to.not.equal(pinCode2);

    const check1 = await PlayerPin.validatePin(pg, mobilePhone, pinCode1, 'reset');
    const check2 = await PlayerPin.validatePin(pg, mobilePhone, pinCode2, 'reset');

    expect(check1).to.equal(false);
    expect(check2).to.equal(true);
  });

  it('can overwrite pin code with new pin type', async () => {
    const mobilePhone = '490394573230';
    const pinCode1 = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);
    const pinCode2 = await PlayerPin.createPin(pg, mobilePhone, 'activate', 1);

    expect(pinCode1).to.not.equal(pinCode2);

    const check1 = await PlayerPin.validatePin(pg, mobilePhone, pinCode1, 'reset');
    const check2 = await PlayerPin.validatePin(pg, mobilePhone, pinCode2, 'activate');

    expect(check1).to.equal(false);
    expect(check2).to.equal(true);
  });

  it('can fail validation when using same pin more than once', async () => {
    const mobilePhone = '490394573230';
    const pinCode = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);
    const check = await PlayerPin.validatePin(pg, mobilePhone, pinCode, 'reset');

    expect(check).to.equal(true);

    const check2 = await PlayerPin.validatePin(pg, mobilePhone, pinCode, 'reset');
    expect(check2).to.equal(false);
  });

  it('can fail validation with wrong pin code', async () => {
    const mobilePhone = '490394573233';
    await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);
    const check = await PlayerPin.validatePin(pg, mobilePhone, '213548', 'reset');

    expect(check).to.equal(false);
  });

  it('can fail validation with wrong pin type', async () => {
    const mobilePhone = '490394573234';
    const pinCode = await PlayerPin.createPin(pg, mobilePhone, 'reset', 1);
    const check = await PlayerPin.validatePin(pg, mobilePhone, pinCode, 'activate');

    expect(check).to.equal(false);
  });

  it('can fail validation with expired pins', async () => {
    const mobilePhone = '490394573235';
    const pinCode = await PlayerPin.createPin(pg, mobilePhone, 'reset', -1);
    const check = await PlayerPin.validatePin(pg, mobilePhone, pinCode, 'reset');

    expect(check).to.equal(false);
  });

  it('can delete expired pin', async () => {
    const check = await PlayerPin.deleteExpired(pg);
    expect(check > 0).to.equal(true);
  });
});
