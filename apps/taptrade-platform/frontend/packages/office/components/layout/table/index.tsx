import { useState, useRef } from "react";
import { Table as TableComponent } from "antd";
import type { TableProps as CoreTableProps } from "antd";
import Spinner from "../spinner";
import { useResize, useSpy } from "@taptrade-ui/utils";

const PADDING_SIZE = 48;
const TABLE_WRAPPER_CLASS_NAME = [
  "h-full -mx-12 -my-12",
  "[&_.ant-table-header>table_col.ant-table-expand-icon-col]:w-[86.4px]",
  "[&_.ant-table-body>table_col.ant-table-expand-icon-col]:w-[86.4px]",
  "[&_.ant-table-footer>table_col.ant-table-expand-icon-col]:w-[86.4px]",
  "[&_.ant-table-header>table>thead>tr>th:first-child]:pl-[38.4px]",
  "[&_.ant-table-header>table>thead>tr>th:last-child]:pr-[38.4px]",
  "[&_.ant-table-body>table>thead>tr>th:first-child]:pl-[38.4px]",
  "[&_.ant-table-body>table>thead>tr>th:last-child]:pr-[38.4px]",
  "[&_.ant-table-footer>table>thead>tr>th:first-child]:pl-[38.4px]",
  "[&_.ant-table-footer>table>thead>tr>th:last-child]:pr-[38.4px]",
  "[&_.ant-table-header>table>tbody>tr>td:first-child]:pl-[57.6px]",
  "[&_.ant-table-header>table>tbody>tr>td:last-child]:pr-[57.6px]",
  "[&_.ant-table-body>table>tbody>tr>td:first-child]:pl-[57.6px]",
  "[&_.ant-table-body>table>tbody>tr>td:last-child]:pr-[57.6px]",
  "[&_.ant-table-footer>table>tbody>tr>td:first-child]:pl-[57.6px]",
  "[&_.ant-table-footer>table>tbody>tr>td:last-child]:pr-[57.6px]",
  "[&_.ant-table-pagination]:px-12",
  "[&_.ant-table-pagination]:py-3",
].join(" ");

export type TableProps<T> = CoreTableProps<T> & {
  scrollable?: boolean;
};

const Table = ({ scrollable, ...props }: TableProps<any>) => {
  const [tableHeight, setTableHeight] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
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
      <div ref={tableRef} className={TABLE_WRAPPER_CLASS_NAME}>
        <TableComponent
          {...props}
          scroll={{ y: tableHeight }}
          loading={{
            spinning: loading,
            indicator: <Spinner />,
          }}
        />
      </div>
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
