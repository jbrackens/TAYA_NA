import React, { useEffect, FC } from "react";
import { Formik, Field, Form } from "formik";
import { SettingsContent, CustomButton, CustomField } from "./../index.styled";
import { useTranslation } from "next-export-i18n";
import { Input, message } from "ui";
import { useApi } from "../../../../services/api-service";
import {
  ChangePasswordApiResponseData,
  ChangePasswordPayloadData,
  status,
} from "utils";
import * as yup from "yup";

const ChangePassword = () => {
  const { t } = useTranslation();

  const postPassword: {
    data: ChangePasswordApiResponseData;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    "ipm/profile/change_password",
    "POST",
    "https://16a45b03-003e-4b14-9d11-4af34eed72d1.mock.pstmn.io",
  );

  const formValidationSchema = yup.object().shape({
    oldPassword: yup.string().required(t("REQUIRED_ERROR")),
    newPassword: yup.string().required(t("REQUIRED_ERROR")),
    confirmNewPassword: yup
      .string()
      .required(t("REQUIRED_ERROR"))
      .oneOf([yup.ref("newPassword"), null], t("PASSWORD_MATCH_ERR")),
  });

  const submitPassword = (values, { resetForm }) => {
    const payload: ChangePasswordPayloadData = {
      old_password: values.oldPassword,
      new_password: values.newPassword,
    };
    postPassword.triggerApi(payload);
    resetForm();
  };

  useEffect(() => {
    if (!postPassword.data) return;
    if (postPassword.data.status !== status.OK) return;

    message.success(t("PASSWORD_SUCCESS"));
    postPassword.resetHookState();
  }, [postPassword.data]);

  useEffect(() => {
    if (postPassword.error) {
      message.error(t("PASSWORD_ERROR"));
      postPassword.resetHookState();
      return;
    }
  }, [postPassword.error]);

  return (
    <SettingsContent $customWidth={450}>
      <Formik
        initialValues={{
          oldPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        }}
        validationSchema={formValidationSchema}
        onSubmit={submitPassword}
      >
        {({ errors, touched }) => (
          <Form>
            <CustomField>
              <Field
                labelText={t("OLD_PASSWORD")}
                id="oldPassword"
                name="oldPassword"
                as={Input}
                fullWidth
                type="password"
                error={
                  errors.oldPassword && touched.oldPassword
                    ? errors.oldPassword
                    : ""
                }
              />
            </CustomField>
            <CustomField>
              <Field
                labelText={t("NEW_PASSWORD")}
                id="newPassword"
                name="newPassword"
                as={Input}
                fullWidth
                type="password"
                error={
                  errors.newPassword && touched.newPassword
                    ? errors.newPassword
                    : ""
                }
              />
            </CustomField>
            <CustomField>
              <Field
                labelText={t("CONFIRM_PASSWORD")}
                id="confirmNewPassword"
                name="confirmNewPassword"
                as={Input}
                fullWidth
                type="password"
                error={
                  errors.confirmNewPassword && touched.confirmNewPassword
                    ? errors.confirmNewPassword
                    : ""
                }
              />
            </CustomField>
            <CustomButton
              fullWidth
              type="submit"
              loading={postPassword.isLoading}
            >
              {t("CHANGE_PASSWORD")}
            </CustomButton>
          </Form>
        )}
      </Formik>
    </SettingsContent>
  );
};

export default ChangePassword;
