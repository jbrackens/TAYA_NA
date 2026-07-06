import { ParsedQs } from "qs";

export type ParsedQueryPagination = {
  currentPage: number;
  itemsPerPage: number;
};

export type ParsedQueryFilters = {
  [key: string]: string | number;
};

export type ParsedQuerySorting = {
  field: string;
  order: string;
};

export type ParsedQuery =
  | ParsedQs
  | {
      pagination: ParsedQueryPagination;
      sorting: ParsedQuerySorting;
      filters?: ParsedQueryFilters;
    };
