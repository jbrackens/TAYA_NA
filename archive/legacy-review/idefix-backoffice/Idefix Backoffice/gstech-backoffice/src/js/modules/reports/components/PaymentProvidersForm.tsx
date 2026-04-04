import React from "react";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  select: {
    minWidth: 180,
  },
}));

interface Props {
  paymentProviders: { name: string }[] | undefined;
  values: any;
  onChangeValue: (key: any, value: any) => void;
}

export default ({ paymentProviders, values, onChangeValue }: Props) => {
  const classes = useStyles();

  return (
    <FormControl className={classes.select}>
      <InputLabel>Payment Provider</InputLabel>
      <Select
        value={values.paymentProviderName || ""}
        onChange={e => onChangeValue("paymentProviderName", e.target.value)}
        label="Payment Provider"
      >
        <MenuItem>All</MenuItem>
        {paymentProviders &&
          paymentProviders.map(({ name }) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
};
