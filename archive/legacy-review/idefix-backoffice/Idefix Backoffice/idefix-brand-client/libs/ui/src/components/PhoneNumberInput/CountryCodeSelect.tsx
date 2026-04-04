import React, { FC, SelectHTMLAttributes } from "react";
import { DropDownIcon } from "@brandserver-client/icons";
import styled from "styled-components";

const StyledCountryCodeSelect = styled.div`
  select {
    padding: 4px 26px 4px 7px;
    cursor: pointer;
    border-radius: ${({ theme }) => theme.shape.borderRadiusSmall};

    /* 4D === opacity 0.3 */
    background: ${({ theme }) => theme.palette.secondary}4D;

    border: none;
    outline: none;
    appearance: none;

    ${({ theme }) => theme.typography.text16};

    &:focus,
    &:hover {
      background: ${({ theme }) => theme.palette.secondary}CC; // 0.8 opacity
    }
  }

  /* Remove IE 11 arrow */
  select::-ms-expand {
    display: none;
  }

  .country-code-select__icon {
    position: absolute;
    right: 8px;
    top: 50%;
    width: 18px;
    height: 18px;
    transform: translateY(-50%);
    fill: ${({ theme }) => theme.palette.primary};
    pointer-events: none;
  }
`;

const CountryCodeSelect: FC<SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  ...selectProps
}) => {
  return (
    <StyledCountryCodeSelect className={className}>
      <select className="country-code-select__select" {...selectProps} />
      <DropDownIcon className="country-code-select__icon" />
    </StyledCountryCodeSelect>
  );
};

export { CountryCodeSelect };
