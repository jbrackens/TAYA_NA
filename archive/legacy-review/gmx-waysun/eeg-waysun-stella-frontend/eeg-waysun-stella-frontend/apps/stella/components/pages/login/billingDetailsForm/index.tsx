import React, { FC } from "react";
import { Formik, Field, Form } from "formik";
import { Input, Button, Select } from "ui";
import {
  FormContainer,
  Row,
  RegisterButtonGroup,
  CustomButton,
  CustomForm,
} from "./../index.styled";
import { useTranslation } from "next-export-i18n";
import * as yup from "yup";
import { BillingDataType } from "utils";

type BillingDetailsFormProps = {
  nextStep?: () => void;
  prevStep?: () => void;
  data: BillingDataType;
  saveData: (data: BillingDataType) => void;
  loading: boolean;
};

const BillingDetailsForm: FC<BillingDetailsFormProps> = ({
  nextStep,
  prevStep,
  data,
  saveData,
  loading,
}) => {
  const { t } = useTranslation();

  const validationAccountSchema = yup.object().shape({
    company_name: yup.string().required(t("REQUIRED_ERR")),
    billing_email: yup
      .string()
      .required(t("REQUIRED_ERR"))
      .email(t("USERNAME_ERR_EMAIL")),
    tax_id: yup.string().required(t("REQUIRED_ERR")),
    company_reg_no: yup.string().required(t("REQUIRED_ERR")),
    country: yup.string().required(t("REQUIRED_ERR")),
    address1: yup.string().required(t("REQUIRED_ERR")),
    address2: yup.string(),
    city: yup.string().required(t("REQUIRED_ERR")),
    postal_code: yup.string().required(t("REQUIRED_ERR")),
    region: yup.string().required(t("REQUIRED_ERR")),
  });

  return (
    <FormContainer>
      <Formik
        initialValues={data}
        validationSchema={validationAccountSchema}
        onSubmit={(value) => {
          saveData(value);
          nextStep();
        }}
      >
        {({ errors, touched, setFieldValue, values }) => (
          <CustomForm>
            <Field
              labelText={t("COMPANY_NAME")}
              id="company_name"
              name="company_name"
              as={Input}
              fullWidth
              error={
                errors.company_name && touched.company_name
                  ? errors.company_name
                  : ""
              }
              onBlur={() => {
                saveData(values);
              }}
            />
            <Row>
              <Field
                labelText={t("REG_NUMBER")}
                id="company_reg_no"
                name="company_reg_no"
                as={Input}
                fullWidth
                error={
                  errors.company_reg_no && touched.company_reg_no
                    ? errors.company_reg_no
                    : ""
                }
                onBlur={() => {
                  saveData(values);
                }}
              />
              <Field
                labelText={t("TAX_ID")}
                id="tax_id"
                name="tax_id"
                as={Input}
                fullWidth
                error={errors.tax_id && touched.tax_id ? errors.tax_id : ""}
                onBlur={() => {
                  saveData(values);
                }}
              />
            </Row>
            <Field
              labelText={t("EMAIL")}
              id="billing_email"
              name="billing_email"
              as={Input}
              fullWidth
              error={
                errors.billing_email && touched.billing_email
                  ? errors.billing_email
                  : ""
              }
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field
              labelText={t("COUNTRY")}
              id="country"
              name="country"
              as={Select}
              options={["USA", "UK"]}
              error={errors.country && touched.country ? errors.country : ""}
              onOptionChange={({}, value) => {
                setFieldValue("country", value);
                let valueToSave = { ...values };
                valueToSave.country = value;
                saveData(valueToSave);
              }}
            />
            <Field
              labelText={t("ADDRESS")}
              id="address1"
              name="address1"
              as={Input}
              fullWidth
              error={errors.address1 && touched.address1 ? errors.address1 : ""}
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field id="address2" name="address2" as={Input} fullWidth />
            <Field
              labelText={t("CITY")}
              id="city"
              name="city"
              as={Input}
              fullWidth
              error={errors.city && touched.city ? errors.city : ""}
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field
              labelText={t("POSTAL_CODE")}
              id="postal_code"
              name="postal_code"
              as={Input}
              fullWidth
              error={
                errors.postal_code && touched.postal_code
                  ? errors.postal_code
                  : ""
              }
              onBlur={() => {
                saveData(values);
              }}
            />
            <Field
              labelText={t("REGION")}
              id="region"
              name="region"
              as={Input}
              fullWidth
              error={errors.region && touched.region ? errors.region : ""}
              onBlur={() => {
                saveData(values);
              }}
            />
            <RegisterButtonGroup>
              <Button buttonType="white-outline" onClick={prevStep}>
                {t("BACK")}
              </Button>
              <CustomButton type="submit" loading={loading}>
                {t("SUBMIT")}
              </CustomButton>
            </RegisterButtonGroup>
          </CustomForm>
        )}
      </Formik>
    </FormContainer>
  );
};

export default BillingDetailsForm;
