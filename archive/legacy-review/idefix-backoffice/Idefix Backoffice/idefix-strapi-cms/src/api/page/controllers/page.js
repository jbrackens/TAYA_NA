"use strict";

/**
 * page controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

function useQueries({ params, query }) {
  const { id: slug } = params;
  const { country } = query;
  const formattedCountry = country ? country.toUpperCase() : null;

  const initialQuery = {
    filters: {
      slug,
      ...query.filters,
    },
    ...query,
  };

  const countrySpecificQuery = {
    ...initialQuery,
    filters: {
      country: formattedCountry,
      ...initialQuery.filters,
    },
  };

  return {
    slug,
    country: formattedCountry,
    initialQuery,
    countrySpecificQuery,
  };
}

function filterResults(data, country) {
  const results = data.filter(
    (item) => item.country === country || item.country === null
  );

  return results;
}

module.exports = createCoreController("api::page.page", ({ strapi }) => ({
  async findOne(ctx) {
    const { country, initialQuery, countrySpecificQuery } = useQueries(ctx);

    const getContent = async (query) => {
      const entity = await strapi.entityService.findMany(
        "api::page.page",
        query
      );
      const results = await this.sanitizeOutput(entity, ctx);

      return results;
    };

    if (country) {
      let results;
      results = await getContent(countrySpecificQuery);

      if (results.length === 0) {
        results = await getContent(initialQuery);
      }

      const filteredResults = filterResults(results, country);

      return this.transformResponse(filteredResults[0]);
    }

    const results = await getContent(initialQuery);
    const filteredResults = filterResults(results);

    return this.transformResponse(filteredResults[0]);
  },
}));
