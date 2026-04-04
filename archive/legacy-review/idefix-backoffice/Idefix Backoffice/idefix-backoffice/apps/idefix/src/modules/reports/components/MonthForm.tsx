import React, { FC } from "react";
import times from "lodash/fp/times";
import moment from "moment-timezone";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  select: {
    minWidth: 90
  }
});

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
  keyField?: string;
}

const MonthForm: FC<Props> = ({ values, onChangeValue, keyField = "month" }) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Month</InputLabel>
      <Select value={values[keyField] || ""} onChange={e => onChangeValue(keyField, e.target.value)} label="Month">
        <MenuItem>All</MenuItem>
        {times(index => {
          const month = moment().subtract(index, "month").startOf("month");
          return (
            <MenuItem key={month.toISOString()} value={month.toISOString()}>
              {month.format("MMMM YYYY")}
            </MenuItem>
          );
        }, 60)}
      </Select>
    </FormControl>
  );
};

export {MonthForm}
