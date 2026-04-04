'use strict';

/**
 * markdown service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::markdown.markdown');
