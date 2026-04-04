"use strict";

/**
 * promotion controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

// module.exports = createCoreController('api::promotion.promotion');

module.exports = createCoreController(
  "api::promotion.promotion",
  ({ strapi }) => ({
    async findOne(ctx) {
      const { id: slug } = ctx.params;

      const query = {
        filters: { slug },
        ...ctx.query,
      };

      const entity = await strapi.entityService.findMany(
        "api::promotion.promotion",
        query
      );

      if (entity.length !== 0 && entity[0]) {
        if (entity[0].publishedAt !== null) {
          const results = await this.sanitizeOutput(entity, ctx);

          return this.transformResponse(results[0]);
        }
        return null;
      }

      return null;
    },
  })
);
