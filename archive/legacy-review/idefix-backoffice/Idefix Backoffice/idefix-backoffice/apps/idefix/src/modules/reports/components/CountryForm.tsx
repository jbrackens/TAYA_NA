import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";
import React, { FC } from "react";

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

const CountryForm: FC<Props> = ({ values, onChangeValue, keyField = "country" }) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Country</InputLabel>
      <Select value={values[keyField] || ""} onChange={e => onChangeValue(keyField, e.target.value)} label="Country">
        <MenuItem>All</MenuItem>
        <MenuItem key="MT" value="MT">
          Malta
        </MenuItem>
      </Select>
    </FormControl>
  );
};

export { CountryForm };
