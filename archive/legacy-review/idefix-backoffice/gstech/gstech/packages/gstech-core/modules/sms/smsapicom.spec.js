/* @flow */
const { determineSender } = require('./smsapicom');

describe('smsapicom', () => {
  describe('determineSender', () => {
    it('takes sender of not overridden country from sender field', () => {
      const result = determineSender('+37259824111');

      expect(result).to.equal('SMSAuth');
    });

    it('can override sender', () => {
      const result = determineSender('+18882422100');

      expect(result).to.equal('1');
    });

    it('works for branded config as well', () => {
      const result = determineSender('+18882422100', 'KK');

      expect(result).to.equal('JustWOW');
    });
  });
});
