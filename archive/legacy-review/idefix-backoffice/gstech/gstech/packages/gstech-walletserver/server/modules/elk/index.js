/* @flow */
import type { GameServerModule } from '../../types';

const router = require('./router');
const api = require('./api');
const config = require('../../../config');

const configuration = config.providers.elk;

const gameModule: GameServerModule = { api, router, configuration };
module.exports = gameModule;
