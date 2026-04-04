/* @flow */
const joi = require('./joi');

describe('Joi rules', () => {
  it('handles express array query param with single object', async () => {
    const { value, error } = joi.queryParam().items(joi.number()).validate('123');
    expect(value).to.deep.equal([123]);
    expect(error).to.not.exist();
  });

  it('handles express array query param with multiple items', async () => {
    const { value, error } = joi.queryParam().items(joi.number()).validate(['123', '234']);
    expect(value).to.deep.equal([123, 234]);
    expect(error).to.not.exist();
  });

  it('handles express plain string query param with multiple items', async () => {
    const { value, error } = joi.queryParam().items(joi.number()).validate('123,234');
    expect(value).to.deep.equal([123, 234]);
    expect(error).to.not.exist();
  });

  it('formats IBAN number', async () => {
    const { value, error } = joi.string().trim().iban().validate('fi2112345600008739');
    expect(value).to.equal('FI2112345600008739');
    expect(error).to.not.exist();
  });

  it('accepts canadian bank account', async () => {
    const { error } = joi.string().trim().bankAccount().validate('012312312312123');
    expect(error).to.not.exist();
  });

  it('fails with invalid IBAN number', async () => {
    const { error } = joi.string().trim().iban().validate('fi2112345600008759');
    expect(error?.message).to.equal('"value" is not a valid IBAN number');
  });

  it('passes with valid BIC number', () => {
    const { value, error } = joi.string().trim().bic().validate('DABAIE2D');
    expect(error).to.not.exist();
    expect(value).to.equal('DABAIE2D');
  });

  it('passes with valid SWIFT number', () => {
    const { value, error } = joi.string().trim().bic().validate('AABAFI22TMS');
    expect(error).to.not.exist();
    expect(value).to.equal('AABAFI22TMS');
  });

  it('can validate brandId', () => {
    const { value, error } = joi.string().trim().brandId().validate('LD');
    expect(error).to.not.exist();
    expect(value).to.equal('LD');
  });

  it('fails with invalid BIC number', () => {
    const { error } = joi.string().trim().bic().validate('2ABAIE2D');
    expect(error?.message).to.equal('"value" is not a valid BIC/SWIFT number');
  });

  it('can decrypt config value', () => {
    const { value } = joi.string().trim().decrypt().validate('GS[Pou7iRb+spwYqIvmBjjB/LiwvffOBORK+xSk0qV3DaQt7DJ99z2lTMUmWlxmxA87+A==]');
    expect(value).to.equal('tokens_LD');
  });

  it('can fail decrypt config value', () => {
    const { error } = joi.string().trim().decrypt().validate('GS[wrong-key]');
    expect(error?.message).to.equal('"value" cannot be decrypted');
  });
});
