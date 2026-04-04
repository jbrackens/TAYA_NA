/* @flow */
import type { GameServerModule } from '../../types';

const api = require('./api');
const config = require('../../../config');

const configuration = config.providers.lottowarehouse;

const gameModule: GameServerModule = { api, router: undefined, configuration };
module.exports = gameModule;