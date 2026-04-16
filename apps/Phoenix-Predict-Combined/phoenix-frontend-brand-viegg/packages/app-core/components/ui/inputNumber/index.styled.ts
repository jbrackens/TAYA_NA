import { InputNumber } from "antd";
import styled from "styled-components";

export const BaseInputNumber = styled(InputNumber)`
  &.ant-input-number {
    color: ${(props) => props.theme.uiComponents.input.fontColor};
    background-color: ${(props) =>
      props.theme.uiComponents.input.backgroundColor};
    border-radius: 5px;
    border: 1px solid ${(props) => props.theme.uiComponents.input.borderColor};
    box-shadow: none;

    &:hover,
    &:active,
    &:focus,
    &:focus-visible {
      background-color: ${(props) =>
        props.theme.uiComponents.input.backgroundHoverColor};
      border: 1px solid
        ${(props) => props.theme.uiComponents.input.borderHoverColor};
    }
  }
`;
