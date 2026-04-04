// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import values from "lodash/fp/values";

type UnknownObject = { [key: string]: any };

export const getMinWidthForCell = (column: UnknownObject) => column.minWidth;

export const getAlignPropertyForCell = (column: UnknownObject) => column.align;

export const mapCsvColumns = (columns: UnknownObject[]) => (row: UnknownObject) => {
  const ret: UnknownObject = {};

  columns.forEach(column => {
    const value = row[column.key];
    if (column.exportFormat != null) {
      ret[column.label || column.key] = column.exportFormat(value, row, true);
    } else if (column.format != null) {
      const v = column.format(value, row, true);
      if (typeof v === "string") {
        ret[column.label || column.key] = v;
      } else {
        ret[column.label || column.key] = value;
      }
    } else {
      ret[column.label || column.key] = value;
    }
  });
  return ret;
};

export const changeCssProperty = (property: string) => {
  let result: string;

  switch (property) {
    case "left":
      result = "flex-start";
      break;
    case "center":
      result = "center";
      break;
    case "right":
      result = "flex-end";
      break;
    default:
      result = property;
  }

  return result;
};

export const filterItems = (rawItems: any[], search: string) => {
  if (search === "") return rawItems;

  const filteredItems = rawItems.filter((item: any) => {
    const rowToMatch = values(item).join(" ").toLocaleLowerCase();
    return rowToMatch.indexOf(search.toLocaleLowerCase()) !== -1;
  });

  return filteredItems;
};

export const calcTableHeight = ({
  length,
  rowHeight,
  additionalHeight = 30,
  virtualized
}: {
  length: number;
  rowHeight: number;
  additionalHeight?: number;
  virtualized?: boolean;
}) => {
  if (virtualized === false) return `${length * rowHeight + additionalHeight}px`; // for screenshots
  if (!length || length > 25) return `800px`;

  return `${length * rowHeight + additionalHeight}px`;
};
