import React from "react";
import {
  CustomButton,
  CustomForm,
  ButtonDiv,
  RightButton,
} from "./../../index.styled";
import { Input, Select, Button, Display } from "ui";
import { useTranslation } from "next-export-i18n";
import * as yup from "yup";
import { Formik, Field, Form } from "formik";

const EditBilling = ({ data, onBackClick, onSubmit, loading }) => {
  const { t } = useTranslation();

  const validationAccountSchema = yup.object().shape({
    first_name: yup.string().required(t("REQUIRED_ERR")),
    last_name: yup.string().required(t("REQUIRED_ERR")),
    email: yup
      .string()
      .required(t("REQUIRED_ERR"))
      .email(t("USERNAME_ERR_EMAIL")),
    phone_number: yup.string().required(t("REQUIRED_ERR")),
    company_name: yup.string().required(t("REQUIRED_ERR")),
    billing_email: yup
      .string()
      .required(t("REQUIRED_ERR"))
      .email(t("USERNAME_ERR_EMAIL")),
    tax_id: yup.string().required(t("REQUIRED_ERR")),
    company_reg_no: yup.string().required(t("REQUIRED_ERR")),
    address1: yup.string().required(t("REQUIRED_ERR")),
    address2: yup.string(),
    region: yup.string().required(t("REQUIRED_ERR")),
    city: yup.string().required(t("REQUIRED_ERR")),
    postal_code: yup.string().required(t("REQUIRED_ERR")),
    country: yup.string().required(t("REQUIRED_ERR")),
  });

  return (
    <>
      <Formik
        initialValues={data}
        validationSchema={validationAccountSchema}
        onSubmit={onSubmit}
      >
        {({ errors, touched, setFieldValue, values }) => (
          <CustomForm>
            <Display label="Contact info">
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
              />
              <Field
                labelText={t("EMAIL")}
                id="email"
                name="email"
                as={Input}
                fullWidth
                error={errors.email && touched.email ? errors.email : ""}
              />
              <Field
                labelText={t("PHONE")}
                id="phone_number"
                name="phone_number"
                as={Input}
                fullWidth
                error={
                  errors.phone_number && touched.phone_number
                    ? errors.phone_number
                    : ""
                }
              />
            </Display>
            <Display label="Company info">
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
              />
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
              />
              <Field
                labelText={t("TAX_ID")}
                id="tax_id"
                name="tax_id"
                as={Input}
                fullWidth
                error={errors.tax_id && touched.tax_id ? errors.tax_id : ""}
              />
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
              />
            </Display>
            <Display label="Billing address">
              <Field
                labelText={t("COUNTRY")}
                id="country"
                name="country"
                as={Select}
                fullWidth
                options={["USA", "UK"]}
                error={errors.country && touched.country ? errors.country : ""}
                onOptionChange={({}, value) => {
                  setFieldValue("country", value);
                  let valueToSave = { ...values };
                  valueToSave.country = value;
                }}
              />
              <Field
                labelText={t("ADDRESS")}
                id="address1"
                name="address1"
                as={Input}
                fullWidth
                error={
                  errors.address1 && touched.address1 ? errors.address1 : ""
                }
              />
              <Field id="address2" name="address2" as={Input} fullWidth />
              <Field
                labelText={t("CITY")}
                id="city"
                name="city"
                as={Input}
                fullWidth
                error={errors.city && touched.city ? errors.city : ""}
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
              />
              <Field
                labelText={t("REGION")}
                id="region"
                name="region"
                as={Input}
                fullWidth
                error={errors.region && touched.region ? errors.region : ""}
              />
            </Display>
            <ButtonDiv>
              <Button buttonType="white-outline" onClick={onBackClick}>
                {t("CANCEL")}
              </Button>
              <RightButton type="submit" loading={loading}>
                {t("UPDATE")}
              </RightButton>
            </ButtonDiv>
          </CustomForm>
        )}
      </Formik>
    </>
  );
};

export default EditBilling;
