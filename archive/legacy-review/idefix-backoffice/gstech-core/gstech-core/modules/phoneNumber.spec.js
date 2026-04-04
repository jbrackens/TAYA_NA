/* @flow */
const { parse, tryParse, format, formatMasked, isValid } = require('./phoneNumber');

describe('PhoneNumber formatting', () => {
  it('can parse phone number', () => {
    expect(parse('+358601223441', 'FI')).to.equal('358601223441');
    expect(parse('358601223441', 'FI')).to.equal('358601223441');
    expect(parse('+358 601223441', 'FI')).to.equal('358601223441');
    expect(parse('+49073032694', 'DE')).to.equal('4973032694');
    expect(parse('4973032694', 'DE')).to.equal('4973032694');
  });

  it('can fail parsing bad phone number', () => {
    expect(parse.bind(parse, '+35861', 'FI')).to.throw('The phone number has wrong format \'+35861\'');
    expect(parse.bind(parse, '601223441', 'FI')).to.throw('The phone number has wrong format \'601223441\'');
    expect(parse.bind(parse, '+441', 'FI')).to.throw('The string supplied is too short to be a phone number');
    expect(parse.bind(parse, 'dasdasd', 'DE')).to.throw('The string supplied did not seem to be a phone number');
  });

  it('can fail parsing bad phone number', () => { // TODO: these are temporary tests that expect null instead of error
    expect(tryParse('+35861', 'FI')).to.equal(null);
    expect(tryParse('601223441', 'FI')).to.equal(null);
    expect(tryParse('+441', 'FI')).to.equal(null);
    expect(tryParse('dasdasd', 'DE')).to.equal(null);
  });

  it('can format phone number', () => {
    expect(format('358601223441', 'FI')).to.equal('+358601223441');
    expect(format('358601223441', 'FI')).to.equal('+358601223441');
    expect(format('358601223441', 'FI')).to.equal('+358601223441');
    expect(format('4973032694', 'DE')).to.equal('+4973032694');
  });

  it('can fail formating bad phone number', () => {
    expect(format.bind(format, '338601223441', 'FI')).to.throw('The phone number has wrong format \'338601223441\'');
    expect(format.bind(format, '358', 'FI')).to.throw('The string supplied is too short to be a phone number');
    expect(format.bind(format, '00000', 'FI')).to.throw('Invalid country calling code');
    expect(format.bind(format, 'fsdfsdf', 'DE')).to.throw('The string supplied did not seem to be a phone number');
  });

  it('can format phone number with mask', () => {
    expect(formatMasked('358601223441', 'FI')).to.equal('+358 ******3441');
    expect(formatMasked('358601223441', 'FI')).to.equal('+358 ******3441');
    expect(formatMasked('358601223441', 'FI')).to.equal('+358 ******3441');
    expect(formatMasked('4973032694', 'DE')).to.equal('+49 *****2694');
  });

  it('can validate phone number', () => {
    expect(isValid('358601223441', 'FI')).to.equal(true);
    expect(isValid('+358601223441', 'FI')).to.equal(true);
    expect(isValid('+358 601223441', 'FI')).to.equal(true);
    expect(isValid('49073032694', 'DE')).to.equal(true);

    expect(isValid('328601223441', 'FI')).to.equal(false);
    expect(isValid('358601', 'FI')).to.equal(false);
    expect(isValid('+', 'FI')).to.equal(false);
    expect(isValid('fsdfsdfsdf', 'DE')).to.equal(false);
  });
});
