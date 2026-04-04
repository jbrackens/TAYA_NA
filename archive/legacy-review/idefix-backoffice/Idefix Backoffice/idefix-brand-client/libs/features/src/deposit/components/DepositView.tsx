import * as React from "react";
import { Formik, FormikHelpers } from "formik";
import { CreateDepositResponse } from "@brandserver-client/types";
import { pushRoute } from "@brandserver-client/utils";
import { ApiContext } from "@brandserver-client/api";
import { Iframe } from "../../my-account-iframe";
import { useWorldPay } from "../hooks/useWorldPay";
import { useSelectBonusByQuery } from "../hooks/useSelectBonusByQuery";
import { useSelectCampaignByQuery } from "../hooks/useSelectCampaignByQuery";
import { useValidationSchema } from "../hooks/useValidationSchema";
import { useCommonRequestDraft } from "../hooks/useCommonRequestDraft";
import { hasBonus, hasCampaign } from "../utils";
import { useDeposit } from "../context";
import { SplashScreen } from "./SplashScreen";
import { DepositForm } from "./DepositForm";
import type { FormValues, HostedFieldsCallbackResponse } from "../types";
import { DepositTypes } from "../types";

const INITIAL_VALUES: FormValues = {
  amount: "",
  selectedBank: "",
  cardHolderName: "",
  cardExpiryDate: "",
  accountId: ""
};

const DepositView = () => {
  const api = React.useContext(ApiContext);
  const { splashScreenIsOpen, deposit, selectedDepositMethod } = useDeposit();
  const {
    iframeSrc,
    handleInitIframeSrc,
    setIframeSrc,
    handleWorldPayResponse
  } = useWorldPay();
  const validationSchema = useValidationSchema();

  useSelectBonusByQuery();
  useSelectCampaignByQuery();

  const hostedFieldsValuesRef = React.useRef<HostedFieldsCallbackResponse>();

  const { depositOptions } = deposit;

  const { getCommonRequestDraft } = useCommonRequestDraft();

  const handleResponse = React.useCallback(
    (response: CreateDepositResponse) => {
      if (!response.ok && !response.ReturnURL) {
        return pushRoute("/loggedin/myaccount/deposit-failed");
      }

      if (
        (response.usesThirdPartyCookie || window.innerWidth < 991) &&
        response.ReturnURL
      )
        return window.top?.location.assign(response.ReturnURL);

      setIframeSrc(response.ReturnURL);
    },
    [setIframeSrc]
  );

  const handleEntercashSubmit = React.useCallback(
    async (values: FormValues, actions: FormikHelpers<FormValues>) => {
      try {
        const requestDraft = {
          ...getCommonRequestDraft(Number(values.amount)),
          selectedBank: values.selectedBank
        };
        const response = await api.deposit.createDeposit(requestDraft);
        handleResponse(response);
      } catch (error) {
        console.log(error, "error");
      } finally {
        actions.setSubmitting(false);
      }
    },
    [getCommonRequestDraft]
  );

  const handleIframeSubmit = React.useCallback(
    async (values: FormValues, actions: FormikHelpers<FormValues>) => {
      try {
        const requestDraft = {
          ...getCommonRequestDraft(Number(values.amount)),
          nationalId: values.nationalId
        };
        const response = await api.deposit.createDeposit(requestDraft);
        handleResponse(response);
      } catch (error) {
        console.log(error, "error");
      } finally {
        actions.setSubmitting(false);
      }
    },
    [getCommonRequestDraft]
  );

  const handleSavedCreditCardSubmit = async (
    values: FormValues,
    actions: FormikHelpers<FormValues>
  ) => {
    try {
      if (
        !hostedFieldsValuesRef.current ||
        !!hostedFieldsValuesRef.current.errors
      ) {
        return;
      }

      const requestDraft = {
        ...getCommonRequestDraft(Number(values.amount)),
        card: {
          encCvv: hostedFieldsValuesRef.current.encCvv
        }
      };

      const response = await api.deposit.createDeposit(requestDraft);
      handleResponse(response);
    } catch (error) {
      console.log(error, "error");
    } finally {
      actions.setSubmitting(false);
    }
  };

  const handleCreditCardSubmit = React.useCallback(
    async (values: FormValues, actions: FormikHelpers<FormValues>) => {
      try {
        if (
          !hostedFieldsValuesRef.current ||
          !!hostedFieldsValuesRef.current.errors
        ) {
          return;
        }

        const [expiryMonth, expiryYear] = values.cardExpiryDate.split("/");
        const requestDraft = {
          ...getCommonRequestDraft(Number(values.amount)),
          card: {
            encCvv: hostedFieldsValuesRef.current.encCvv,
            encCreditcardNumber:
              hostedFieldsValuesRef.current.encCreditcardNumber,
            cardHolder: values.cardHolderName,
            expiryMonth,
            expiryYear: `20${expiryYear}`
          }
        };
        const response = await api.deposit.createDeposit(requestDraft);
        handleResponse(response);
      } catch (error) {
        console.log(error, "error");
      } finally {
        actions.setSubmitting(false);
      }
    },
    [getCommonRequestDraft]
  );

  const handleNetellerSubmit = React.useCallback(
    async (values: FormValues, actions: FormikHelpers<FormValues>) => {
      try {
        const requestDraft = {
          ...getCommonRequestDraft(Number(values.amount)),
          accountId: values.accountId
        };
        const response = await api.deposit.createDeposit(requestDraft);
        handleResponse(response);
      } catch (error) {
        console.log(error, "error");
      } finally {
        actions.setSubmitting(false);
      }
    },
    [getCommonRequestDraft]
  );

  const handleWorldpaySubmit = React.useCallback(
    async (values: FormValues, actions: FormikHelpers<FormValues>) => {
      try {
        const requestDraft = getCommonRequestDraft(Number(values.amount));
        const response = await api.deposit.createDeposit(requestDraft);

        handleWorldPayResponse(response);
      } catch (error) {
        console.log(error, "error");
      } finally {
        actions.setSubmitting(false);
      }
    },
    [getCommonRequestDraft, handleWorldPayResponse]
  );

  const submitHandlers = {
    [DepositTypes.EnterCash]: handleEntercashSubmit,
    [DepositTypes.Iframe]: handleIframeSubmit,
    [DepositTypes.CreditCard]: selectedDepositMethod.accountId
      ? handleSavedCreditCardSubmit
      : handleCreditCardSubmit,
    [DepositTypes.Neteller]: handleNetellerSubmit,
    [DepositTypes.Worldpay]: handleWorldpaySubmit
  };

  if (iframeSrc || iframeSrc === "") {
    return (
      <Iframe src={iframeSrc} type="worldpay" onLeave={handleInitIframeSrc} />
    );
  }

  if (
    splashScreenIsOpen &&
    (hasBonus(depositOptions) || hasCampaign(depositOptions))
  ) {
    return <SplashScreen />;
  }

  return (
    <Formik
      initialValues={INITIAL_VALUES}
      validationSchema={validationSchema}
      onSubmit={submitHandlers[selectedDepositMethod.type as DepositTypes]}
    >
      {formik => (
        <DepositForm
          formik={formik}
          hostedFieldsValuesRef={hostedFieldsValuesRef}
        />
      )}
    </Formik>
  );
};

export { DepositView };
