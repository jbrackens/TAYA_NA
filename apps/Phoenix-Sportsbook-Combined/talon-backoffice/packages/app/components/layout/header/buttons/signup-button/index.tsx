import React from "react";
import { useTranslation } from "i18n";
import { useDispatch } from "react-redux";
import { showRegisterModal } from "../../../../../lib/slices/authSlice";
import { SignUpButton } from "../index.styles";

export const SignupButtonComponent = () => {
  const { t } = useTranslation(["header"]);
  const dispatch = useDispatch();
  const dispatchShowRegisterModal = () => {
    dispatch(showRegisterModal());
  };

  return (
    <SignUpButton onClick={dispatchShowRegisterModal}>
      {t("SIGN_UP_LINK")}
    </SignUpButton>
  );
};
