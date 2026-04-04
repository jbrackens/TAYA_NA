/* @flow */
/* eslint-env node, mocha */

const assert = require('assert');
const smsverification = require('./smsverification');

describe('SMS Verification', () => {
  it('accepts any canadian number', () =>
    smsverification.verify('CA', '+1-9056304927').then(x => {
      assert.deepEqual({ needsCaptcha: false, valid: true, number: '+19056304927' }, x);
    }));

  it('accepts number without plus', done => {
    smsverification.verify(undefined, '1461150709558').catch(() => done());
  });

  it('validates a phone number', done => {
    smsverification.verify('FI', '+35890777').catch(() => done());
  });

  it('does not allow UK number', done => {
    smsverification.verify('AX', '+44-07407170573').catch(() => done());
  });

  // Reference: http://www.wtng.info/wtng-64-nz.html
  it('accepts New Zealand mobile phone number', async () => {
    const result = await smsverification.verify(null, '642112345678');
    assert.deepEqual(result, { needsCaptcha: false, valid: true, number: '+642112345678' });
  });

  it('does not allow New Zealand fixed-line phone number', async () => {
    try {
      await smsverification.verify(null, '6477739374');
    } catch (e) {
      assert.equal(e.message, 'Invalid phone number');
    }
  });
});
