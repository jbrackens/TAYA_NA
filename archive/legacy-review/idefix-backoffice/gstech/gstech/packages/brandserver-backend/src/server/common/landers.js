/* @flow */


const _ = require('lodash');
const utils = require('./utils');
const dataStorage = require("./datastorage");
const { Journey } = require('./journey');
const logger = require('./logger');

type LanderSubType = 'login' | 'register' | 'redirect' | 'cms' | 'register-fullscreen' | 'legacy';

export type LanderRules = {
  tags: string[],
};

export type LanderContent = {
  title: string,
  subtitle: string,
  additional: string,
  actionheading: string,
  additionalheading: string,
  action: string,
  text: string,
};

export type LanderDef = {
  bonus: ?string,
  id: string,
  source: ?string,
  image: ?string,
  rules?: LanderRules,
  enabled: boolean,
  location: ?string,
  type?: ?LanderSubType,
  [lang: string]: LanderContent,
};

const get = (req: express$Request, id: string, force: boolean = false): ?LanderDef => {
  const l = dataStorage.lander(id);
  const journey = new Journey(req);
  if (_.isArray(l)) {
    for (const page of l) {
      if (force || journey.matchRules({ tags: page.tags || [] })) {
        return page;
      }
    }
    if (utils.isWhitelistedIp(req)) {
      // TODO: fix this eslint error from bumping eslint-config-airbnb
      // eslint-disable-next-line no-unreachable-loop
      for (const page2 of l) {
        logger.debug('Showing landing page because of whitelisting', id);
        return page2;
      }
    }
  }
  return null;
};

module.exports = { get };
