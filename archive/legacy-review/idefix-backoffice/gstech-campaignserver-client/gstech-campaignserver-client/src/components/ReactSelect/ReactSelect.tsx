import * as React from "react";
import styled from "styled-components";
import cn from "classnames";
import Select, { components, MultiValueRemoveProps, StylesConfig, Props, PropsValue } from "react-select";
import CreatableSelect from "react-select/creatable";

import { Close } from "../../icons";

const StyledReactSelect = styled.div`
  display: flex;
  align-items: center;

  &.disabled {
    cursor: not-allowed;
  }

  .react-select__input {
    display: flex;
    align-items: center;
  }

  .react-select__placeholder {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }
`;

const StylesForSelect: StylesConfig = {
  container: styles => ({
    width: "100%",
    ...styles
  }),
  placeholder: () => ({
    position: "absolute",
    paddingLeft: "8px",
    color: "rgba(0, 0, 0, 0.32)"
  }),
  control: (_, { isFocused }) => ({
    display: "flex",
    minHeight: "32px",
    minWidth: "200px",
    paddingRight: "8px",
    backgroundColor: "#FFFFFF",
    boxShadow: isFocused ? "0px 1px 3px rgba(0, 0, 0, 0.64)" : "0px 1px 3px rgba(0, 0, 0, 0.24)",
    border: "none",
    borderRadius: "8px",
    overflow: "hidden",
    ":hover": {
      cursor: "text",
      boxShadow: !isFocused ? "0px 2px 5px rgba(0, 0, 0, 0.24)" : undefined
    }
  }),
  input: styles => ({
    ...styles,
    margin: "0",
    padding: "0",
    paddingLeft: "8px"
  }),
  valueContainer: () => ({
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    padding: "2px",
    overflow: "visible"
  }),
  dropdownIndicator: (_, { isFocused }) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fill: isFocused ? "#000000" : "rgba(0, 0, 0, 0.64)",
    width: "20px",
    height: "20px"
  }),
  indicatorSeparator: () => ({
    display: "none"
  }),
  singleValue: () => ({
    paddingLeft: "8px"
  }),
  multiValue: styles => ({
    ...styles,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 0 0 8px",
    marginRight: "2px",
    borderRadius: "8px",
    backgroundColor: "rgba(0, 150, 136, 0.08)"
  }),
  multiValueLabel: () => ({
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "20px",
    color: "#009688"
  }),
  multiValueRemove: () => ({
    display: "flex",
    alignItems: "center",
    marginLeft: "4px",
    padding: "4px",
    borderRadius: "8px",
    fill: "#009688",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)"
    }
  }),
  menu: styles => ({
    ...styles,
    border: "none",
    borderRadius: "8px",
    boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.32)"
  }),
  option: (styles, { isFocused, isSelected, isDisabled }) => ({
    ...styles,
    height: "32px",
    padding: "6px 12px",
    borderRadius: "4px",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "20px",
    color: isSelected ? "rgba(0, 0, 0, 0.1)" : "#000000",
    cursor: isSelected ? "not-allowed" : isFocused ? "pointer" : "default",
    pointerEvents: isDisabled ? "none" : "auto",
    backgroundColor: isDisabled
      ? "rgba(0, 0, 0, 0.1)"
      : isSelected
      ? "rgba(0, 0, 0, 0.01)"
      : isFocused
      ? "rgba(0, 0, 0, 0.04)"
      : "inherit",
    overflowX: "auto",
    overflowY: "hidden"
  })
};

interface OptionType {
  label: string;
  value: string | number;
}

interface ReactSelectProps extends Props {
  options: OptionType[];
  placeholder: string;
  icon: React.ReactNode;
  isMulti?: boolean;
  value?: PropsValue<OptionType>;
  name?: string;
  creatable?: boolean;
  className?: string;
  disabled?: boolean;
}

const MultiValueRemove = (props: MultiValueRemoveProps) => (
  <components.MultiValueRemove {...props}>
    <Close />
  </components.MultiValueRemove>
);

const ReactSelect: React.FC<ReactSelectProps> = ({ className, icon, creatable = false, disabled, ...props }) => {
  const DropdownIndicator = React.useCallback(
    (props: any) => <components.DropdownIndicator {...props}>{icon}</components.DropdownIndicator>,
    [icon]
  );

  return (
    <StyledReactSelect className={cn(className, { disabled })}>
      {creatable ? (
        <CreatableSelect
          styles={StylesForSelect}
          components={{ MultiValueRemove, DropdownIndicator }}
          isClearable={false}
          isMulti
          isSearchable
          isDisabled={disabled}
          {...props}
        />
      ) : (
        <Select
          styles={StylesForSelect}
          components={{ MultiValueRemove, DropdownIndicator }}
          isClearable={false}
          isSearchable
          isDisabled={disabled}
          {...props}
        />
      )}
    </StyledReactSelect>
  );
};

export default React.memo(ReactSelect);
