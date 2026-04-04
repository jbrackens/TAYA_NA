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
    minWidth: 100,
  },
}));

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
  keyField?: string;
}

export default ({ values, onChangeValue, keyField = "week" }: Props) => {
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
