import { useCallback, useEffect, useMemo, useState } from "react";
import { FormikHelpers } from "formik";
import omit from "lodash/fp/omit";

import { appSlice, dialogsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { PaymentProvider, DIALOG } from "@idefix-backoffice/idefix/types";

import { fetchDetails, save } from "./actions";
import { getInitialValues, getValues } from "./utils";

interface Payload {
  paymentProvider: PaymentProvider;
  providerDetails: any;
}

const useProviderDetails = ({ paymentProvider, providerDetails }: Payload) => {
  const dispatch = useAppDispatch();
  const [selectedBrand, setSelectedBrand] = useState<string>("LD");
  const brandSettings = useAppSelector(state => appSlice.getBrandSettings(state, selectedBrand));
  const brands = useAppSelector(appSlice.getBrands);
  const countries = brandSettings?.countries;
  const currencies = brandSettings?.currencies;

  const handleSave = useCallback(
    (values: any, formikActions: FormikHelpers<any>) => {
      const rest = omit(["brands", "countries", "currencies", "name", "paymentMethodId", "undefined"], values);
      const { brands } = values;

      const draft = { ...rest, ...getValues(brands) };

      dispatch(save(draft, formikActions));
    },
    [dispatch]
  );
  const handleClose = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.PAYMENT_PROVIDER_DETAILS)),
    [dispatch]
  );
  const handleSelectBrand = useCallback(
    (event: React.SyntheticEvent<Element, Event>, value: string) => setSelectedBrand(value),
    []
  );

  const initialValues = useMemo(
    () => providerDetails && { ...providerDetails, ...getInitialValues(providerDetails, countries) },
    [countries, providerDetails]
  );

  useEffect(() => {
    if (paymentProvider) {
      dispatch(fetchDetails(paymentProvider.id));
    }
  }, [dispatch, paymentProvider]);

  return { brands, countries, currencies, handleSave, handleClose, initialValues, selectedBrand, handleSelectBrand };
};

export { useProviderDetails };
