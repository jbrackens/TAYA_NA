import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import omit from "lodash/fp/omit";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { getBrandSettings } from "../../modules/app";
import { ProviderDetailsForm, validationSchema } from "../../forms/payment-provider";
import { fetchDetails, save } from "./actions";
import { closeDialog } from "../";
import { getInitialValues, getValues } from "./utils";
import { RootState } from "js/rootReducer";
import { PaymentProvider } from "app/types";

interface Props {
  payload: { paymentProvider: PaymentProvider };
  meta: { providerDetails: any };
}

const PaymentProviderDetailsDialog: FC<Props> = ({ payload, meta }) => {
  const dispatch = useDispatch();
  const [selectedBrand, setSelectedBrand] = useState<string>("LD");
  const brands = useSelector((state: RootState) => state.app.brands);
  const brandSettings = useSelector((state: RootState) => getBrandSettings(state, selectedBrand));
  const countries = brandSettings?.countries;
  const currencies = brandSettings?.currencies;
  const { paymentProvider } = payload;
  const providerDetails = meta?.providerDetails;

  useEffect(() => {
    if (paymentProvider) {
      dispatch(fetchDetails(paymentProvider.id));
    }
  }, [dispatch, paymentProvider]);

  const handleSave = useCallback(
    (values, formikActions) => {
      const rest = omit(["brands", "countries", "currencies", "name", "paymentMethodId", "undefined"], values);
      const { brands } = values;

      const draft = { ...rest, ...getValues(brands) };

      dispatch(save(draft, formikActions));
    },
    [dispatch],
  );
  const handleClose = useCallback(() => dispatch(closeDialog("payment-provider-details")), [dispatch]);
  const handleSelectBrand = useCallback((e, value) => setSelectedBrand(value), []);

  const initialValues = useMemo(
    () => providerDetails && { ...providerDetails, ...getInitialValues(providerDetails, countries) },
    [countries, providerDetails],
  );

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleClose}>
      {meta && (
        <Formik initialValues={initialValues} onSubmit={handleSave} validationSchema={validationSchema}>
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

export default PaymentProviderDetailsDialog;
