import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  justify-content: center;
  flex-flow: column;
  place-items: center;

  div {
    display: flex !important;
    text-align: center;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input {
    color: ${(props) => props.theme.uiComponents.input.fontColor};
    background-color: ${(props) =>
      props.theme.uiComponents.input.backgroundColor};
    border-radius: 5px;
    border: 1px solid ${(props) => props.theme.uiComponents.input.borderColor};
    margin: ${(props) => 0.5 * props.theme.baseGutter}px;
    height: ${(props) => 5 * props.theme.baseGutter}px;
    width: ${(props) => 5 * props.theme.baseGutter}px;
    font-size: ${(props) => 2.2 * props.theme.baseGutter}px;
    text-align: center;
    margin-right: ${(props) => 1 * props.theme.baseGutter}px !important;

    &:hover,
    &:active,
    &:focus,
    &:focus-visible {
      outline-color: transparent;
      background-color: ${(props) =>
        props.theme.uiComponents.input.backgroundHoverColor};
      border: 1px solid
        ${(props) => props.theme.uiComponents.input.borderHoverColor};
      -webkit-box-shadow: 0 0 0 30px
        ${(props) => props.theme.uiComponents.input.backgroundHoverColor} inset;
    }
  }
`;
