import { NextRouter } from "next/router";

export const addQueryParam = (
  param: { [key: string]: string },
  router: NextRouter,
) => {
  const allQueries = {
    ...router.query,
    ...param,
  };

  let filteredQueries = Object.keys(allQueries)
    .filter((k) => allQueries[k])
    .reduce((a, k) => ({ ...a, [k]: allQueries[k] }), {});

  router.push(
    {
      query: {
        ...filteredQueries,
      },
    },
    undefined,
    { shallow: true },
  );
};
