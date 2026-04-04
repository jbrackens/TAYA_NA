import React from "react";
import { Modal, Button, Input } from "ui";
import { useTranslation } from "next-export-i18n";
import { useFormik } from "formik";
import { ModalContent, CustomField } from "./../index.style";
import * as yup from "yup";

const CreateUserModal = ({ show, close, createUser, loading }) => {
  const { t } = useTranslation();

  const closeUserModal = () => {
    close();
    userFormikForm.resetForm();
  };

  const userValidationSchema = yup.object().shape({
    username: yup
      .string()
      .required(t("REQUIRED_ERROR"))
      .min(10, t("MIN_CHAR_ERR"))
      .max(20, t("MAX_CHAR_ERR")),
    password: yup
      .string()
      .required(t("REQUIRED_ERROR"))
      .min(10, t("MIN_CHAR_ERR")),
    confirmPassword: yup
      .string()
      .required(t("REQUIRED_ERROR"))
      .oneOf([yup.ref("password"), null], t("PASSWORD_MATCH_ERR")),
  });

  const userFormikForm = useFormik({
    initialValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: userValidationSchema,
    onSubmit: (values) => {
      createUser({
        username: values.username,
        password: values.password,
      });
    },
  });

  return (
    <>
      <Modal
        modalheader={t("CREATE_USER")}
        display={show}
        onCloseButtonClicked={closeUserModal}
      >
        <ModalContent>
          <form onSubmit={userFormikForm.handleSubmit}>
            <CustomField>
              <Input
                labelText={t("USERNAME")}
                id="username"
                name="username"
                onChange={userFormikForm.handleChange}
                value={userFormikForm.values.username}
                fullWidth
                error={
                  userFormikForm.errors.username &&
                  userFormikForm.touched.username
                    ? userFormikForm.errors.username
                    : ""
                }
              />
            </CustomField>
            <CustomField>
              <Input
                labelText={t("PASSWORD")}
                id="password"
                name="password"
                onChange={userFormikForm.handleChange}
                value={userFormikForm.values.password}
                fullWidth
                type="password"
                error={
                  userFormikForm.errors.password &&
                  userFormikForm.touched.password
                    ? userFormikForm.errors.password
                    : ""
                }
              />
            </CustomField>
            <CustomField>
              <Input
                labelText={t("CONFIRM_PASSWORD")}
                id="confirmPassword"
                name="confirmPassword"
                onChange={userFormikForm.handleChange}
                value={userFormikForm.values.confirmPassword}
                fullWidth
                type="password"
                error={
                  userFormikForm.errors.confirmPassword &&
                  userFormikForm.touched.confirmPassword
                    ? userFormikForm.errors.confirmPassword
                    : ""
                }
              />
            </CustomField>
            <Button fullWidth type="submit" loading={loading}>
              {t("CREATE")}
            </Button>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreateUserModal;
