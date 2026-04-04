import React from "react";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";
import { ReportType } from "app/types";
import { REPORT_TYPES } from "../helpers";

const useStyles = makeStyles(() => ({
  select: {
    minWidth: 130,
  },
}));

interface Props {
  reportType: ReportType;
  onSelectType: (value: ReportType) => void;
}

export default ({ reportType, onSelectType }: Props) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Report type</InputLabel>
      <Select value={reportType} onChange={e => onSelectType(e.target.value as ReportType)} label="Report type">
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {REPORT_TYPES.map(({ key, label }) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
