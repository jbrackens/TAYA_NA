import React from "react";
import { useTranslation } from "i18n";
import { useDispatch } from "react-redux";
import { showAuthModal } from "../../../../../lib/slices/authSlice";
import { LoginButton } from "../index.styles";

export const LoginButtonComponent = () => {
  const { t } = useTranslation(["header"]);
  const dispatch = useDispatch();
  const dispatchShowAuthModal = () => {
    dispatch(showAuthModal());
  };

  return (
    <LoginButton onClick={() => dispatchShowAuthModal()}>
      {t("LOGIN_LINK")}
    </LoginButton>
  );
};
