/* @flow */

import type { GameDef } from './games';

const indexOf = require('lodash/indexOf');
const sortBy = require('lodash/sortBy');

const sort = (games: Partial<GameDef>[], recommendations: string[]): Array<Partial<GameDef>> => {
  const indexedGames = games.map((game, idx) => ({ idx, game }));
  const sorted = sortBy(indexedGames, ({ game, idx }) => {
    const boostIndex = indexOf(recommendations, game.Permalink);
    const normalIndex = 10 * (idx + 1);
    if (boostIndex > -1) {
      return Math.min(normalIndex, (1 + boostIndex) * 10 + 15);
    }
    return normalIndex;
  });
  // $FlowFixMe[missing-type-arg]
  return sorted.map<Partial<GameDef>>(({ game }) => game);
};

const recommend = (req: express$Request, games: any[]): Array<GameDef> | Array<any> => {
  const topgames = req.session.topgames || [];
  if (topgames.length === 0) {
    return games;
  }
  return sort(games, topgames);
};

module.exports = { recommend, sort };
