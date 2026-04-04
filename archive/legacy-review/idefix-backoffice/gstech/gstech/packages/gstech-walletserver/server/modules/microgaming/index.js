/* @flow */
import type { GameServerModule } from '../../types';

const router = require('./wallet-router');
const api = require('./api');
const config = require('../../../config');

const configuration = config.providers.microgaming;

const gameModule: GameServerModule = { api, router, configuration };
module.exports = gameModule;
