import React, { FC } from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  select: {
    minWidth: 80
  }
});

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
}

const TypeForm: FC<Props> = ({ values, onChangeValue }) => {
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

export { TypeForm };
