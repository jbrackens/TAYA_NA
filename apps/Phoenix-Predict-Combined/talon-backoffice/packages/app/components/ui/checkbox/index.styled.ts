import styled, { css } from "styled-components";
import { Checkbox } from "antd";

const sharedCheckboxStyle = () => css`
  .ant-checkbox {
    top: auto;
  }

  &.ant-checkbox-wrapper,
  .ant-checkbox-group-item {
    align-items: center;
    margin-bottom: ${(props) => 0.5 * props.theme.baseGutter}px;
    & span {
      color: ${(props) => props.theme.globalForm.fontColor};
      font-size: ${(props) => props.theme.baseGutter}px;
    }
    & .ant-checkbox-inner {
      border: solid 1px
        ${(props) => props.theme.uiComponents.checkbox.borderColor} !important;
      color: ${(props) => props.theme.uiComponents.checkbox.color} !important;
      background-color: ${(props) =>
        props.theme.uiComponents.checkbox.backgroundColor} !important;
      &:after {
        border: 2px solid
          ${(props) => props.theme.uiComponents.checkbox.tickColor};
        border-top: 0;
        border-left: 0;
      }
    }

    & .ant-checkbox-input {
      &:hover {
        background-color: red !important;
      }
    }
    & .ant-checkbox-wrapper {
      &:hover {
        & .ant-checkbox-inner {
          background-color: ${(props) =>
            props.theme.uiComponents.checkbox.hoverBackgroudColor} !important;
        }
      }
    }

    & .ant-checkbox-checked {
      & .ant-checkbox-inner {
        background-color: ${(props) =>
          props.theme.uiComponents.checkbox.checkedBackgroundColor} !important;
      }
      &:after {
        border: 1px solid
          ${(props) => props.theme.uiComponents.checkbox.borderColor} !important;
      }
    }
  }
`;

export const BaseCheckbox = styled(Checkbox)`
  ${sharedCheckboxStyle};
`;

export const BaseCheckboxGroup = styled(BaseCheckbox.Group)`
  ${sharedCheckboxStyle};
`;
