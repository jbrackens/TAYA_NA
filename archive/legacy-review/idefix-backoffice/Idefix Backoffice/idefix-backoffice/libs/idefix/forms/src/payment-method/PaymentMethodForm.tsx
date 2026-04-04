import React from "react";
import { Form, Field, FieldArray } from "formik";
import { Box, Table, TableBody, TableHead, TableCell, TableRow } from "@mui/material";
import { makeStyles } from "@mui/styles";

import { TextField } from "../formik-fields/TextField";
import { MoneyField } from "../formik-fields/MoneyField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const useStyles = makeStyles(theme => ({
  table: {
    marginTop: 24,
    border: "1px solid rgba(0,0,0,.12)",
    padding: 4,
    minWidth: 600
  },
  tableCell: {
    minWidth: 300
  },
  formError: {
    fontSize: 14,
    color: theme.colors.red
  }
}));

interface Props {
  values: {
    limits: { currencyId: string }[];
  };
}

const PaymentMethodForm = ({ values }: Props) => {
  const classes = useStyles();

  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="name" label="Name" disabled component={TextField} />
      <Table classes={{ root: classes.table }}>
        <TableHead>
          <TableRow>
            <TableCell>Currency</TableCell>
            <TableCell>Min Deposit</TableCell>
            <TableCell>Max Deposit</TableCell>
            <TableCell>Min WD</TableCell>
            <TableCell>Max WD</TableCell>
          </TableRow>
        </TableHead>

        <FieldArray name="limits">
          {() => (
            <TableBody>
              {values.limits.map(({ currencyId }, index) => (
                <TableRow key={`${currencyId}-${index}`}>
                  <TableCell>{currencyId}</TableCell>
                  <TableCell>
                    <Field name={`limits[${index}][minDeposit]`} component={MoneyField} />
                  </TableCell>
                  <TableCell>
                    <Field name={`limits[${index}][maxDeposit]`} component={MoneyField} />
                  </TableCell>
                  <TableCell>
                    <Field name={`limits[${index}][minWithdrawal]`} component={MoneyField} />
                  </TableCell>
                  <TableCell>
                    <Field name={`limits[${index}][maxWithdrawal]`} component={MoneyField} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </FieldArray>
      </Table>
    </Box>
  );
};

export default PaymentMethodForm;
