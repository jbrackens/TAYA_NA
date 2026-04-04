import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";
import React, { FC } from "react";

import { ReportType } from "@idefix-backoffice/idefix/types";
import { REPORT_TYPES } from "../helpers";

const useStyles = makeStyles({
  select: {
    minWidth: 130
  }
});

interface Props {
  reportType: ReportType;
  onSelectType: (value: ReportType) => void;
}

const SelectReportType: FC<Props> = ({ reportType, onSelectType }) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Report type</InputLabel>
      <Select value={reportType} onChange={e => onSelectType(e.target.value as ReportType)} label="Report type">
        {REPORT_TYPES.map(({ key, label }) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export { SelectReportType };
