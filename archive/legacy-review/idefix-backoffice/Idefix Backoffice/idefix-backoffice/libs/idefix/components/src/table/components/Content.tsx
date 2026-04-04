import React, { FC, ReactElement, useCallback, useRef } from "react";
import { VariableSizeList } from "react-window";
import TableBody from "@mui/material/TableBody";
import AutoSizer from "react-virtualized-auto-sizer";
import isEmpty from "lodash/isEmpty";

import Row from "./Row";
import EmptySearch from "./EmptySearch";
import { GeneratedRowProps } from "../types";
import LoadingText from "./LoadingText";

const DEFAULT_ROW_HEIGHT = 48;
const BORDER_SIZE = 1;
const ROW_HEIGHT = DEFAULT_ROW_HEIGHT + BORDER_SIZE;

interface Props {
  data: any[];
  columns: ReactElement<GeneratedRowProps>[];
  isLoading: boolean;
  displayRows?: number;
  estimatedItemSize?: number;
}

const Content: FC<Props> = ({ data, columns, isLoading, displayRows, estimatedItemSize }) => {
  const listRef = useRef<VariableSizeList>(null);
  const rowHeights = useRef<{ [key: number]: number }>({});
  const itemSize = estimatedItemSize ? estimatedItemSize : ROW_HEIGHT;

  const getRowHeight = (index: number) => rowHeights.current[index] || itemSize;

  const setRowHeight = (index: number, size: number) => {
    listRef.current?.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size + BORDER_SIZE };
  };

  const getTableHeight = useCallback(() => {
    if (displayRows) {
      if (data.length < displayRows) {
        return itemSize * data.length;
      } else {
        return itemSize * displayRows;
      }
    }

    return itemSize * data.length;
  }, [data.length, displayRows, itemSize]);

  if (isEmpty(data) && !isLoading) {
    return <EmptySearch />;
  }

  if (isLoading) {
    return <LoadingText />;
  }

  return (
    <TableBody component="div" style={{ height: getTableHeight() }}>
      <AutoSizer>
        {({ height, width }) => (
          <VariableSizeList
            ref={listRef}
            height={height}
            width={width}
            itemData={data}
            itemSize={getRowHeight}
            estimatedItemSize={estimatedItemSize}
            itemCount={data.length}
            overscanCount={8}
          >
            {props => <Row {...props} columns={columns} handleRowHeight={setRowHeight} />}
          </VariableSizeList>
        )}
      </AutoSizer>
    </TableBody>
  );
};

export default Content;
