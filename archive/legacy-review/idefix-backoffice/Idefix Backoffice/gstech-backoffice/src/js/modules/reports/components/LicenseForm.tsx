import React from "react";
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

export default ({ values, onChangeValue, keyField = "license" }: Props) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>License</InputLabel>
      <Select value={values[keyField] || ""} onChange={e => onChangeValue(keyField, e.target.value)} label="License">
        <MenuItem disabled>Select Licence</MenuItem>
        <MenuItem key="MGA" value="MGA">
          MGA Malta
        </MenuItem>
        <MenuItem key="SWE" value="SWE">
          SWE Sweden
        </MenuItem>
        <MenuItem key="CUA" value="CUA">
          CUA Curacao
        </MenuItem>
        <MenuItem key="UKGC" value="UKGC">
          UK Gambling Commission
        </MenuItem>
      </Select>
    </FormControl>
  );
};
