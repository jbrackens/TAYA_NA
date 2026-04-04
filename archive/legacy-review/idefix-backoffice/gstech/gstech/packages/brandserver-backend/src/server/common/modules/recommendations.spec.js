/* @flow */
const recommendations = require('./recommendations');

describe('Recommendation orderings', () => {
  it('returns ordered games', () => {
    const input: any[] = [{ Permalink: 'game1' }, { Permalink: 'game2' }, {  Permalink: 'game3' }, { Permalink: 'game4' }, { Permalink: 'game5' }, { Permalink: 'game6' }, { Permalink: 'game7' }, { Permalink: 'game8' }, { Permalink: 'game9' }, { Permalink: 'game10' }];
    const ordered = recommendations.sort(input, ['game9', 'game10']);
    expect(ordered).to.deep.equal([{ Permalink: 'game1' }, { Permalink: 'game2' }, { Permalink: 'game9' }, { Permalink: 'game3' }, { Permalink: 'game10' }, { Permalink: 'game4' }, { Permalink: 'game5' }, { Permalink: 'game6' }, { Permalink: 'game7' }, { Permalink: 'game8' }]);
  });
});
