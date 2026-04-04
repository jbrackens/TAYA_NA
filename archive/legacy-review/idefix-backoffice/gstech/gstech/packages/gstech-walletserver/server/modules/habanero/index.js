/* @flow */
import type { GameServerModule } from '../../types';

const router = require('./WalletServer');
const api = require('./api');
const config = require('../../../config');

const configuration = config.providers.habanero;

const gameModule: GameServerModule = { api, router, configuration };
module.exports = gameModule;