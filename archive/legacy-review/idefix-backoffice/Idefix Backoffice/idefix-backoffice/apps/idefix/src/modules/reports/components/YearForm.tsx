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

const YearForm: FC<Props> = ({ values, onChangeValue, keyField = "year" }) => {
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

export { YearForm };
