import * as React from "react";
import { Form, Formik, FormikProps, FormikHelpers } from "formik";
import {
  PhoneValidationResponse,
  SendCodeResponse,
  LoginResponse
} from "@brandserver-client/types";
import { AlertIcon, PhoneIcon } from "@brandserver-client/icons";
import { useRegistry } from "@brandserver-client/ui";
import { regexes } from "@brandserver-client/utils";
import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";

interface PhoneFormValues {
  phone: string;
  pinCode: string;
  showCodeBox: boolean;
}

interface PhoneFormProps {
  phoneCodes: {
    active: string;
    all: string[];
  };
  onValidatePhoneNumber: (phone: string) => Promise<PhoneValidationResponse>;
  onSendCode: (phone: string, retry?: boolean) => Promise<SendCodeResponse>;
  onPhoneLogin: (phone: string, code: string) => Promise<LoginResponse>;
  onLoginResponse: (response: LoginResponse) => void;
  onCloseModal: () => void;
  onToggleFullScreenRegistration: () => void;
}

const PhoneForm: React.FC<PhoneFormProps> = ({
  phoneCodes: { all: allPhoneCodes, active },
  onValidatePhoneNumber,
  onSendCode,
  onPhoneLogin,
  onLoginResponse,
  onCloseModal,
  onToggleFullScreenRegistration
}) => {
  const [clearPin, setClearPin] = React.useState(false);

  const INITIAL_VALUES: PhoneFormValues = {
    phone: active,
    pinCode: "",
    showCodeBox: false
  };

  const handleOpenRegistration = () => {
    onCloseModal();
    onToggleFullScreenRegistration();
  };

  const { Field, PhoneNumberInput, SecurityInput, Button, SubmitButton } =
    useRegistry();

  const messages = useMessages({
    phone: "my-account.profile.phone",
    invalidPhoneError: "error.invalid-phone",
    pinCode: "password-reset.pincode-placeholder",
    pinCodeHelper: "register.confirmation.verification-code-resend",
    codeSent: "login.code-sent",
    newCodeSent: "register.confirmation.new-code-sent",
    sendCode: "login.send-code",
    submit: "login.action",
    dontHaveAccount: "login.donthaveaccount",
    dontHaveAccount2: "login.donthaveaccount2"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      phone: yup
        .string()
        .required()
        .min(5)
        .max(15)
        .matches(regexes.PHONE_NUMBER)
        .label(messages.phone),
      showCodeBox: yup.boolean(),
      pinCode: yup.string().when("showCodeBox", {
        is: true,
        then: yup.string().required().length(6).label(messages.pinCode)
      })
    });
  }, [messages]);

  const handleValidPhoneNumber = React.useCallback(
    async (
      {
        setSubmitting,
        values: { phone },
        setFieldError,
        setFieldValue,
        setStatus
      }: FormikProps<PhoneFormValues>,
      sentAgain?: boolean,
      retry?: boolean
    ) => {
      try {
        setSubmitting(true);
        const { valid } = await onValidatePhoneNumber(phone);

        if (!valid) {
          setClearPin(true);
          return setFieldError("phone", messages.invalidPhoneError);
        }

        retry && setClearPin(true);
        setFieldValue("showCodeBox", true);
        setStatus({ sentAgain });
        onSendCode(phone, retry);
      } catch (error) {
        console.log(error, "error");
      } finally {
        setSubmitting(false);
        setClearPin(false);
      }
    },
    [messages.invalidPhoneError]
  );

  const handleSubmit = React.useCallback(
    async (
      { phone, pinCode }: PhoneFormValues,
      { setSubmitting, setFieldError }: FormikHelpers<PhoneFormValues>
    ) => {
      try {
        const response = await onPhoneLogin(phone, pinCode);

        const { ok, result } = response;

        if (ok !== undefined && !ok && result) {
          return setFieldError("pinCode", result);
        }

        onLoginResponse(response);
      } catch (error) {
        console.log(error, "error");
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return (
    <Formik
      initialValues={INITIAL_VALUES}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
    >
      {form => (
        <Form>
          <div className="input-list">
            <div className="input-item">
              <Field
                name="phone"
                label={messages.phone}
                helper={
                  <Field.HelperText>{messages.codeSent}</Field.HelperText>
                }
              >
                <PhoneNumberInput
                  codes={allPhoneCodes}
                  rightIcon={<PhoneIcon />}
                >
                  {allPhoneCodes.map(phoneCode => (
                    <option key={phoneCode}>{phoneCode}</option>
                  ))}
                </PhoneNumberInput>
              </Field>
            </div>
            {form.values.showCodeBox && (
              <div className="input-item">
                <Field
                  name="pinCode"
                  label={messages.pinCode}
                  helper={
                    <Field.HelperAction
                      onClick={() => handleValidPhoneNumber(form, true, true)}
                    >
                      {messages.pinCodeHelper}
                    </Field.HelperAction>
                  }
                >
                  <SecurityInput clear={clearPin} />
                </Field>
                {form.status && form.status.sentAgain && (
                  <div className="input-item__alert">
                    <AlertIcon />
                    {messages.newCodeSent}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="footer-wrap">
            <div className="footer footer--phone-form">
              {messages.dontHaveAccount}{" "}
              <a onClick={handleOpenRegistration}>
                {messages.dontHaveAccount2}
              </a>
            </div>
            {!form.values.showCodeBox && (
              <SubmitButton
                color={Button.Color.accent}
                size={Button.Size.large}
                onClick={() => handleValidPhoneNumber(form, false)}
              >
                {messages.sendCode}
              </SubmitButton>
            )}
            {form.values.showCodeBox && (
              <SubmitButton
                color={Button.Color.accent}
                size={Button.Size.large}
              >
                {messages.submit}
              </SubmitButton>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default PhoneForm;
