import styled from "styled-components";
import { RadioType, RadioTypeEnum } from ".";

type ContainerProps = {
  layout?: RadioType;
  disabled?: boolean;
};

export const RadioButton = styled.div<RadioButtonProps>`
  position: relative;
  padding: 12px;
  color: ${(props) => props.theme.uiComponents.radio.font};
  background-color: ${(props) => props.theme.uiComponents.radio.background};
  border: 1px solid
    ${(props) =>
      props.selected
        ? props.theme.uiComponents.radio.selectedColor
        : props.theme.uiComponents.radio.border};
  border-radius: 7px;
  &,
  * {
    cursor: pointer;
  }

  input {
    visibility: hidden;
    position: absolute;
  }
  input + label:before {
    height: 12px;
    width: 12px;
    content: " ";
    display: inline-block;
    vertical-align: baseline;
    box-shadow: 0px 0px 0px 1.5px
      ${(props) => props.theme.uiComponents.radio.font};
    border: 2px solid ${(props) => props.theme.uiComponents.radio.background};
    border-radius: 50%;
    margin-right: 10px;
  }
  input:checked + label:before {
    background: ${(props) => props.theme.uiComponents.radio.selectedColor};
    box-shadow: 0px 0px 0px 1.5px
      ${(props) => props.theme.uiComponents.radio.selectedColor};
  }
  label {
    font-size: 14px;
  }
`;

export const Container = styled.div<ContainerProps>`
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  > * {
    opacity: ${(props) => (props.disabled ? "0.6" : "1")};
    pointer-events: ${(props) => (props.disabled ? "none" : "all")};
  }
  display: flex;
  flex-flow: ${(props) =>
    props.layout === RadioTypeEnum.HORIZONTAL ? "row" : "column"};
  ${RadioButton} {
    margin: ${(props) =>
      props.layout === RadioTypeEnum.HORIZONTAL ? "0 12px 0 0 " : "0 0 12px 0"};
  }
`;

type RadioButtonProps = {
  selected?: boolean;
};

export const Label = styled.div`
  color: ${(props) => props.theme.uiComponents.radio.labelColor};
  margin-bottom: 7px;
  font-size: 14px;
`;

export const LoadingDiv = styled.div`
  position: absolute;
  width: 50%;
  top: 50%;
  transform: translate(0%, -50%);
`;

type InputLabelProps = {
  $loading?: boolean;
};
export const InputLabel = styled.label<InputLabelProps>`
  visibility: ${(props) => (props.$loading ? "hidden" : "initial")};
`;

type ErrorProps = {
  $show: boolean;
};
export const RadioError = styled.div<ErrorProps>`
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
