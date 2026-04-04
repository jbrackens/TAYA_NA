/* @flow */
const joi = require('./joi');

describe('Joi rules', () => {
  it('handles express array query param with single object', async () => {
    const { value, error } = joi.queryParam().items(joi.number()).validate('123');
    expect(value).to.deep.equal([123]);
    expect(error).to.equal(null);
  });

  it('handles express array query param with multiple items', async () => {
    const { value, error } = joi.queryParam().items(joi.number()).validate(['123', '234']);
    expect(value).to.deep.equal([123, 234]);
    expect(error).to.equal(null);
  });

  it('handles express plain string query param with multiple items', async () => {
    const { value, error } = joi.queryParam().items(joi.number()).validate('123,234');
    expect(value).to.deep.equal([123, 234]);
    expect(error).to.equal(null);
  });

  it('formats IBAN number', async () => {
    const { value, error } = joi.string().iban().validate('fi2112345600008739');
    expect(value).to.equal('FI2112345600008739');
    expect(error).to.equal(null);
  });

  it('accepts canadian bank account', async () => {
    const { error } = joi.string().bankAccount().validate('012312312312123');
    expect(error).to.equal(null);
  });

  it('fails with invalid IBAN number', async () => {
    const { error } = joi.string().iban().validate('fi2112345600008759');
    expect(error.message).to.equal('"value" Not a valid IBAN number');
  });

  it('passes with valid BIC number', () => {
    const { value, error } = joi.string().bic().validate('DABAIE2D');
    expect(error).to.equal(null);
    expect(value).to.equal('DABAIE2D');
  });

  it('passes with valid SWIFT number', () => {
    const { value, error } = joi.string().bic().validate('AABAFI22TMS');
    expect(error).to.equal(null);
    expect(value).to.equal('AABAFI22TMS');
  });

  it('fails with invalid BIC number', () => {
    const { error } = joi.string().bic().validate('2ABAIE2D');
    expect(error.message).to.equal('"value" Not a valid BIC/SWIFT number');
  });
});
