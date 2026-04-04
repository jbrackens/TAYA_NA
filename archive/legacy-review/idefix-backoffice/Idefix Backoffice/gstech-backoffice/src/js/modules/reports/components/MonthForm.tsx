import React from "react";
import times from "lodash/fp/times";
import moment from "moment-timezone";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  select: {
    minWidth: 90,
  },
}));

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
  keyField?: string;
}

export default ({ values, onChangeValue, keyField = "month" }: Props) => {
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
