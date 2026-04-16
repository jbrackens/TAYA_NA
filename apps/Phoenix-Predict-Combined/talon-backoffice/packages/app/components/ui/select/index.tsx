import { LabeledValue, SelectValue } from "antd/lib/select";
import type { CustomTagProps, LabelValueType } from "rc-select/lib/interface/generator";
import type { OptionData } from "rc-select/lib/interface";
import React, { CSSProperties, ReactNode, useContext } from "react";
import { ThemeContext } from "styled-components";
import { BaseSelect, StyledOptionContent } from "./index.styled";

type CoreSelectProps = {
  className?: string;
  allowClear?: boolean;
  autoClearSearchValue?: boolean;
  autoFocus?: boolean;
  bordered?: boolean;
  clearIcon?: ReactNode;
  defaultActiveFirstOption?: boolean;
  defaultOpen?: boolean;
  defaultValue?:
    | string
    | string[]
    | number
    | number[]
    | LabeledValue
    | LabeledValue[];
  disabled?: boolean;
  dropdownClassName?: string;
  dropdownMatchSelectWidth?: boolean | number;
  dropdownRender?: (menu: React.ReactElement) => React.ReactElement;
  dropdownStyle?: React.CSSProperties;
  filterOption?: boolean | ((inputValue: string, option?: OptionData) => boolean);
  filterSort?: (optionA: OptionData, optionB: OptionData) => number;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  labelInValue?: boolean;
  listHeight?: number;
  loading?: boolean;
  maxTagCount?: number;
  maxTagPlaceholder?: ReactNode | ((omittedValues: LabelValueType[]) => ReactNode);
  maxTagTextLength?: number;
  mode?: "multiple" | "tags";
  notFoundContent?: ReactNode;
  optionFilterProp?: string;
  optionLabelProp?: string;
  options?: { label: React.ReactNode; value: string | number }[];
  placeholder?: ReactNode;
  removeIcon?: ReactNode;
  searchValue?: string;
  showArrow?: boolean;
  showSearch?: boolean;
  size?: "large" | "middle" | "small";
  suffixIcon?: ReactNode;
  tagRender?: (props: CustomTagProps) => React.ReactElement;
  tokenSeparators?: string[];
  value?: string | string[] | number | number[] | LabeledValue | LabeledValue[];
  virtual?: boolean;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  onChange?: (value: SelectValue, option: OptionData | OptionData[]) => void;
  onClear?: () => void;
  onDeselect?: (value: string | number | LabeledValue, option: OptionData) => void;
  onDropdownVisibleChange?: (open: boolean) => void;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onInputKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onPopupScroll?: React.UIEventHandler<HTMLDivElement>;
  onSearch?: (value: string) => void;
  onSelect?: (value: string | number | LabeledValue, option: OptionData) => void;
  style?: CSSProperties;
  children?: React.ReactNode;
};

const CoreSelect: React.FC<CoreSelectProps> & {
  Option: typeof BaseSelect.Option;
  OptionContent: typeof StyledOptionContent;
} = ({
  allowClear,
  autoClearSearchValue,
  autoFocus,
  bordered,
  clearIcon,
  defaultActiveFirstOption,
  defaultOpen,
  defaultValue,
  disabled,
  dropdownClassName,
  dropdownMatchSelectWidth,
  dropdownRender,
  dropdownStyle,
  filterOption,
  filterSort,
  getPopupContainer,
  labelInValue,
  listHeight,
  loading,
  maxTagCount,
  maxTagPlaceholder,
  maxTagTextLength,
  mode,
  notFoundContent,
  optionFilterProp,
  optionLabelProp,
  options,
  placeholder,
  removeIcon,
  searchValue,
  showArrow,
  showSearch,
  size,
  suffixIcon,
  tagRender,
  tokenSeparators,
  value,
  virtual,
  onBlur,
  onChange,
  onClear,
  onDeselect,
  onDropdownVisibleChange,
  onFocus,
  onInputKeyDown,
  onMouseEnter,
  onMouseLeave,
  onPopupScroll,
  onSearch,
  onSelect,
  children,
  style,
  className,
}) => {
  const theme = useContext(ThemeContext);
  const menuItemSelectedIcon = theme.uiComponents.select.activeIcon;

  return (
    <BaseSelect
      allowClear={allowClear}
      autoClearSearchValue={autoClearSearchValue}
      autoFocus={autoFocus}
      bordered={bordered}
      clearIcon={clearIcon}
      defaultActiveFirstOption={defaultActiveFirstOption}
      defaultOpen={defaultOpen}
      defaultValue={defaultValue}
      disabled={disabled}
      dropdownClassName={dropdownClassName}
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      dropdownRender={dropdownRender}
      dropdownStyle={dropdownStyle}
      filterOption={filterOption}
      filterSort={filterSort}
      getPopupContainer={getPopupContainer}
      labelInValue={labelInValue}
      listHeight={listHeight}
      loading={loading}
      maxTagCount={maxTagCount}
      maxTagPlaceholder={maxTagPlaceholder}
      maxTagTextLength={maxTagTextLength}
      menuItemSelectedIcon={<img src={menuItemSelectedIcon} />}
      mode={mode}
      notFoundContent={notFoundContent}
      optionFilterProp={optionFilterProp}
      optionLabelProp={optionLabelProp}
      options={options}
      placeholder={placeholder}
      removeIcon={removeIcon}
      searchValue={searchValue}
      showArrow={showArrow}
      showSearch={showSearch}
      size={size}
      suffixIcon={suffixIcon}
      tagRender={tagRender}
      tokenSeparators={tokenSeparators}
      value={value}
      virtual={virtual}
      onBlur={onBlur}
      onChange={onChange}
      onClear={onClear}
      onDeselect={onDeselect}
      onDropdownVisibleChange={onDropdownVisibleChange}
      onFocus={onFocus}
      onInputKeyDown={onInputKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPopupScroll={onPopupScroll}
      onSearch={onSearch}
      onSelect={onSelect}
      style={style}
      className={className}
    >
      {children}
    </BaseSelect>
  );
};

CoreSelect.Option = BaseSelect.Option;
CoreSelect.OptionContent = StyledOptionContent;

export { CoreSelect };
