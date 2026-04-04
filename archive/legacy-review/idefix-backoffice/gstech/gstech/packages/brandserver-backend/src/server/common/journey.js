/* @flow */
// import type { Journey as CJourney } from './api';

const configuration = require('./configuration');

const { Journey } = (configuration.requireProjectFile('journey'): any);
const api = require('./api');
const { mapBalance } = require('./modules/balance/helper');
const { mapBonuses } = require('./modules/bonus/helper');

const createJourney = async (req: express$Request, extraTags: string[] = []): Promise<any> => { // FIXME: type as Journey
  const { balance, player, bonuses } = await api.getFullDetails(req);
  const j = new Journey(req, mapBalance(req, balance), mapBonuses(req, bonuses), player, extraTags);
  await j.init();
  return j;
};

const createNonloggedinJourney = (req: express$Request): any => new Journey(req);

module.exports = { Journey, createJourney, createNonloggedinJourney };
