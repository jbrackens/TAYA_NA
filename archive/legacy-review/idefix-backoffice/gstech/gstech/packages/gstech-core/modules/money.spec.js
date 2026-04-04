// @flow
const { formatCurrency } = require('./money');

describe('Money', () => {
  it('can format finnish euro amounts', () => {
    expect(formatCurrency(10000.3, 'EUR', 'fi')).to.equal('10 000,30 €');
  });

  it('can format swedish krona amounts', () => {
    expect(formatCurrency(10000.3, 'SEK', 'sv')).to.equal('10 000,30 kr');
  });

  it('can format negative amounts', () => {
    expect(formatCurrency(-10000.3, 'EUR', 'en')).to.equal('-€10,000.30');
  });
});
