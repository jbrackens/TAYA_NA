import * as React from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Form, Formik, FormikHelpers } from "formik";
import { useRegistry } from "@brandserver-client/ui";
import { EmailIcon, PhoneIcon } from "@brandserver-client/icons";
import * as yup from "yup";
import { useMessages } from "@brandserver-client/hooks";
import { getUpdate } from "../../../index";
import { regexes, errorCodes } from "@brandserver-client/utils";
import { selectAppFormData } from "../../../app";
import CMSPage from "./CMSPage";

const StyledCompleteRegistration = styled(Form)`
  display: flex;
  flex-direction: column;
  align-items: center;

  .complete-registration {
    &__title {
      font-size: 50px;
      font-weight: 700;
      line-height: 64px;
      text-align: center;
      text-transform: unset;
      color: ${({ theme }) => theme.palette.primary};
    }

    &__balance {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      margin-top: 16px;

      &-label {
        font-size: 22px;
        line-height: 20px;
        color: ${({ theme }) => theme.palette.primary};
        font-weight: 700;
        text-transform: unset;
      }

      &-amount {
        margin-left: 4px;
        font-size: 28px;
        line-height: 32px;
        font-weight: 700;
        color: ${({ theme }) => theme.palette.accent};
      }
    }

    &__field {
      margin-top: 32px;
    }

    &__wrapper {
      width: 100%;
      max-width: 320px;
    }

    &__checkbox-list {
      & > *:not(:first-child) {
        margin-top: 12px;
      }

      a {
        color: ${({ theme }) => theme.palette.accent};
      }
    }

    &__submit-button {
      max-width: 200px;
      margin: 30px auto 0 auto;
    }

    &__agreement {
      max-width: 478px;
      margin-top: 50px;
      text-align: center;
      color: ${({ theme }) => theme.palette.primary};
    }
  }
`;

type FormValues = {
  email: string;
  allowPromotions: boolean;
  phone: string;
};

type Props = {
  onSubmit: (id: string, data: Record<string, unknown>) => any;
};

export const CompleteRegistration: React.FC<Props> = ({ onSubmit }) => {
  const intl = useIntl();
  const {
    balance: { CurrentTotalBalance: balanceAmount }
  } = useSelector(getUpdate);

  const { phoneRegions, phoneCountry } = useSelector(selectAppFormData);
  const [cmsPageSrc, setCmsPageSrc] = React.useState<string | undefined>(
    undefined
  );

  const {
    Field,
    TextInput,
    PhoneNumberInput,
    CheckboxInput,
    SubmitButton,
    FormattedMessageLink
  } = useRegistry();

  const handleSubmit = React.useCallback(
    async (values: FormValues, helpers: FormikHelpers<FormValues>) => {
      try {
        const response = await onSubmit("PNP_Complete", {
          pnp_complete_email: values.email,
          pnp_complete_phone: values.phone,
          pnp_complete_promo: `${values.allowPromotions}`
        });

        const responseCode = response.code?.toUpperCase();

        if (
          responseCode === errorCodes.INVALID_EMAIL ||
          responseCode === errorCodes.USER_ALREADY_EXISTS
        ) {
          helpers.setErrors({ email: response.result });
        } else if (
          responseCode === errorCodes.INVALID_PHONE_NUMBER ||
          !!responseCode
        ) {
          helpers.setErrors({ phone: response.result });
        }

        helpers.setSubmitting(false);
      } catch (error) {
        helpers.setSubmitting(false);
        console.log(error, error);
      }
    },
    []
  );

  const phoneCodes = React.useMemo(
    () => phoneRegions.map(phoneRegion => phoneRegion.code),
    [phoneRegions]
  );

  const initialValues: FormValues = React.useMemo(
    () => ({
      email: "",
      allowPromotions: false,
      phone: phoneCountry?.code || phoneCodes[0]
    }),
    [phoneCodes, phoneCountry]
  );

  const messages = useMessages({
    title: "forms.pnp.complete.title",
    balance: "forms.pnp.complete.balance",
    email: "forms.pnp.complete.options.email",
    emailPlaceholder: "register.email-placeholder",
    phone: "forms.pnp.complete.options.phone",
    promo: "forms.pnp.complete.options.promo",
    terms: "forms.pnp.complete.options.terms",
    privacy: "forms.pnp.complete.options.privacy",
    submit: "forms.pnp.complete.submit",
    agreement: "forms.pnp.complete.agreement"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      email: yup.string().required().email().label(messages.email),
      phone: yup
        .string()
        .required()
        .min(5)
        .max(15)
        .matches(regexes.PHONE_NUMBER)
        .label(messages.phone),
      termsConfirm: yup
        .boolean()
        .required()
        .oneOf([true], "Need to agree with the Terms & Conditions"),
      policyConfirm: yup
        .boolean()
        .required()
        .oneOf([true], "Need to agree with the Privacy Policy")
    });
  }, [messages]);

  const renderCompleteRegistration = React.useMemo(
    () => (
      <>
        <h2 className="complete-registration__title">{messages.title}</h2>
        <div className="complete-registration__balance">
          <h5 className="complete-registration__balance-label">
            {messages.balance}
          </h5>
          <h5 className="complete-registration__balance-amount">
            {balanceAmount}
          </h5>
        </div>
        <div className="complete-registration__wrapper">
          <Field
            name="email"
            label={messages.email}
            className="complete-registration__field"
          >
            <TextInput
              placeholder={messages.emailPlaceholder}
              rightIcon={<EmailIcon />}
            />
          </Field>
          <Field name="phone" label={messages.phone}>
            <PhoneNumberInput codes={phoneCodes} rightIcon={<PhoneIcon />}>
              {phoneCodes.map(phoneCode => (
                <option key={phoneCode}>{phoneCode}</option>
              ))}
            </PhoneNumberInput>
          </Field>
          <div className="complete-registration__checkbox-list">
            <CheckboxInput name="allowPromotions">
              {messages.promo}
            </CheckboxInput>
            <CheckboxInput name="termsConfirm">
              <FormattedMessageLink
                id={messages.terms}
                onClick={() =>
                  setCmsPageSrc(`/${intl.locale}/content/terms_and_conditions`)
                }
              />
            </CheckboxInput>
            <CheckboxInput name="policyConfirm">
              <FormattedMessageLink
                id={messages.privacy}
                onClick={() =>
                  setCmsPageSrc(`/${intl.locale}/content/privacypolicy`)
                }
              />
            </CheckboxInput>
          </div>
          <SubmitButton
            size={SubmitButton.Size.large}
            color={SubmitButton.Color.accent}
            className="complete-registration__submit-button"
          >
            {messages.submit}
          </SubmitButton>
        </div>
        <div className="complete-registration__agreement">
          {messages.agreement}
        </div>
      </>
    ),
    [messages, phoneCodes]
  );

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validateOnMount={true}
      onSubmit={handleSubmit}
    >
      {() => (
        <StyledCompleteRegistration>
          {cmsPageSrc ? (
            <CMSPage
              src={cmsPageSrc}
              onClose={() => setCmsPageSrc(undefined)}
            />
          ) : (
            renderCompleteRegistration
          )}
        </StyledCompleteRegistration>
      )}
    </Formik>
  );
};
