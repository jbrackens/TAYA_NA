import { useRegistry } from "@brandserver-client/ui";
import { Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useLocalStorage } from "@brandserver-client/hooks";
import { Steps } from ".";
import FramePage from "./FramePage";
import { FullscreenFormWrapper } from "./FullscreenFormWrapper";
import { activatePhone, register, validatePhone } from "./registrationService";
import { AddressForm } from "./steps/AddressForm";
import { ConfirmationForm } from "./steps/ConfirmationForm";
import { ConsentForm } from "./steps/ConsentForm";
import { EmailPasswordForm } from "./steps/EmailPasswordForm";
import { PersonalInfoForm } from "./steps/PersonalInfoForm";
import { TermsForm } from "./steps/TermsForm";
import { useRegistrationValidationSchema } from "./useValidationSchema";
import omit from "lodash/omit";
import {
  getRegistrationStatus,
  toggleRegistration
} from "@brandserver-client/lobby";
import { useSelector, useDispatch } from "react-redux";
import { CmsPageOptions, Brand } from "@brandserver-client/types";
import { mapPageOptions } from "./mapPageOptions";
import { useTheme } from "styled-components";

interface RegistrationFormValues
  extends EmailAndPasswordFormValues,
    PersonalInfoFormValues,
    AddressFormValues,
    ConfirmationFormValues,
    TermsFormValues,
    ConsentFormValues {}

interface EmailAndPasswordFormValues {
  email: string;
  password: string;
}

