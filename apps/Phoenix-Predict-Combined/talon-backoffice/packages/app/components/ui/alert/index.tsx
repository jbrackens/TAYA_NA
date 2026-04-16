import React, { MouseEventHandler, ReactNode } from "react";
import { BaseAlert } from "./index.styled";

export type AlertProps = {
  action?: ReactNode;
  afterClose?: () => void;
  banner?: boolean;
  closable?: boolean;
  closeText?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  message?: ReactNode;
  showIcon?: boolean;
  type?: "success" | "info" | "warning" | "error";
  onClose?: MouseEventHandler<HTMLButtonElement>;
  role?: string;
  testId?: string;
  children?: React.ReactNode;
};

const CoreAlert: React.FC<AlertProps> = ({
  action,
  afterClose,
  banner,
  closable,
  closeText,
  description,
  icon,
  message,
  showIcon,
  type,
  onClose,
  children,
  role,
  testId,
}) => {
  return (
    <BaseAlert
      action={action}
      afterClose={afterClose}
      banner={banner}
      closable={closable}
      closeText={closeText}
      description={description}
      icon={icon}
      message={message}
      showIcon={showIcon}
      type={type}
      onClose={onClose}
      role={role}
      data-testid={testId}
    >
      {children}
    </BaseAlert>
  );
};

export { CoreAlert };
