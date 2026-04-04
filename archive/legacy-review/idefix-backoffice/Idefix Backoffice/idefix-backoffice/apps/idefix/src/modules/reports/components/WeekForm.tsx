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
    minWidth: 100
  }
});

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
  keyField?: string;
}

const WeekForm: FC<Props> = ({ values, onChangeValue, keyField = "week" }) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Week</InputLabel>
      <Select value={values[keyField] || ""} onChange={e => onChangeValue(keyField, e.target.value)} label="Week">
        <MenuItem>All</MenuItem>
        {times(index => {
          // @ts-ignore
          const month = moment().subtract(index, "week").startOf("isoweek");
          return (
            <MenuItem key={month.toISOString()} value={month.toISOString()}>{`${month.format("DD.MM.YYYY")}`}</MenuItem>
          );
        }, 104)}
      </Select>
    </FormControl>
  );
};

export { WeekForm };
