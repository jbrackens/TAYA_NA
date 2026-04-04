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
import { ContactDataType } from "utils";

type ContactDetailsFormProps = {
  nextStep?: () => void;
  prevStep?: () => void;
  data: ContactDataType;
  saveData: (data: ContactDataType) => void;
};

const ContactDetailsForm: FC<ContactDetailsFormProps> = ({
  nextStep,
  prevStep,
  data,
  saveData,
}) => {
  const { t } = useTranslation();

  const phoneRegExp =
    /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

  const validationAccountSchema = yup.object().shape({
    first_name: yup.string().required(t("REQUIRED_ERR")),
    last_name: yup.string().required(t("REQUIRED_ERR")),
    email: yup
      .string()
      .required(t("REQUIRED_ERR"))
      .email(t("USERNAME_ERR_EMAIL")),
    phone_number: yup
      .string()
      .matches(phoneRegExp, t("PHONE_NOT_MATCH"))
      .min(8, t("PHONE_MIN_CHAR"))
      .required(t("REQUIRED_ERR")),
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
            <Row>
              <Field
                labelText={t("FIRST_NAME")}
                id="first_name"
                name="first_name"
                as={Input}
                fullWidth
                error={
                  errors.first_name && touched.first_name
                    ? errors.first_name
                    : ""
                }
                onBlur={() => {
                  saveData(values);
                }}
              />
              <Field
                labelText={t("LAST_NAME")}
                id="last_name"
                name="last_name"
                as={Input}
                fullWidth
                error={
                  errors.last_name && touched.last_name ? errors.last_name : ""
                }
                onBlur={() => {
                  saveData(values);
                }}
              />
            </Row>
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
              labelText={t("PHONE")}
              id="phone_number"
              name="phone_number"
              as={Input}
              type="number"
              fullWidth
              error={
                errors.phone_number && touched.phone_number
                  ? errors.phone_number
                  : ""
              }
              onBlur={() => {
                saveData(values);
              }}
            />
            <RegisterButtonGroup>
              <Button buttonType="white-outline" onClick={prevStep}>
                {t("BACK")}
              </Button>
              <CustomButton type="submit">{t("NEXT")}</CustomButton>
            </RegisterButtonGroup>
          </CustomForm>
        )}
      </Formik>
    </FormContainer>
  );
};

export default ContactDetailsForm;
