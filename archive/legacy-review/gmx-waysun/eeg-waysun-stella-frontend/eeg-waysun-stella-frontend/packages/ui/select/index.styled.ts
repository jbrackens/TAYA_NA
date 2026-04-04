import styled from "styled-components";
import { Button, ScrollbarStyle } from "./..";

type SelectWrapperProps = {
  $fullWidth: boolean;
  compact?: boolean;
};

export const SelectWrapper = styled.div<SelectWrapperProps>`
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  display: ${(props) => (props.$fullWidth ? "block" : "inline-block")};
  position: relative;
  ${(props) =>
    props.compact && {
      display: "inline-block",
    }};
`;

export const NonSearchSelectContainer = styled.div`
  padding: 5px 0;
`;

type SelectHeaderProps = {
  disabled?: boolean;
  compact?: boolean;
};

export const SelectHeader = styled.button<SelectHeaderProps>`
  text-align: left;
  width: ${(props) => (props.compact ? "auto" : "100%")};
  min-height: 44px;
  min-width: ${(props) => (props.compact ? "auto" : "140px")};
  display: flex;
  align-items: center;
  padding: ${(props) => (props.compact ? "5px" : "11px 17px")};
  background-color: ${(props) => props.theme.uiComponents.select.backColor};
  color: ${(props) => props.theme.uiComponents.select.fontColor};
  border: none;
  font: inherit;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  outline: inherit;
  border-radius: 7px;
  box-shadow: 0px 4px 4px rgba(16, 16, 16, 0.25),
    inset 0px 1px 0px rgba(63, 63, 63, 0.25);
  span {
    flex-grow: 1;
  }
  &:hover {
    outline: ${(props) =>
      props.disabled
        ? "none"
        : `1px solid ${props.theme.uiComponents.general.hoverBorderColor}`};
  }
`;

type HeaderSpanProps = {
  $loading?: boolean;
};
export const HeaderSpan = styled.span<HeaderSpanProps>`
  margin-right: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${(props) =>
    props.$loading && {
      visibility: "hidden",
    }}
`;

export const Arrow = styled.div`
  span {
    flex-grow: 0;
  }
`;

type DropdownOptionsProps = {
  $dropdownPosition?: string;
  compact?: boolean;
  highlight?: boolean;
  $optionFullWidth?: boolean;
};
const topOpenStyle = {
  bottom: "50px",
};
export const DropdownOptions = styled.div<DropdownOptionsProps>`
  background-color: ${(props) => props.theme.uiComponents.select.backColor};
  padding: 5px 0;
  position: absolute;
  min-width: 100%;
  ${(props) => !props.$optionFullWidth && { width: "100%" }};
  border: 1px solid ${(props) => props.theme.uiComponents.select.hoverColor};
  border-radius: 5px;
  z-index: 5;
  max-height: 160px;
  ${ScrollbarStyle}
  ${(props) => props.$dropdownPosition === "top" && topOpenStyle};
`;

export const DropdownButton = styled.button<DropdownOptionsProps>`
  background-color: ${(props) =>
    props.highlight
      ? props.theme.uiComponents.select.keyDown
      : props.theme.uiComponents.select.backColor};
  width: 100%;
  color: ${(props) => props.theme.uiComponents.select.fontColor};
  border: none;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  padding: ${(props) => (props.compact ? "3px 8px" : "10px")};
  box-sizing: border-box;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  &:hover {
    background-color: ${(props) =>
      props.highlight
        ? props.theme.uiComponents.select.keyDown
        : props.theme.uiComponents.select.hoverColor};
  }
`;

export const DropdownEmpty = styled.div`
  background-color: ${(props) => props.theme.uiComponents.select.backColor};
  width: 100%;
  color: grey;
  border: none;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  padding: 10px;
  box-sizing: border-box;
  text-align: center;
`;

export const SelectLabel = styled.label`
  padding-left: 2px;
  display: block;
  font-size: 14px;
  color: ${(props) => props.theme.uiComponents.select.label};
  margin-bottom: 8px;
`;

type ErrorProps = {
  $show: boolean;
};

export const SelectError = styled.div<ErrorProps>`
  z-index: 2;
  position: absolute;
  padding-left: 2px;
  visibility: ${(props) => (props.$show ? "initial" : "hidden")};
  color: ${(props) => props.theme.uiComponents.input.errorColor};
  font-size: 11px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 2.18;
  letter-spacing: normal;
  min-height: 25px;
`;

export const LoaderDiv = styled.div`
  position: absolute;
  width: 50%;
`;

export const ClearInputButton = styled(Button)`
  position: absolute;
  top: 50%;
  right: 30px;
  transform: translate(0%, -50%);
  padding: 0;
  font-size: 12px;
`;
