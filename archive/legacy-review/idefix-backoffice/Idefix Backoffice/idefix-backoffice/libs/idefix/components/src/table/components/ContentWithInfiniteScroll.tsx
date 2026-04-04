import React, { FC, ReactElement, useCallback, useRef } from "react";
import { VariableSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import TableBody from "@mui/material/TableBody";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AutoSizer from "react-virtualized-auto-sizer";
import isEmpty from "lodash/isEmpty";

import { MAX_SIZE_OF_DATA } from "@idefix-backoffice/idefix/utils";

import Row from "./Row";
import EmptySearch from "./EmptySearch";
import { GeneratedRowProps } from "../types";
import { useTableStyles } from "../styles";
import { useTheme } from "@mui/material";

const DEFAULT_ROW_HEIGHT = 48;
const BORDER_SIZE = 1;
const ROW_HEIGHT = DEFAULT_ROW_HEIGHT + BORDER_SIZE;

interface Props {
  data: any[];
  columns: ReactElement<GeneratedRowProps>[];
  isLoading: boolean;
  displayRows?: number;
  estimatedItemSize?: number;
  onLoadMore: (stopIndex: number) => void;
}

const ContentWithInfiniteScroll: FC<Props> = ({
  data,
  columns,
  isLoading,
  displayRows,
  estimatedItemSize,
  onLoadMore
}) => {
  const { palette } = useTheme();
  const classes = useTableStyles();
  const listRef = useRef<VariableSizeList>(null);
  const rowHeights = useRef<{ [key: number]: number }>({});
  const itemSize = estimatedItemSize ? estimatedItemSize : ROW_HEIGHT;
  const isItemLoaded = (index: number) => index < data.length;

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

  const loadMoreItems = useCallback(
    (_: unknown, stopIndex: number) => {
      onLoadMore(stopIndex);
    },
    [onLoadMore]
  );

  if (isEmpty(data) && !isLoading) {
    return <EmptySearch />;
  }

  return (
    <TableBody component="div" style={{ height: getTableHeight() }}>
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            loadMoreItems={loadMoreItems}
            isItemLoaded={isItemLoaded}
            itemCount={MAX_SIZE_OF_DATA}
            minimumBatchSize={100}
          >
            {({ onItemsRendered, ref }) => (
              <>
                {isLoading && (
                  <Box
                    className={classes.infScrollLoadingContainer}
                    style={{ backgroundColor: palette.background.default }}
                  >
                    <Typography color="inherit" className={classes.loadingText}>
                      Loading...
                    </Typography>
                  </Box>
                )}
                <VariableSizeList
                  ref={ref}
                  onItemsRendered={onItemsRendered}
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
              </>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </TableBody>
  );
};

export default ContentWithInfiniteScroll;
