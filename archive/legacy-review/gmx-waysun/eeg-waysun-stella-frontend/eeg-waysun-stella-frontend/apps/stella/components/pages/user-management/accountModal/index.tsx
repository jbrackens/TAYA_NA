import React, { useContext, useEffect } from "react";
import { Modal, Button, Input } from "ui";
import { useTranslation } from "next-export-i18n";
import { useFormik } from "formik";
import { ModalContent, CustomField } from "./../index.style";
import * as yup from "yup";
import { UserIdContext } from "./../userIdContext";

const AccountModal = ({ show, type, label, close, modifyUser, loading }) => {
  const { t } = useTranslation();
  const { currentUserDetails } = useContext(UserIdContext);

  useEffect(() => {
    formik.resetForm();
  }, [show]);

  const closeAccountModal = () => {
    close();
    formik.resetForm();
  };

  const formValidationSchema = yup.object().shape({
    newValue: yup
      .string()
      .required(t("REQUIRED_ERROR"))
      .min(10, t("MIN_CHAR_ERR")),
    confirmNewValue: yup
      .string()
      .required(t("REQUIRED_ERROR"))
      .oneOf([yup.ref("newValue"), null], t("PASSWORD_MATCH_ERR")),
  });

  const formValidationSchemaEmail = yup.object().shape({
    newValue: yup
      .string()
      .email(t("USERNAME_ERR_EMAIL"))
      .required(t("REQUIRED_ERROR")),
    confirmNewValue: yup
      .string()
      .email(t("USERNAME_ERR_EMAIL"))
      .required(t("REQUIRED_ERROR"))
      .oneOf([yup.ref("newValue"), null], t("EMAIL_MATCH_ERR")),
  });

  const formik = useFormik({
    initialValues: {
      newValue: "",
      confirmNewValue: "",
    },
    validationSchema:
      type === "email" ? formValidationSchemaEmail : formValidationSchema,
    onSubmit: (values) => {
      switch (type) {
        case "email":
          modifyUser({
            email: values.newValue,
          });
          break;
        case "password":
          modifyUser({
            password: values.newValue,
          });
          break;
      }
    },
  });

  return (
    <>
      <Modal
        modalheader={`${t("CHANGE")} ${label} - ${currentUserDetails.username}`}
        display={show}
        onCloseButtonClicked={closeAccountModal}
      >
        <ModalContent>
          <form onSubmit={formik.handleSubmit}>
            {type === "email" && (
              <CustomField>
                <Input
                  labelText={`${t("CURRENT")} ${label}`}
                  value={currentUserDetails.email}
                  fullWidth
                  type="text"
                  disabled
                />
              </CustomField>
            )}
            <CustomField>
              <Input
                labelText={`${t("NEW")} ${label}`}
                id="newValue"
                name="newValue"
                onChange={formik.handleChange}
                value={formik.values.newValue}
                fullWidth
                type={type === "password" ? type : "text"}
                error={
                  formik.errors.newValue && formik.touched.newValue
                    ? formik.errors.newValue
                    : ""
                }
              />
            </CustomField>
            <CustomField>
              <Input
                labelText={`${t("CONFIRM_NEW")} ${label}`}
                id="confirmNewValue"
                name="confirmNewValue"
                onChange={formik.handleChange}
                value={formik.values.confirmNewValue}
                fullWidth
                type={type === "password" ? type : "text"}
                error={
                  formik.errors.confirmNewValue &&
                  formik.touched.confirmNewValue
                    ? formik.errors.confirmNewValue
                    : ""
                }
              />
            </CustomField>
            <Button fullWidth type="submit" loading={loading}>
              {t("SUBMIT")}
            </Button>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AccountModal;
