import styled from "styled-components";
import { StyledError } from "../input-error/index.styled";

type InputProps = {
  errorMode?: boolean;
};

export const BaseInput = styled.input<InputProps>`
  min-height: ${(props) => 5 * props.theme.baseGutter}px;
  width: 100%;
  padding: ${(props) => 0.5 * props.theme.baseGutter}px
    ${(props) =>
      props.type === "password"
        ? 5 * props.theme.baseGutter
        : 1 * props.theme.baseGutter}px
    ${(props) => 0.5 * props.theme.baseGutter}px
    ${(props) => 1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.uiComponents.input.fontColor};
  background-color: ${(props) =>
    props.theme.uiComponents.input.backgroundColor};
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.uiComponents.input.borderColor};

  &:hover,
  &:active,
  &:focus,
  &:focus-visible {
    outline: none;
    outline-color: transparent;
    background-color: ${(props) =>
      props.theme.uiComponents.input.backgroundHoverColor};
    border: 1px solid
      ${(props) => props.theme.uiComponents.input.borderHoverColor};
    -webkit-box-shadow: 0 0 0 30px
      ${(props) => props.theme.uiComponents.input.backgroundHoverColor} inset;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    caret-color: ${(props) => props.theme.uiComponents.input.fontColor};
  }

  ${(props) =>
    props.errorMode &&
    `
   background-color: ${props.theme.uiComponents.input.errorBackgroundColor};
      color: ${props.theme.globalForm.inputErrorColor};
      border: 1px solid
        ${props.theme.uiComponents.input.errorBorderColor};
        &:hover,
        &:active,
        &:focus,
        &:focus-visible {
          background-color: ${props.theme.uiComponents.input.errorBackgroundColor} !important;
          border: 1px solid
            ${props.theme.uiComponents.input.errorBorderColor};
        }
  `}

  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px
      ${(props) => props.theme.uiComponents.input.backgroundColor} inset !important;
    -webkit-text-fill-color: ${(props) =>
      props.theme.uiComponents.input.fontColor} !important;
    background-color: ${(props) =>
        props.theme.uiComponents.input.errorBackgroundColor}
      inset !important;
  }
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px
      ${(props) => props.theme.uiComponents.input.backgroundHoverColor} inset !important;
    -webkit-text-fill-color: ${(props) =>
      props.theme.uiComponents.input.fontColor} !important;
  }
`;

export const InputBox = styled.div`
  position: relative;
`;

type InputContainerProps = {
  spaceUnder: boolean;
};

export const InputContainer = styled.div<InputContainerProps>`
  position: relative;

  label {
    display: inline-block;
    color: ${(props) => props.theme.globalForm.fontColor};
    margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  }

  .anticon {
    position: absolute;
    right: ${(props) => 2.5 * props.theme.baseGutter}px;
    top: 50%;
    color: ${(props) => props.theme.uiComponents.input.fontColor};
    opacity: 0.5;
    transform: translate(0, -50%);
  }

  margin-bottom: ${(props) =>
    props.spaceUnder ? 1 * props.theme.baseGutter : 0}px;

  ${StyledError} {
    margin-top: ${(props) => 0.5 * props.theme.baseGutter}px;
  }
`;

export const BasePasswordInput = styled.input`
  min-height: ${(props) => 5 * props.theme.baseGutter}px;
  width: 100%;
  padding: ${(props) => 0.5 * props.theme.baseGutter}px
    ${(props) => 1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.uiComponents.input.fontColor};
  background-color: ${(props) =>
    props.theme.uiComponents.input.backgroundColor};
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.uiComponents.input.borderColor};

  &:hover,
  &:active,
  &:focus,
  &:focus-visible {
    outline: none;
    outline-color: transparent;
    background-color: ${(props) =>
      props.theme.uiComponents.input.backgroundHoverColor};
    border: 1px solid
      ${(props) => props.theme.uiComponents.input.borderHoverColor};
    -webkit-box-shadow: 0 0 0 30px
      ${(props) => props.theme.uiComponents.input.backgroundHoverColor} inset;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    caret-color: ${(props) => props.theme.uiComponents.input.fontColor};
  }
`;
