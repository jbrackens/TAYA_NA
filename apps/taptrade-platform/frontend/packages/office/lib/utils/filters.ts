import { first, isArray, isEmpty } from "lodash";
import {
  TablePagination,
  TablePaginationResponse,
  TableSorting,
  TableFilter,
} from "types/filters";
import { EnumedObject } from "types/utils";

const FILTER_PAGINATION_DEFAULT_SIZE = 10;

type RefCollection = {
  [key: string]: any;
};

export class RefsCollection {
  private items: RefCollection = {};

  public get = (key: string) => {
    return this.items[key];
  };

  public set = (key: string, ref: any) => {
    this.items = {
      ...this.items,
      [key]: ref,
    };
  };
}

export const buildTableFilterOptions = (
  enumedObject: EnumedObject,
  t: any,
  prefix?: string,
): TableFilter[] =>
  Object.keys(enumedObject).map((key: string) => ({
    text: t(`${prefix ? `${prefix}_` : ""}${key}`),
    value: enumedObject[key],
  }));

export const prepareTableMeta = (
  pagination: TablePagination,
  filters: any,
  sorting: TableSorting,
) => ({
  pagination: {
    currentPage: pagination.current || 1,
    itemsPerPage: pagination.pageSize || FILTER_PAGINATION_DEFAULT_SIZE,
  },
  filters: Object.keys(filters).reduce(
    (prev, key) => ({
      ...prev,
      [key]: isArray(filters[key]) ? first(filters[key]) : filters[key],
    }),
    {},
  ),
  sorting: !isEmpty(sorting)
    ? {
        order: sorting.order === "descend" ? "desc" : "asc",
        field: sorting.field,
      }
    : {},
});

export const parseTableMetaPagination = (
  pagination: TablePaginationResponse,
): TablePagination => ({
  current: pagination.currentPage || 1,
  total: pagination.totalCount,
  pageSize: pagination.itemsPerPage || FILTER_PAGINATION_DEFAULT_SIZE,
});
