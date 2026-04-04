import React, { FC } from "react";
import { Formik, Field, Form } from "formik";
import { Input, Button } from "ui";
import {
  FormContainer,
  Row,
  RegisterButtonGroup,
  CustomButton,
  CustomForm,
} from "./../index.styled";
import { useTranslation } from "next-export-i18n";
import * as yup from "yup";
import { AccountDataType } from "utils";

type AccountDetailsFormProps = {
  nextStep?: () => void;
  prevStep?: () => void;
  data: AccountDataType;
  saveData: (data: AccountDataType) => void;
};

const AccountDetailsForm: FC<AccountDetailsFormProps> = ({
  nextStep,
  prevStep,
  data,
  saveData,
}) => {
  const { t } = useTranslation();

  const validationAccountSchema = yup.object().shape({
    username: yup.string().required(t("REQUIRED_ERR")),
    email: yup
      .string()
      .required(t("REQUIRED_ERR"))
      .email(t("USERNAME_ERR_EMAIL")),
    password: yup.string().required(t("REQUIRED_ERR")),
    confirmPassword: yup
      .string()
      .required(t("REQUIRED_ERR"))
      .oneOf([yup.ref("password"), null], "Passwords must match"),
  });

  return (
    <FormContainer>
      <Formik
        initialValues={data}
        validationSchema={validationAccountSchema}
        onSubmit={(value) => {
          nextStep();
          saveData(value);
        }}
      >
        {({ errors, touched, values }) => (
          <CustomForm>
            <Field
              labelText={t("USERNAME")}
              id="username"
              name="username"
              as={Input}
              fullWidth
              error={errors.username && touched.username ? errors.username : ""}
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field
              labelText={t("EMAIL")}
              id="email"
              name="email"
              as={Input}
              fullWidth
              error={errors.email && touched.email ? errors.email : ""}
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field
              labelText={t("PASSWORD")}
              id="password"
              name="password"
              as={Input}
              type="password"
              fullWidth
              error={errors.password && touched.password ? errors.password : ""}
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field
              labelText={t("CONFIRM_PASSWORD")}
              id="confirmPassword"
              name="confirmPassword"
              as={Input}
              type="password"
              fullWidth
              error={
                errors.confirmPassword && touched.confirmPassword
                  ? errors.confirmPassword
                  : ""
              }
              onBlur={() => {
                saveData(values);
              }}
            />
            <RegisterButtonGroup>
              <Button buttonType="white-outline" onClick={prevStep}>
                {t("CLOSE")}
              </Button>
              <CustomButton type="submit">{t("NEXT")}</CustomButton>
            </RegisterButtonGroup>
          </CustomForm>
        )}
      </Formik>
    </FormContainer>
  );
};

export default AccountDetailsForm;
