/* @flow */
const { calculateHash } = require('./hash');

describe('Pragmatic hash', () => {
  it('can validate hash', async () => {
    const r = {
      amount: '4775.0',
      gameId: 'vs20cm',
      hash: '8755a7b4700e9ab5314d720810263ab2',
      providerId: 'PragmaticPlay',
      reference: '5a39132b6b2f070007ca35dc',
      roundDetails: 'spin',
      roundId: '2352571690',
      timestamp: '1513689899389',
      userId: 'LD_Janne.Hietamaki_3000001',
    };
    const hash = await calculateHash('testKey', r);
    expect(hash).to.equal(r.hash);
  });
});
