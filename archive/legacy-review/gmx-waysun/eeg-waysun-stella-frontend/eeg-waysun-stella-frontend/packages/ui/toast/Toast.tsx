import { FC } from "react";
import { ToastContainer, IconContainer } from "./index.styled";
import {
  InfoCircleFilled,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";

type ToastProps = {
  type?: "default" | "success" | "info" | "error";
  show?: boolean;
};

export const Toast: FC<ToastProps> = ({
  show = true,
  children = "Toast",
  type = "default",
}) => {
  const chooseIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleFilled />;
      case "error":
        return <CloseCircleFilled />;
      default:
        return <InfoCircleFilled />;
    }
  };
  return (
    <ToastContainer $show={show}>
      <IconContainer $type={type}>{chooseIcon()}</IconContainer>
      {children}
    </ToastContainer>
  );
};
