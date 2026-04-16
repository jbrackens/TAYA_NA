import React from "react";
import { BaseCheckbox, BaseCheckboxGroup } from "./index.styled";
import type { CheckboxChangeEvent } from "antd/lib/checkbox";

export type CoreCheckboxtProps = {
  autoFocus?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onChange?: (e: CheckboxChangeEvent) => void;
  value?: string | number | boolean;
  children?: React.ReactNode;
};

const CoreCheckbox: React.FC<CoreCheckboxtProps> & {
  Group: typeof BaseCheckboxGroup;
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
