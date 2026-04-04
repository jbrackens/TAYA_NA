/* @flow */
const { allowsWithdrawals } = require('./validate');

describe('Withdrawal validation', () => {
  it('does not allow withdrawal to MasterCard', async () => {
    expect(allowsWithdrawals({
      account: '550000******0004',
      method: 'CreditCard',
    })).to.equal(false);
  });

  it('allows withdrawals to VISA', async () => {
    expect(allowsWithdrawals({
      account: '411111******1111',
      method: 'CreditCard',
    })).to.equal(true);
  });
});
