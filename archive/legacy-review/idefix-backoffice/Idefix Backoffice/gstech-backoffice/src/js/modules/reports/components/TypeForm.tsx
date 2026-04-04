import React from "react";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  select: {
    minWidth: 80,
  },
}));

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
}

export default ({ values, onChangeValue }: Props) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Type</InputLabel>
      <Select value={values.span || ""} onChange={e => onChangeValue("span", e.target.value)} label="Type">
        <MenuItem disabled>Select Type</MenuItem>
        <MenuItem value="month">Monthly</MenuItem>
        <MenuItem value="day">Daily</MenuItem>
        <MenuItem value="week">Weekly</MenuItem>
        <MenuItem value="year">Yearly</MenuItem>
      </Select>
    </FormControl>
  );
};
