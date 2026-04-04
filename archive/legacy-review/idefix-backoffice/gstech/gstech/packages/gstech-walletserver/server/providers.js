/* @flow */
import type { GameProvider } from 'gstech-core/modules/constants';
import type { GameServerModule, GameProviderApi } from './types';

const { Router } = require('express');
const _ = require('lodash');

const bfgames = require('./modules/bfgames');
const booming = require('./modules/booming');
const elk = require('./modules/elk');
const eyecon = require('./modules/eyecon');
const habanero = require('./modules/habanero');
const lottowarehouse = require('./modules/lottowarehouse');
const nolimitcity = require('./modules/nolimitcity');
const microgaming = require('./modules/microgaming');
const oryx = require('./modules/oryx');
const playngo = require('./modules/playngo');
const pragmatic = require('./modules/pragmatic');
const synot = require('./modules/synot');
const thunderkick = require('./modules/thunderkick');
const williams = require('./modules/williams');
const yggdrasil = require('./modules/yggdrasil');
const betby = require('./modules/betby');
const evooss = require('./modules/evo-oss');
// const evolution = require('./modules/evolution');
// const netent = require('./modules/netent');
const redtiger = require('./modules/redtiger');
const relax = require('./modules/relax');
const delasport = require('./modules/delasport');

const gameProviders: { [GameProvider]: GameServerModule } = {
  HB: habanero,
  SGI: williams,
  BFG: bfgames,
  BOO: booming,
  ELK: elk,
  EVO: evooss,
  // NE: netent,
  RTG: redtiger,
  EYE: eyecon,
  LW: lottowarehouse,
  MGS: microgaming,
  NC: nolimitcity,
  ORX: oryx,
  PNG: playngo,
  PP: pragmatic,
  SYN: synot,
  TK: thunderkick,
  YGG: yggdrasil,
  BBY: betby,
  RLX: relax,
  DS: delasport
};

const providers: { [GameProvider]: GameProviderApi } = _.mapValues(gameProviders, (p) =>
  p.configuration.disabled ? {} : p.api,
);
const routers: { [GameProvider]: express$Router<> } = _.mapValues(gameProviders, (p) =>
  p.configuration.disabled ? new Router() : p.router,
);

module.exports = { providers, routers };
