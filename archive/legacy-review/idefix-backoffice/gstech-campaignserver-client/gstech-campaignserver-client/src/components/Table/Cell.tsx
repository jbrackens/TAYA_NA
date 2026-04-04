import * as React from "react";
import { Cell as CellType } from "react-table";
import cn from "classnames";
import isNil from "lodash/isNil";
import capitalize from "lodash/capitalize";
import styled from "styled-components";

const StyledCell = styled.div`
  &.opacity {
    opacity: 0.5;
  }
`;

interface Props<ObjectType extends object> {
  cell: CellType<ObjectType>;
  isDimmed?: boolean;
}

function Cell<ObjectType extends object>({ cell, isDimmed = false }: React.PropsWithChildren<Props<ObjectType>>) {
  const isShowMore = cell.column.id === "showMore";
  const isBoolean = cell.value === false || cell.value === true;

  return (
    <StyledCell
      {...cell.getCellProps()}
      className={cn("text-main-reg", { cell: !!cell.value, opacity: isShowMore ? false : isDimmed })}
    >
      {isBoolean && <span className="text-main-reg">{capitalize(cell.value)}</span>}
      {!isNil(cell.value) || isShowMore ? (
        <span title={typeof cell.value === "string" ? cell.value : undefined}>{cell.render("Cell")}</span>
      ) : (
        cell.render("Cell")
      )}
    </StyledCell>
  );
}

export { Cell };
