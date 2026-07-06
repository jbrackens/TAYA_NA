import React from "react";
import { useSelector } from "react-redux";
import { selectForgotPasswordModalVisible } from "../../../../lib/slices/authSlice";
import {
  ForgotResetPasswordModalComponent,
  ForgotResetPasswordModalType,
} from "../modal";

export const ForgotPasswordComponent: React.FC = () => {
  const isModalVisible = useSelector(selectForgotPasswordModalVisible);

  return (
    <ForgotResetPasswordModalComponent
      isVisible={isModalVisible}
      type={ForgotResetPasswordModalType.FORGOT}
    />
  );
};
