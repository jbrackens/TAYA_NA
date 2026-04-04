import React, { FC } from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  select: {
    minWidth: 180
  }
});

interface Props {
  paymentProviders: { name: string }[] | undefined;
  values: any;
  onChangeValue: (key: any, value: any) => void;
}

const PaymentProvidersForm: FC<Props> = ({ paymentProviders, values, onChangeValue }) => {
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

export { PaymentProvidersForm };
