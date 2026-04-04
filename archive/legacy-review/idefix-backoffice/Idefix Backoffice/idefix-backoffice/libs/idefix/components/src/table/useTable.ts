import { ReactElement, useCallback, useEffect, useState } from "react";
import difference from "lodash/difference";
import isEqual from "lodash/isEqual";
import compact from "lodash/compact";

import { sortByDirection } from "./helpers";
import { SortDirection, TableProps } from "./types";
import { useTableStyles } from "./styles";

export default function ({ initialData, children, isLoading, ...rest }: TableProps) {
  const classes = useTableStyles();
  const [data, setData] = useState(initialData);
  const [sortBy, setSortBy] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = useCallback(
    (sortKey: string, sortDirection: SortDirection) => {
      const sortedData = sortByDirection(data, sortKey, sortDirection);

      setSortBy(sortKey);
      setSortDirection(sortDirection);
      setData(sortedData);
    },
    [data]
  );

  useEffect(() => {
    const initialDiff = difference(initialData, data);
    const dataDiff = difference(data, initialData);

    if (!isEqual(initialDiff, dataDiff)) {
      if (sortBy && sortDirection) {
        const sortedData = sortByDirection(initialData, sortBy, sortDirection);
        setData(sortedData);
      } else {
        setData(initialData);
      }
    }
  }, [data, initialData, sortBy, sortDirection]);

  return {
    ...rest,
    data,
    isLoading,
    sortBy,
    classes,
    sortDirection,
    columns: compact(children as ReactElement[]),
    handleSort
  };
}
