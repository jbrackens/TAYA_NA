import React, { useState, useRef } from "react";
import { Table as TableComponent } from "antd";
import { TableProps as CoreTableProps } from "antd/lib/table";
import Spinner from "../spinner";
import { useResize, useSpy } from "@phoenix-ui/utils";
import { PADDING_SIZE, TableWrapper } from "./index.styled";

export type TableProps<T> = CoreTableProps<T> & {
  scrollable?: boolean;
};

const Table = ({ scrollable, ...props }: TableProps<any>) => {
  const [tableHeight, setTableHeight] = useState(0);
  const tableRef = useRef();
  const { spy } = useSpy();
  const { height } = useResize(tableRef);

  spy(height, ({ values }) => {
    if (scrollable) {
      setTableHeight(values - PADDING_SIZE);
    }
  });

  const loading = (props.loading as boolean) || false;

  if (scrollable) {
    return (
      <TableWrapper ref={tableRef}>
        <TableComponent
          {...props}
          scroll={{ y: tableHeight }}
          loading={{
            spinning: loading,
            indicator: <Spinner />,
          }}
        />
      </TableWrapper>
    );
  }
  return (
    <TableComponent
      {...props}
      loading={{
        spinning: loading,
        indicator: <Spinner />,
      }}
    />
  );
};

export default Table;
