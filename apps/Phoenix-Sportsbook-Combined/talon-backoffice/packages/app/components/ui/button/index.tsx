import React, { ReactNode } from "react";
import { BaseButton } from "./index.styles";

export type CoreButtontProps = {
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  disabled?: boolean;
  loading?: boolean;
  htmlType?: "button" | "submit" | "reset";
  size?: "large" | "middle" | "small";
  block?: boolean;
  icon?: ReactNode;
  href?: string;
  shape?: "circle" | "round";
  className?: any;
  type?: "default" | "primary" | "ghost" | "dashed" | "link" | "text";
  // for testing purposes
  role?: string;
  testId?: string;
  danger?: boolean;
  children?: React.ReactNode;
};

export const CoreButton: React.FC<CoreButtontProps> = ({
  onClick,
  disabled,
  loading,
  htmlType,
  size,
  block,
  icon,
  href,
  shape,
  children,
  className,
  type,
  role,
  danger,
  testId,
}) => {
  return (
    <BaseButton
      className={className}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      htmlType={htmlType}
      size={size}
      block={block}
      icon={icon}
      href={href}
      shape={shape}
      type={type}
      role={role}
      danger={danger}
      data-testid={testId}
    >
      {children}
    </BaseButton>
  );
};
