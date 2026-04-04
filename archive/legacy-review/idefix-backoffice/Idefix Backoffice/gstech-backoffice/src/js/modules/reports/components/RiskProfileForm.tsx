import React from "react";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  select: {
    minWidth: 120,
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
      <InputLabel>Risk status</InputLabel>
      <Select
        value={values["riskProfile"] || ""}
        onChange={e => onChangeValue("riskProfile", e.target.value)}
        label="Risk status"
      >
        <MenuItem disabled>Select Risk</MenuItem>
        <MenuItem value="low">Low</MenuItem>
        <MenuItem value="medium">Medium</MenuItem>
        <MenuItem value="high">High</MenuItem>
      </Select>
    </FormControl>
  );
};
