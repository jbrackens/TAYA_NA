import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";
import { regexes } from "@brandserver-client/utils";
import { differenceInYears, format } from "date-fns";
import mapValues from "lodash/mapValues";
import { useMemo } from "react";
import { Steps } from ".";

const dateTransform = (value: string) => {
  if (!value) {
    return value;
  }

  // Moment parse empty and 2 digits years not in desired way
  // That's why there's a need to check if the date string starts with 4 digit year
  if (value.search(/^\d{4}-/) < 0) {
    return "";
  }

  const dateFormat = "yyyy-MM-dd";

  // Return empty string for invalid date
  try {
    return format(new Date(value), dateFormat);
  } catch (error) {
    return "";
  }
};

const testAge = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const duration = differenceInYears(new Date(), new Date(value));
  return duration >= 18 && duration < 100;
};

const useRegistrationValidationSchema = (step: Steps) => {
  const labels = mapValues(
    useMessages({
      email: "login.email",
      password: "login.password",
      phone: "my-account.profile.phone",
      firstName: "register.firstname",
      lastName: "register.lastname",
      birthDate: "register.birthdate",
      postCode: "register.postcode",
      city: "register.city",
      address: "register.street-address",
      pinCode: "register.pincode"
    })
  );

  const emailAndPasswordFormValidationSchema = useMemo(
    () =>
      yup.object().shape({
        email: yup.string().required().email().label(labels.email),
        password: yup
          .string()
          .required()
          .min(8)
          .matches(regexes.PASSWORD)
          .label(labels.password)
      }),
    [labels]
  );

  const personalInfoFormValidationSchema = useMemo(
    () =>
      yup.object().shape({
        phone: yup
          .string()
          .matches(/^\+\d{6,14}$/)
          .required()
          .label(labels.phone),
        firstName: yup
          .string()
          .matches(/^[^0-9@]*$/)
          .label(labels.firstName)
          .required(),
        lastName: yup
          .string()
          .matches(/^[^0-9@]*$/)
          .label(labels.lastName)
          .required(),
        dateOfBirth: yup
          .string()
          .transform(dateTransform)
          .required()
          .test("date-min-max-test", "validation.birthday", testAge)
          .label(labels.birthDate)
      }),
    [labels]
  );

  const addressFormValidationSchema = useMemo(
    () =>
      yup.object().shape({
        address: yup.string().required().label(labels.address),
        postCode: yup.string().label(labels.postCode).required(),
        city: yup
          .string()
          .matches(/^[^0-9@]*$/)
          .label(labels.city)
          .required()
      }),
    [labels]
  );

  const confirmationFormValidationSchema = useMemo(
    () =>
      yup.object().shape({
        pinCode: yup.string().required().length(6).label(labels.pinCode)
      }),
    [labels]
  );

  const termsFormValidationSchema = useMemo(
    () =>
      yup.object().shape({
        termsConfirm: yup
          .boolean()
          .required()
          .oneOf([true], "Need to agree with the Terms & Conditions"),
        policyConfirm: yup
          .boolean()
          .required()
          .oneOf([true], "Need to agree with the Privacy Policy")
      }),
    []
  );

  const consentFormValidationSchema = useMemo(
    () =>
      yup.object().shape({
        promotions: yup.string().required().oneOf(["yes", "no"])
      }),
    [labels]
  );

  switch (step) {
    case Steps.EmailAndPassword:
      return emailAndPasswordFormValidationSchema;
    case Steps.PersonalInfo:
      return personalInfoFormValidationSchema;
    case Steps.Address:
      return addressFormValidationSchema;
    case Steps.Confirmation:
      return confirmationFormValidationSchema;
    case Steps.Terms:
      return termsFormValidationSchema;
    case Steps.Consent:
      return consentFormValidationSchema;
  }
};

export { useRegistrationValidationSchema };
