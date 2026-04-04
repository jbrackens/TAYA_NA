import * as React from "react";
import { Row as RowType } from "react-table";

import { Cell } from "./Cell";

interface Props<ObjectType extends object> {
  row: RowType<ObjectType>;
  style: React.CSSProperties;
  onRowClick: (row: RowType<ObjectType>) => void;
  dimmed: boolean;
}

function Row<ObjectType extends object>({
  row,
  style,
  onRowClick,
  dimmed
}: React.PropsWithChildren<Props<ObjectType>>) {
  const isDimmed = dimmed !== undefined && dimmed;

  return (
    <div
      {...row.getRowProps({
        style
      })}
      className="table-body__row"
      onClick={() => onRowClick(row)}
    >
      {row.cells.map((cell, index) => (
        <Cell cell={cell} key={`${cell.row.id}-${index}`} isDimmed={isDimmed} />
      ))}
    </div>
  );
}

export { Row };
