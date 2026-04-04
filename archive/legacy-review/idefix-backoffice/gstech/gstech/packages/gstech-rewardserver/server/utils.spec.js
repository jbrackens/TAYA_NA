/* @flow */
const { weightedRandom } = require('./utils');

const table = [
  { cost: 0, weight: 0.8 },
  { cost: 1, weight: 0.199 },
  { cost: 2, weight: 0.001 },
];

describe('utils', () => {
  describe('weightedRandom', () => {
    const values = Array(100000).fill(0).map(() => weightedRandom(table)).map(({ cost }) => cost);
    const values0 = values.filter(x => x === 0).length;
    const values1 = values.filter(x => x === 1).length;
    const values2 = values.filter(x => x === 2).length;

    // Increase ranges in case this randomly fails
    expect(values0 > 79500 && values0 < 81500).to.equal(true);
    expect(values1 > 19500 && values1 < 21500).to.equal(true);
    expect(values2 > 60 && values2 < 140).to.equal(true);
  });
});
