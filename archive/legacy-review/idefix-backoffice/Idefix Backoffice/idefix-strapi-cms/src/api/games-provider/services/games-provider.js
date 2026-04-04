'use strict';

/**
 * games-provider service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::games-provider.games-provider');
