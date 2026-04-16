import React from "react";
import { BaseCheckbox, BaseCheckboxGroup } from "./index.styled";

export type CoreCheckboxtProps = {
  autoFocus?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onChange?: (e: any) => void;
  value?: any;
};

const CoreCheckbox: React.FC<CoreCheckboxtProps> & {
  Group: any;
} = ({
  autoFocus,
  checked,
  defaultChecked,
  disabled,
  indeterminate,
  onChange,
  children,
  value,
}) => {
  return (
    <BaseCheckbox
      autoFocus={autoFocus}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      indeterminate={indeterminate}
      onChange={onChange}
      value={value}
    >
      {children}
    </BaseCheckbox>
  );
};

CoreCheckbox.Group = BaseCheckboxGroup;

export { CoreCheckbox };
