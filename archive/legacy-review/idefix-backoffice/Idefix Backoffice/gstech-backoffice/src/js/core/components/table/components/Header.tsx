import React, { Children, FC, ReactElement } from "react";
import TableHead from "@material-ui/core/TableHead";
import TableCell from "@material-ui/core/TableCell";
import TableSortLabel from "@material-ui/core/TableSortLabel";

import { ChildProps, SortDirection } from "../types";
import { useTableStyles } from "../styles";

interface Props {
  columns: ReactElement<ChildProps>[];
  sortBy: string;
  sortDirection: SortDirection;
  handleSort: (sortKey: string, sortDirection: SortDirection) => void;
  handleAllRowsCheck?: () => void;
}

const Header: FC<Props> = ({ columns, sortBy, sortDirection, handleSort, handleAllRowsCheck }) => {
  const classes = useTableStyles();

  return (
    <TableHead component="div">
      {Children.map(columns, (column, index) => {
        const { className, align, name, label, style } = column.props;

        return (
          <TableCell key={index} component="div" align={align || "right"} className={className} style={style}>
            {name.includes("actions") ? (
              label
            ) : (
              <TableSortLabel
                active={sortBy === name}
                direction={sortDirection}
                classes={{ icon: classes.sortIcon }}
                onClick={() => handleSort(name, sortDirection === "asc" ? "desc" : "asc")}
              >
                {label}
              </TableSortLabel>
            )}
          </TableCell>
        );
      })}
    </TableHead>
  );
};

export default Header;
