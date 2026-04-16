import { LabeledValue } from "antd/lib/select";
import React, { CSSProperties, ReactNode, useContext } from "react";
import { StyledComponent, ThemeContext } from "styled-components";
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
  dropdownStyle?: any;
  filterOption?: any;
  filterSort?: (optionA: any, optionB: any) => number;
  getPopupContainer?: (triggerNode: any) => any;
  labelInValue?: boolean;
  listHeight?: number;
  loading?: boolean;
  maxTagCount?: number;
  maxTagPlaceholder?: ReactNode | ((omittedValues: any) => any);
  maxTagTextLength?: number;
  mode?: "multiple" | "tags";
  notFoundContent?: ReactNode;
  optionFilterProp?: string;
  optionLabelProp?: string;
  options?: { label: any; value: any }[];
  placeholder?: ReactNode;
  removeIcon?: ReactNode;
  searchValue?: string;
  showArrow?: boolean;
  showSearch?: boolean;
  size?: "large" | "middle" | "small";
  suffixIcon?: any;
  tagRender?: (props: any) => React.ReactElement;
  tokenSeparators?: string[];
  value?: string | string[] | number | number[] | LabeledValue | LabeledValue[];
  virtual?: boolean;
  onBlur?: any;
  onChange?: (value: any, option: any | Array<any>) => void;
  onClear?: any;
  onDeselect?: (value: any, option: any) => void;
  onDropdownVisibleChange?: (open: boolean) => void;
  onFocus?: any;
  onInputKeyDown?: any;
  onMouseEnter?: any;
  onMouseLeave?: any;
  onPopupScroll?: any;
  onSearch?: (value: string) => void;
  onSelect?: (value: any, option: any) => void;
  style?: CSSProperties;
};

const CoreSelect: React.FC<CoreSelectProps> & {
  Option: any;
  OptionContent: StyledComponent<"div", any, {}, never>;
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
