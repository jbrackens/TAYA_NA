import { ParsedQueryPagination } from "../types/crud";
import { chunk, first, get, pullAt } from "lodash";

export const DEFAULT_PAGINATION: ParsedQueryPagination = {
  currentPage: 1,
  itemsPerPage: 10,
};

export const parsePagination = (pagination: ParsedQueryPagination) =>
  Object.keys(pagination).reduce(
    (prev, curr) => ({
      ...prev,
      [curr]: parseInt(get(pagination, curr), 10),
    }),
    {
      ...DEFAULT_PAGINATION,
    },
  );

export const resolvePagination = (
  data: any[],
  pagination: ParsedQueryPagination = DEFAULT_PAGINATION,
) =>
  first(
    pullAt(chunk(data, pagination.itemsPerPage), pagination.currentPage - 1),
  );

export const bypassRequest = async (req: any, res: any) => {
  const { params, body } = req;
  const { id } = params;
  const parsedId = parseInt(id, 10) || id;

  if (!parsedId) {
    return res.status(404).send();
  }

  return res.status(200).send({
    ...body,
    id: parsedId,
  });
};