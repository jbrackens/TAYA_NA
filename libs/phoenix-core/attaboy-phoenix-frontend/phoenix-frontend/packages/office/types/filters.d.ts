export type TablePagination = {
  current: number;
  pageSize: number;
  total?: number;
};

export type TablePaginationResponse = {
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
};

type TableSortingOrder = "desc" | "asc" | "descend" | "ascend";

export type TableSorting = {
  order: TableSortingOrder;
  field: string;
};

export type TableFilters = {
  [key: string]: Array<any> | null;
};

export type TableFilter = {
  text: string;
  value: string | number;
};

export type TableMeta = {
  pagination: TablePagination | {};
  filters: TableFilters | {};
  sorting: TableSorting | {};
};

export type TableMetaSelector = TableMeta & {
  paginationResponse: TablePaginationResponse | {};
};
