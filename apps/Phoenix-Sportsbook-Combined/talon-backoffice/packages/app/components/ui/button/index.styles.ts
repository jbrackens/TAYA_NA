import styled, { DefaultTheme } from "styled-components";
import { Button } from "antd";

const extractButtonsTheme = (props: { theme: DefaultTheme }) =>
  props.theme.uiComponents.buttons || {};

export const BaseButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px !important;
  border: none;

  /* primary button style */
  &.ant-btn-primary {
    background-color: ${(props) =>
      extractButtonsTheme(props).primary.backgroundColor};
    border: ${(props) => extractButtonsTheme(props).primary.borderColor};
    color: ${(props) => extractButtonsTheme(props).primary.fontColor};

    &:active,
    :focus,
    :hover {
      background-color: ${(props) =>
        extractButtonsTheme(props).primary.hoverBackgroundColor};
      border: ${(props) => extractButtonsTheme(props).primary.hoverBorderColor};
      color: ${(props) => extractButtonsTheme(props).primary.hoverFontColor};
    }

    &:disabled {
      background-color: ${(props) =>
        extractButtonsTheme(props).primary.disabledBackgroundColor};
      border: ${(props) =>
        extractButtonsTheme(props).primary.disabledBorderColor};
      color: ${(props) => extractButtonsTheme(props).primary.disbaledFontColor};
    }
  }

  /* default button style */
  &.ant-btn-default {
    background-color: ${(props) =>
      extractButtonsTheme(props).default.backgroundColor};
    border: ${(props) => extractButtonsTheme(props).default.borderColor};
    color: ${(props) => extractButtonsTheme(props).default.fontColor};

    &:active,
    :focus,
    :hover {
      background-color: ${(props) =>
        extractButtonsTheme(props).default.hoverBackgroundColor};
      border: ${(props) => extractButtonsTheme(props).default.hoverBorderColor};
      color: ${(props) => extractButtonsTheme(props).default.hoverFontColor};
    }

    &:disabled {
      background-color: ${(props) =>
        extractButtonsTheme(props).default.disabledBackgroundColor};
      border: ${(props) =>
        extractButtonsTheme(props).default.disabledBorderColor};
      color: ${(props) => extractButtonsTheme(props).default.disbaledFontColor};
    }
  }

  /* danger button style */
  &.ant-btn-dangerous {
    background-color: ${(props) =>
      extractButtonsTheme(props).danger.backgroundColor};
    border: ${(props) => extractButtonsTheme(props).danger.borderColor};
    color: ${(props) => extractButtonsTheme(props).danger.fontColor};

    &:active,
    :focus,
    :hover {
      background-color: ${(props) =>
        extractButtonsTheme(props).danger.hoverBackgroundColor};
      border: ${(props) => extractButtonsTheme(props).danger.hoverBorderColor};
      color: ${(props) => extractButtonsTheme(props).danger.hoverFontColor};
    }

    &:disabled {
      background-color: ${(props) =>
        extractButtonsTheme(props).danger.disabledBackgroundColor};
      border: ${(props) =>
        extractButtonsTheme(props).danger.disabledBorderColor};
      color: ${(props) => extractButtonsTheme(props).danger.disbaledFontColor};
    }
  }
`;
