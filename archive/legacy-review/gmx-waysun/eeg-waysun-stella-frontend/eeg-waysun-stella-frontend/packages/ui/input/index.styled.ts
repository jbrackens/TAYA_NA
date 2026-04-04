import styled from "styled-components";
import { Button } from "./..";

type StyledInputProps = {
  $fullWidth?: boolean;
  $icon?: boolean;
  $clear?: boolean;
  $iconBackground?: boolean;
};
export const StyledInput = styled.input<StyledInputProps>`
  box-sizing: border-box;
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  padding: ${(props) =>
    props.$icon
      ? props.$clear
        ? "10px 60px 10px 15px"
        : "10px 30px 10px 15px"
      : props.$clear
      ? "10px 35px 10px 15px"
      : "10px 15px"};
  ${(props) =>
    props.$iconBackground && {
      "padding-right": "80px",
    }};
  border-radius: 7px;
  font-size: 17px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.41;
  letter-spacing: normal;
  background-color: ${(props) =>
    props.$iconBackground
      ? props.theme.uiComponents.input.darkBackground
      : props.theme.uiComponents.input.background};
  border: 1px solid ${(props) => props.theme.uiComponents.input.background};
  color: ${(props) => props.theme.uiComponents.input.fontColor};
  box-shadow: 0px 1px 0px rgba(50, 50, 50, 0.25),
    inset 0px 2px 1px rgba(0, 0, 0, 0.25);
  &:hover {
    ${(props) =>
      !props.disabled && {
        outline: `1px solid ${props.theme.uiComponents.general.hoverBorderColor}`,
      }};
  }
  &:focus {
    outline: 2px solid
      ${(props) => props.theme.uiComponents.general.hoverBorderColor};
  }
  &:disabled {
    cursor: not-allowed;
  }
`;

export const InputWrapper = styled.div`
  position: relative;
  padding: 5px 0;
  display: block;
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

type DivProps = {
  $fullWidth: boolean;
};
export const InputFieldDiv = styled.div<DivProps>`
  position: relative;
  display: ${(props) => (props.$fullWidth ? "block" : "inline-block")};
`;

export const InputLabel = styled.label`
  display: block;
  font-size: 14px;
  color: ${(props) => props.theme.uiComponents.input.labelColor};
  margin-bottom: 8px;
`;

type ErrorProps = {
  $show: boolean;
};
export const InputError = styled.div<ErrorProps>`
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

type ClearInputButtonProps = {
  $icon?: boolean;
  $iconBackground?: boolean;
};
export const ClearInputButton = styled(Button)<ClearInputButtonProps>`
  z-index: 1;
  position: absolute;
  top: 50%;
  right: ${(props) => (props.$icon ? "25px" : "10px")};
  ${(props) =>
    props.$iconBackground && {
      right: "50px",
    }};
  transform: translate(0%, -50%);
  padding: 0;
  color: ${(props) => props.theme.uiComponents.input.labelColor};
  font-size: 12px;
`;

type IconDivProps = {
  $iconBackground: boolean;
};
export const IconDiv = styled.div<IconDivProps>`
  position: absolute;
  top: 50%;
  right: 0;
  transform: translate(0%, -50%);
  color: ${(props) => props.theme.uiComponents.input.labelColor};
  height: 100%;
  width: ${(props) => (props.$iconBackground ? "45px" : "35px")};
  background-color: ${(props) =>
    props.$iconBackground
      ? props.theme.uiComponents.input.iconBackground
      : "unset"};
  border-top-right-radius: 7px;
  border-bottom-right-radius: 7px;
  span {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

export const LoaderDiv = styled.div`
  width: 50%;
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translate(0%, -50%);
`;
