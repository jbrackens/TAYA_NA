import React, { FC } from "react";
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

const LicenseForm: FC<Props> = ({ values, onChangeValue, keyField = "license" }) => {
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

export { LicenseForm };
