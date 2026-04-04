import React, { FC } from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  select: {
    minWidth: 120
  }
});

interface Props {
  values: any;
  onChangeValue: (key: any, value: any) => void;
}

const RiskProfileForm: FC<Props> = ({ values, onChangeValue }) => {
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
        <MenuItem value="medium_low">Medium Low</MenuItem>
        <MenuItem value="medium">Medium</MenuItem>
        <MenuItem value="medium_high">Medium High</MenuItem>
        <MenuItem value="high">High</MenuItem>
      </Select>
    </FormControl>
  );
};

export { RiskProfileForm };
