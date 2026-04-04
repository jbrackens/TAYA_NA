'use strict';

/**
 * markdown router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::markdown.markdown');
