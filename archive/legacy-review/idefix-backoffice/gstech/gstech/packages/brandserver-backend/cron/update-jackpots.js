/* @flow */
const _ = require('lodash');

process.env.NODE_ENV = process.env.NODE_ENV || 'production'; // production is default
const api = require('../src/server/common/api');
const ds = require('../src/server/common/datastorage');

const lottoGames = ['eurojackpot', 'euromillions', 'megamillions', 'powerball'];

type JackpotArrayItem = {
  permalink: {
    permalink: string,
  },
  amount: number,
  currency: string,
};
const updateJackpots = async () => {
  await ds.init();
  const jackpots = await api.getJackpots();

  const jackpotsArray: JackpotArrayItem[] = jackpots
    .map((jp) =>
      jp.currencies.map((cu) => ({
        permalink: jp.permalink,
        amount: cu.amount,
        currency: cu.currency,
      })),
    )
    .filter((x) => x.permalink != null);

  const ret: { [key: any]: any } = {};
  // $FlowIgnore[underconstrained-implicit-instantiation]
  for (const jp of _.flatten(jackpotsArray)) {
    const { permalink } = jp.permalink;
    const game = ds.games().permalinks[permalink];
    if (game != null) {
      ret[permalink] = ret[permalink] || {};
      ret[permalink][jp.currency] = jp.amount;

      const category = _.includes(lottoGames, permalink) ? 'Lotto' : game.Category;
      ret[category] = ret[category] || {};
      ret[category][jp.currency] = Number(
        parseFloat(ret[category][jp.currency] || 0) + parseFloat(jp.amount),
      ).toFixed(2);
    }
  }
  await ds.set('jackpots', ret);
  process.exit(0);
};

updateJackpots();
