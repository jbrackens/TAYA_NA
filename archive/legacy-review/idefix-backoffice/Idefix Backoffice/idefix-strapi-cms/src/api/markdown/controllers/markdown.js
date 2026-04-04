'use strict';

/**
 * markdown controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::markdown.markdown');