interface PersonalInfoFormValues {
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface AddressFormValues {
  address: string;
  postCode: string;
  city: string;
  countryISO: string;
}

interface ConfirmationFormValues {
  pinCode: string;
}

interface TermsFormValues {
  termsConfirm: boolean;
  policyConfirm: boolean;
}

interface ConsentFormValues {
  promotions: string;
}

const INITIAL_VALUES = {
  // email form
  email: "",
  password: "",

  // personal details form
  phone: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",

  // address form
  address: "",
  city: "",
  postCode: "",

  // confirmation form
  pinCode: "",

  // terms form
  termsConfirm: false,
  policyConfirm: false,

  // consent form
  promotions: ""
};

interface Props {
  language: string;
  pageOptions: CmsPageOptions;
}

const track = (value: string) => {
  window.dataLayer.push({
    event: "registration_step",
    value: value
  });
};

const Registration: React.FC<Props> = ({ pageOptions, language }) => {
  const {
    countryISO,
    countryPhoneCode,
    lander,
    currencyISO,
    phoneCodes,
    countries,
    handleRegister
  } = mapPageOptions(pageOptions);

  const theme = useTheme();
  // TODO: fix type
  const brand = (theme as any).brand as Brand;

  const { Card, InlineModal } = useRegistry();
  const [isOpenByButton, setIsOpenByButton] = React.useState(false);
  const [page, setPage] = React.useState<string | undefined>(undefined);
  const [step, setStep] = React.useState(Steps.EmailAndPassword);
  const [isLoading, setIsLoading] = React.useState(false);

  const dispatch = useDispatch();
  const registrationIsOpen = useSelector(getRegistrationStatus);
  const handleToggleRegistration = React.useCallback(
    () => dispatch(toggleRegistration()),
    []
  );

  const initialValues = React.useMemo(
    () => ({
      ...INITIAL_VALUES,
      countryISO,
      phone: countryPhoneCode
    }),
    [countryISO, countryPhoneCode]
  );

  const [storedValue, setValue, removeStoredValue] = useLocalStorage(
    "registration",
    omit(initialValues, "pinCode")
  );

  const handleReturnToStep = React.useCallback(
    (formik: FormikProps<RegistrationFormValues>) => (step: number) => {
      setStep(step);
      formik.setTouched({});
    },
    []
  );

  React.useEffect(() => {
    const formButton = document.querySelectorAll<HTMLDivElement>(
      "#registration-cta a, #registration-cta"
    );

    formButton.forEach(e =>
      e.addEventListener("click", event => {
        event.preventDefault();

        setIsOpenByButton(true);
        return false;
      })
    );
  }, [brand]);

  const processError: <T>(
    err: { errors: [{ field: string; message: string }]; step?: number },
    actions: FormikHelpers<T>
  ) => void = React.useCallback((err, actions) => {
    if (err.step) {
      setStep(err.step);
    }

    if (err.errors && err.errors.length) {
      err.errors.forEach(({ field, message }) => {
        actions.setFieldError(field, message);
      });
    }
  }, []);

  const handleResendPinCode = React.useCallback(
    async (
      values: RegistrationFormValues,
      actions: FormikHelpers<RegistrationFormValues>
    ) => {
      try {
        const { phone, email } = values;
        await activatePhone({
          phone,
          email,
          language,
          countryISO: countryISO!,
          retry: true
        });
        actions.setFieldValue("pinCode", "");
      } catch (err: any) {
        processError(err, actions);
        return Promise.reject(err);
      }
    },
    [language, countryISO]
  );

  const validationSchema = useRegistrationValidationSchema(step);

  const handleEmailAndPasswordStepSubmit = React.useCallback(
    async (
      values: RegistrationFormValues,
      actions: FormikHelpers<EmailAndPasswordFormValues>
    ) => {
      setStep(Steps.PersonalInfo);
      setIsOpenByButton(true); // it returns to full screen email step on onReturnToStep if first step wasn't full screen
      actions.setSubmitting(false);
      actions.setTouched({});
      track(Steps[2]);
      setValue(omit(values, "pinCode"));
    },
    []
  );

  const handlePersonalInfoStepSubmit = React.useCallback(
    async (
      values: RegistrationFormValues,
      actions: FormikHelpers<PersonalInfoFormValues>
    ) => {
      try {
        const { phone } = values;
        await validatePhone({ phone, language, countryISO: countryISO! });
        setStep(Steps.Address);
        actions.setTouched({});
        setValue(omit(values, "pinCode"));
      } catch (err: any) {
        processError(err, actions);
      } finally {
        actions.setSubmitting(false);
        track(Steps[3]);
      }
    },
    []
  );

  const handleAddressStepSubmit = React.useCallback(
    async (
      values: RegistrationFormValues,
      actions: FormikHelpers<PersonalInfoFormValues>
    ) => {
      try {
        const { phone, email } = values;
        await activatePhone({
          phone,
          email,
          language,
          countryISO: countryISO!
        });
        setStep(Steps.Confirmation);
        actions.setTouched({});
        setValue(omit(values, "pinCode"));
      } catch (err: any) {
        processError(err, actions);
      } finally {
        actions.setSubmitting(false);
        track(Steps[4]);
      }
    },
    [language, countryISO]
  );

  const handleConfirmationSubmit = React.useCallback(
    (_: TermsFormValues, actions: FormikHelpers<ConfirmationFormValues>) => {
      setStep(Steps.Terms);
      actions.setSubmitting(false);
      actions.setTouched({});
      track(Steps[5]);
    },
    []
  );

  const handleTermsSubmit = React.useCallback(
    (_: TermsFormValues, actions: FormikHelpers<TermsFormValues>) => {
      setStep(Steps.Consent);
      actions.setSubmitting(false);
      actions.setTouched({});
      track(Steps[6]);
    },
    []
  );

  const handleFormSubmit = React.useCallback(
    async (
      {
        promotions,
        termsConfirm,
        policyConfirm,
        ...restValues
      }: RegistrationFormValues,
      actions: FormikHelpers<RegistrationFormValues>
    ) => {
      try {
        setIsLoading(true);
        const { nextUrl } = await register({
          language,
          lander,
          currencyISO,
          receivePromotional: promotions === "yes",
          accept: termsConfirm && policyConfirm ? "1" : "0",
          ...restValues
        });
        removeStoredValue();

        handleRegister(nextUrl!);
      } catch (err: any) {
        processError(err, actions);
        setIsLoading(false);
      } finally {
        actions.setSubmitting(false);
        track(Steps[6]);
      }
    },
    [language, lander, currencyISO]
  );

  const submitHandlers = {
    [Steps.EmailAndPassword]: handleEmailAndPasswordStepSubmit,
    [Steps.PersonalInfo]: handlePersonalInfoStepSubmit,
    [Steps.Address]: handleAddressStepSubmit,
    [Steps.Confirmation]: handleConfirmationSubmit,
    [Steps.Terms]: handleTermsSubmit,
    [Steps.Consent]: handleFormSubmit
  };

  const handleClose = React.useCallback(() => {
    setStep(Steps.EmailAndPassword);
    setIsOpenByButton(false);

    if (registrationIsOpen) {
      handleToggleRegistration();
    }
  }, [brand, registrationIsOpen, handleToggleRegistration]);

  return (
    <Formik
      initialValues={{ ...storedValue, pinCode: "" }}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      onSubmit={submitHandlers[step]}
      validationSchema={validationSchema}
      enableReinitialize
      validateOnMount
    >
      {formik => (
        <>
          {page && (
            <InlineModal>
              <FramePage
                page={page}
                lang={language}
                onClose={() => setPage(undefined)}
              />
            </InlineModal>
          )}
          {!page && step === Steps.EmailAndPassword && !isOpenByButton && (
            <Card>
              <EmailPasswordForm />
            </Card>
          )}
          {!page &&
            step === Steps.EmailAndPassword &&
            (isOpenByButton || registrationIsOpen) && (
              <InlineModal>
                <FullscreenFormWrapper
                  key={1} // Keys needed for proper children rendering
                  activeStep={1}
                  onClose={handleClose}
                  onReturnToStep={() => {}}
                >
                  <EmailPasswordForm fullscreen={true} />
                </FullscreenFormWrapper>
              </InlineModal>
            )}
          {!page && step === Steps.PersonalInfo && (
            <InlineModal>
              <FullscreenFormWrapper
                key={2}
                activeStep={2}
                onClose={handleClose}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                onReturnToStep={handleReturnToStep(formik)}
              >
                <PersonalInfoForm
                  countryISO={countryISO!}
                  phoneCodes={phoneCodes!}
                />
              </FullscreenFormWrapper>
            </InlineModal>
          )}
          {!page && step === Steps.Address && (
            <InlineModal>
              <FullscreenFormWrapper
                key={3}
                activeStep={3}
                onClose={handleClose}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                onReturnToStep={handleReturnToStep(formik)}
              >
                <AddressForm countries={countries!} countryISO={countryISO!} />
              </FullscreenFormWrapper>
            </InlineModal>
          )}
          {!page && step === Steps.Confirmation && (
            <InlineModal>
              <FullscreenFormWrapper
                key={4}
                activeStep={4}
                onClose={handleClose}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                onReturnToStep={handleReturnToStep(formik)}
              >
                <ConfirmationForm
                  countryISO={countryISO!}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  onResendPinCode={handleResendPinCode}
                />
              </FullscreenFormWrapper>
            </InlineModal>
          )}
          {!page && step === Steps.Terms && (
            <InlineModal>
              <FullscreenFormWrapper key={5} onClose={handleClose}>
                <TermsForm onOpenPage={setPage} />
              </FullscreenFormWrapper>
            </InlineModal>
          )}
          {!page && step === Steps.Consent && (
            <InlineModal>
              <FullscreenFormWrapper key={6} onClose={handleClose}>
                <ConsentForm
                  onButtonClick={(value: "yes" | "no") =>
                    formik.setFieldValue("promotions", value, false)
                  }
                  isLoading={isLoading}
                />
              </FullscreenFormWrapper>
            </InlineModal>
          )}
        </>
      )}
    </Formik>
  );
};

export default Registration;
