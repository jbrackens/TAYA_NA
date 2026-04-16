export type QueryParams = {
  remove: (param: string) => void;
};

export const useQueryParams = (): QueryParams => {
  const remove = (param: string) => {
    const queryParams = new URLSearchParams(window.location.search);

    if (!queryParams.has(param)) return;

    queryParams.delete(param);

    const paramsCopy = queryParams.toString().length
      ? `?${queryParams.toString()}`
      : "";

    history.replaceState({}, "", window.location.pathname + paramsCopy);
  };

  return {
    remove,
  };
};
