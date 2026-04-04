import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { PaymentProvider } from "@idefix-backoffice/idefix/types";
import { ProviderDetailsForm, paymentProviderValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useProviderDetails } from "./hooks";

interface Props {
  payload: { paymentProvider: PaymentProvider };
  meta: { providerDetails: any };
}

const PaymentProviderDetailsDialog: FC<Props> = ({ payload, meta }) => {
  const providerDetails = meta?.providerDetails;
  const { paymentProvider } = payload;

  const { brands, countries, currencies, handleSave, handleClose, initialValues, selectedBrand, handleSelectBrand } =
    useProviderDetails({
      paymentProvider,
      providerDetails
    });

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleClose}>
      {meta && (
        <Formik initialValues={initialValues} onSubmit={handleSave} validationSchema={paymentProviderValidationSchema}>
          {props => (
            <>
              <DialogTitle>{paymentProvider.name || ""}</DialogTitle>
              <DialogContent>
                <ProviderDetailsForm
                  {...props}
                  brands={brands}
                  countries={countries}
                  currencies={currencies}
                  selectedBrand={selectedBrand}
                  onSelectBrand={handleSelectBrand}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose} color="primary">
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  disabled={!props.isValid || props.isSubmitting || !props.dirty}
                  onClick={props.submitForm}
                >
                  Save
                </Button>
              </DialogActions>
            </>
          )}
        </Formik>
      )}
    </Dialog>
  );
};

export { PaymentProviderDetailsDialog };
