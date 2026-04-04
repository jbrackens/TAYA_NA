import * as React from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import { useTable, Column, useGlobalFilter, useExpanded, useFlexLayout, useSortBy, Row as RowType } from "react-table";
import styled from "styled-components";
import delay from "lodash/delay";
import cn from "classnames";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import update from "immutability-helper";

import { useWindowSize } from "../../hooks";
import { DraggableRow } from "./DraggableRow";
import { GlobalFilter } from "./";
import { Loader } from "../";
import { Row } from "./Row";

const StyledTable = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;

  .loader-wrapper {
    align-self: center;
    margin-top: 64px;
    width: 40px;
    height: 40px;
  }

  .empty-text {
    align-self: center;
    margin-top: 64px;
  }

  .table-controls {
    display: flex;
    margin-bottom: 12px;

    & > :not(.global-filter) {
      margin-left: 8px;
    }
  }

  .table-header__row {
    padding: 12px 0;
    color: ${({ theme }) => theme.palette.blackMiddle};

    &--with-dnd {
      padding-left: 24px;
    }
  }

  .table-body__row {
    height: 64px;
    align-items: center;

    &:hover {
      background-color: ${({ theme }) => theme.palette.white};
      cursor: pointer;
    }

    .cell {
      overflow: hidden;
      display: inline-block;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 5px;
    }
    .cell-dash {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }
`;

interface CommonProps<ObjectType extends object> {
  columns: Array<Column<ObjectType>>;
  isLoading: boolean;
  children?: React.ReactNode;
  sortBy?: string;
  onRowClick: (row: RowType<ObjectType>) => void;
  onDrop?: (item: any, index: number) => void;
  hiddenColumns?: string[];
}

type Props<ObjectType extends object> =
  | (CommonProps<ObjectType> & {
      data: (ObjectType & { order: number })[];
      draggableRows: true;
      dimmedParameter?: { property: string; not?: boolean };
    })
  | (CommonProps<ObjectType> & {
      draggableRows?: false;
      data: ObjectType[];
      dimmedParameter?: { property: string; not?: boolean };
    });

// ! Columns and data must be memoized

function Table<ObjectType extends object>(props: React.PropsWithChildren<Props<ObjectType>>) {
  const {
    columns,
    data = [],
    onRowClick,
    isLoading,
    children,
    sortBy,
    draggableRows = false,
    onDrop,
    hiddenColumns = [],
    dimmedParameter = { property: "", not: false }
  } = props;
  const [records, setRecords] = React.useState(data);
  const { height = 800 } = useWindowSize();

  const getRowId = React.useCallback(row => row.id, []);

  const defaultColumn = React.useMemo(
    () => ({
      width: 250
    }),
    []
  );

  React.useEffect(() => {
    setRecords(data);
  }, [data]);

  const initialState: Object = React.useMemo(
    () => ({
      hiddenColumns,
      sortBy: [
        {
          id: sortBy,
          desc: false
        }
      ]
    }),
    [sortBy, hiddenColumns]
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, state, setGlobalFilter } = useTable(
    {
      columns,
      data: records,
      defaultColumn,

      getSubRows: (row: any) => row.subRows,
      getRowId: draggableRows ? getRowId : undefined,
      initialState: sortBy ? initialState : { hiddenColumns },
      autoResetGlobalFilter: false
    },
    useGlobalFilter,
    useFlexLayout,
    useSortBy,
    useExpanded
  );

  const handleMoveRow = React.useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const dragRecord = records[dragIndex];

      // works with delay only
      delay(
        () =>
          setRecords(
            update(records, {
              $splice: [
                [dragIndex, 1],
                [hoverIndex, 0, dragRecord]
              ]
            })
          ),
        0
      );
    },
    [records]
  );

  const getNewOrder = React.useCallback(
    (index: number) => {
      const prevRow = records[index - 1] as ObjectType & { order: number };
      const nextRow = records[index + 1] as ObjectType & { order: number };

      const prevOrder = prevRow?.order || 0;
      const nextOrder = nextRow?.order;

      if (!nextOrder) {
        const lastOrder = (data[data.length - 1] as ObjectType & { order: number }).order;
        return lastOrder + 1;
      }

      return (prevOrder + nextOrder) / 2;
    },
    [data, records]
  );

  const handleDrop = React.useCallback(
    (index: number) => {
      const item = records[index];
      const order = getNewOrder(index);

      if (onDrop) {
        onDrop(item, order);
      }
    },
    [getNewOrder, records, onDrop]
  );

  const RenderRow = React.useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const row = rows[index];
      prepareRow(row);

      const { property, not } = dimmedParameter;
      // @ts-ignore
      const dimmed = property ? row.original[property] : false;

      return draggableRows ? (
        <DraggableRow
          index={index}
          style={style}
          row={row}
          onDrop={handleDrop}
          onMoveRow={handleMoveRow}
          onRowClick={onRowClick}
          dimmed={not ? !dimmed : dimmed}
        />
      ) : (
        <Row row={row} style={style} onRowClick={onRowClick} dimmed={not ? !dimmed : dimmed} />
      );
    },
    [rows, prepareRow, dimmedParameter, draggableRows, handleDrop, handleMoveRow, onRowClick]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <StyledTable {...getTableProps()}>
        <div className="table-controls">
          <GlobalFilter
            className="global-filter"
            globalFilter={state.globalFilter}
            setGlobalFilter={setGlobalFilter}
            disabled={isLoading || (!rows.length && !data.length)}
          />
          {children}
        </div>
        {isLoading ? (
          <div className="loader-wrapper" data-testid="loader">
            <Loader />
          </div>
        ) : data.length ? (
          <>
            <div>
              {headerGroups.map(headerGroup => (
                // eslint-disable-next-line react/jsx-key
                <div
                  {...headerGroup.getHeaderGroupProps()}
                  className={cn("table-header__row", { "table-header__row--with-dnd": draggableRows })}
                >
                  {headerGroup.headers.map(column => (
                    // eslint-disable-next-line react/jsx-key
                    <div {...column.getHeaderProps()} className="text-small-reg table-header__cell">
                      {column.render("Header")}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div {...getTableBodyProps()}>
              <FixedSizeList height={height - 280} itemCount={rows.length} itemSize={64} width="100%">
                {RenderRow}
              </FixedSizeList>
            </div>
          </>
        ) : (
          <p className="empty-text text-header">There is no data</p>
        )}
      </StyledTable>
    </DndProvider>
  );
}

export { Table };
