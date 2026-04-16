import React from "react";
import { useSelector } from "react-redux";
import { selectResetPasswordModalVisible } from "../../../../lib/slices/authSlice";
import {
  ForgotResetPasswordModalComponent,
  ForgotResetPasswordModalType,
} from "../modal";

export const ResetPasswordComponent: React.FC = () => {
  const isModalVisible = useSelector(selectResetPasswordModalVisible);

  return (
    <ForgotResetPasswordModalComponent
      isVisible={isModalVisible}
      type={ForgotResetPasswordModalType.RESET}
    />
  );
};
