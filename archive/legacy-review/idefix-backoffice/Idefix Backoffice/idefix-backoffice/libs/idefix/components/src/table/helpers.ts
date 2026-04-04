import getTime from "date-fns/getTime";
import { ColumnProps } from "./types";

export function getCsvHeaders(columns: ColumnProps[]) {
  return columns.map(({ label, name }) => ({ label, key: name }));
}

export function getSearchByKeys<T>(columns: ColumnProps[]) {
  return columns.map(({ name }) => name) as unknown as (keyof T)[];
}

export function sortByDirection(array: any[], key: string, direction: "asc" | "desc") {
  const arrayCopy = [...array];

  return arrayCopy.sort((item1, item2) => {
    let firstItem = item1[key];
    let secondItem = item2[key];

    if (key.toLowerCase().includes("date")) {
      firstItem = getTime(new Date(firstItem));
      secondItem = getTime(new Date(secondItem));
    }

    if (firstItem < secondItem) return direction === "asc" ? -1 : 1;
    if (secondItem < firstItem) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

export const formatDataByKeys = (
  data: { [key: string]: any }[],
  keysToFormat: { key: string; format: (value: any, row: any) => any }[],
) => {
  return data.map(item => {
    const formattedItem = { ...item };

    keysToFormat.forEach(({ key, format }) => {
      formattedItem[key] = format(item[key], item);
    });

    return formattedItem;
  });
};

export const createColumnsToCsv = (
  columns: ColumnProps[],
  keysToExclude: string[],
  columnsToAdd?: { label: string; name: string }[],
) => {
  let filteredColumns;
  
  if (columnsToAdd) {
    filteredColumns = columns.filter(({ name }) => !keysToExclude.includes(name)).concat(columnsToAdd as ColumnProps[]);
  } else {
    filteredColumns = columns.filter(({ name }) => !keysToExclude.includes(name));
  }

  return getCsvHeaders(filteredColumns);
};
