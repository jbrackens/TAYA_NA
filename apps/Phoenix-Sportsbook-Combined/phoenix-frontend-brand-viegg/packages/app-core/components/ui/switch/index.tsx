import React, { ReactNode } from "react";
import { BaseSwitch } from "./index.styled";

export type CoreSwitchProps = {
  autoFocus?: boolean;
  checked?: boolean;
  checkedChildren?: ReactNode;
  className?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: "default" | "small";
  unCheckedChildren?: ReactNode;
  onChange?: (checked: boolean) => any;
  onClick?: (checked: boolean) => any;
};

export const CoreSwitch: React.FC<CoreSwitchProps> = ({
  autoFocus,
  checked,
  checkedChildren,
  className,
  defaultChecked,
  disabled,
  loading,
  size,
  unCheckedChildren,
  onChange,
  onClick,
  // we need to pass props from form ( we can replace props with id on last antd version)
  ...props
}) => {
  return (
    <BaseSwitch
      autoFocus={autoFocus}
      checked={checked}
      checkedChildren={checkedChildren}
      className={className}
      defaultChecked={defaultChecked}
      disabled={disabled}
      loading={loading}
      size={size}
      unCheckedChildren={unCheckedChildren}
      onChange={onChange}
      onClick={onClick}
      {...props}
    />
  );
};
