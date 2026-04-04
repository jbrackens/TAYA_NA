import React, { CSSProperties, FC } from "react";
import { StyledButton, IconDiv, MergedButtonGroupDiv } from "./index.styled";
import { LoadingOutlined } from "@ant-design/icons";

type ButtonProps = {
  buttonType?:
    | "default"
    | "primary"
    | "secondary"
    | "colored"
    | "nobackground"
    | "danger"
    | "blue-outline"
    | "white-outline";
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  fullWidth?: boolean;
  onClick?: (e: any) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  icon?: any;
  loading?: boolean;
};

export const MergedButtonGroup = ({ children }: any) => (
  <MergedButtonGroupDiv>{children}</MergedButtonGroupDiv>
);

export const Button: FC<ButtonProps> = ({
  children,
  type = "button",
  style,
  buttonType = "primary",
  fullWidth,
  onClick,
  disabled = false,
  className,
  compact = false,
  icon,
  loading = false,
}) => {
  const handleButtonCLick = (e: any) => {
    !disabled && !loading && onClick && onClick(e);
  };
  return (
    <StyledButton
      className={className}
      type={type}
      style={style}
      onClick={handleButtonCLick}
      disabled={disabled}
      $buttonType={buttonType}
      $fullWidth={fullWidth}
      $disabled={disabled}
      $compact={compact}
      $loading={loading}
    >
      {loading ? (
        <IconDiv>
          <LoadingOutlined />
        </IconDiv>
      ) : icon ? (
        <IconDiv>{icon}</IconDiv>
      ) : (
        <></>
      )}
      {children}
    </StyledButton>
  );
};

Button.defaultProps = {
  buttonType: "primary",
  fullWidth: false,
  type: "button",
  disabled: false,
};
