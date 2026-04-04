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

export default ({ values, onChangeValue, keyField = "year" }: Props) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Year</InputLabel>
      <Select value={values[keyField] || ""} onChange={e => onChangeValue(keyField, e.target.value)} label="Year">
        <MenuItem>All</MenuItem>
        {times(index => {
          const year = moment().subtract(index, "year").startOf("year");
          return (
            <MenuItem key={year.toISOString()} value={year.toISOString()}>
              {year.format("YYYY")}
            </MenuItem>
          );
        }, Number(moment().format("YYYY")) - 2014 + 1)}
      </Select>
    </FormControl>
  );
};
