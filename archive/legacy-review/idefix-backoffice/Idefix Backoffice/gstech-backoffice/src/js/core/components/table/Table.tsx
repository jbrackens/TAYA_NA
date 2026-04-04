import React, { FC, memo } from "react";
import cn from "classnames";
import Table from "@material-ui/core/Table";
import Box from "@material-ui/core/Box";

import { TableProps } from "./types";
import useTable from "./useTable";
import Header from "./components/Header";
import Content from "./components/Content";
import ContentWithInfiniteScroll from "./components/ContentWithInfiniteScroll";

const Component: FC<TableProps> = props => {
  const {
    data,
    isLoading,
    sortBy,
    sortDirection,
    classes,
    className,
    columns,
    displayRows,
    estimatedItemSize,
    handleSort,
    onLoadMore,
  } = useTable(props);

  return (
    <Box className={classes.tableWrapper}>
      <Table component="div" className={cn(classes.table, className)}>
        <Header sortBy={sortBy} columns={columns} handleSort={handleSort} sortDirection={sortDirection} />
        {onLoadMore ? (
          <ContentWithInfiniteScroll
            data={data}
            columns={columns}
            isLoading={isLoading}
            displayRows={displayRows}
            estimatedItemSize={estimatedItemSize}
            onLoadMore={onLoadMore}
          />
        ) : (
          <Content
            data={data}
            columns={columns}
            isLoading={isLoading}
            displayRows={displayRows}
            estimatedItemSize={estimatedItemSize}
          />
        )}
      </Table>
    </Box>
  );
};

export default memo(Component);
