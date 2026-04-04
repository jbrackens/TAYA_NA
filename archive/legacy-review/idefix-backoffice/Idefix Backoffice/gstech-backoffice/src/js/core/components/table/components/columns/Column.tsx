import React from "react";
import formatDate from "date-fns/format";
import parseISO from "date-fns/parseISO";
import get from "lodash/get";
import { createStyles, Theme, withStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import { ColumnProps } from "../../types";
import capitalize from "lodash/capitalize";
import { isValid } from "date-fns";
import TrueIcon from "@material-ui/icons/RadioButtonChecked";
import FalseIcon from "@material-ui/icons/RadioButtonUnchecked";

const columnStyles = (theme: Theme) =>
  createStyles({
    root: {
      fontSize: 12,
      lineHeight: "16px",
      overflow: "inherit",
      textOverflow: "inherit",
      whiteSpace: "inherit",
      fontWeight: "inherit",
      "&.status-text": {
        fontWeight: 500,
      },
      "&.paid": {
        color: theme.colors.teal,
      },
      "&.more": {
        color: theme.colors.orange,
      },
      "&.confirmed": {
        color: theme.colors.orange,
      },
      "&.less": {
        color: theme.colors.red,
      },
      "&.unconfirmed": {
        color: theme.colors.red,
      },
      "&.blocked": {
        color: theme.colors.black61,
      },
      "&.equal": {
        color: theme.colors.black9e,
      },
      "&.brand-column": {
        fontSize: 12,
        lineHeight: "16px",
        whiteSpace: "nowrap",
      },
    },
  });

const Column = withStyles<"root", {}, ColumnProps>(columnStyles)(
  ({ value, type, format, comparedName: _comparedName, ...rest }: ColumnProps) => {
    switch (type) {
      case "text":
        if (rest.name.split("").includes(".")) {
          const data = get(rest.row, rest.name);
          return (
            <Typography
              title={data}
              {...rest}
              style={{ maxWidth: 118, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
            >
              {data}
            </Typography>
          );
        }

        return (
          <Typography title={String(value)} {...rest}>
            {value}
          </Typography>
        );
      case "date":
        return (
          <Typography {...rest}>
            {value && isValid(new Date(value)) ? formatDate(parseISO(String(value)), "dd.MM.yyyy HH:mm:ss") : value}
          </Typography>
        );
      case "boolean":
        return typeof value === "boolean" ? (
          value ? (
            <TrueIcon color="primary" />
          ) : (
            <FalseIcon color="primary" />
          )
        ) : (
          <Typography {...rest}>{capitalize(String(value))}</Typography>
        );
      case "custom":
        return format ? <Box {...rest}>{format(value, rest.row)}</Box> : null;
    }
  },
);

export default Column;
