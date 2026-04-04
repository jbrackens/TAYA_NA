import * as React from "react";
import styled from "styled-components";
import format from "date-fns/format";
import parseISO from "date-fns/parseISO";
import { utcToZonedTime } from "date-fns-tz";
import { CellProps } from "react-table";

import { MALTA_TIMEZONE } from "../../../utils/constants";

const StyledDateCell = styled.div`
  &.cell--empty {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }
`;

const Cell =
  (dateOnly = false): React.FC<CellProps<{}>> =>
  ({ value, cell, withMaltaTZ }) => {
    const columnId = cell.column.id;

    if (!value) {
      return (
        <StyledDateCell className="text-main-italic cell--empty">
          {columnId === "startTime" ? "No start date" : "No end date"}
        </StyledDateCell>
      );
    }

    const parsedDate = withMaltaTZ ? utcToZonedTime(value, MALTA_TIMEZONE) : parseISO(value);

    const date = format(parsedDate, "dd.MM.yyyy");
    const time = format(parsedDate, "HH:mm");

    return (
      <>
        <p className="text-main-med">{date}</p>
        {!dateOnly && <p className="text-small-reg">{time}</p>}
      </>
    );
  };

const DateTimeCell = Cell();
const DateCell = Cell(true);

export { DateTimeCell, DateCell };
