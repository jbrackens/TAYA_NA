import styled from "styled-components";

export const TimeWrapper = styled.div`
  width: auto;
`;

export const TimePickerContainer = styled.div`
  z-index: 2;
  position: absolute;
  background-color: ${(props) =>
    props.theme.uiComponents.datePicker.containerBackground};
  color: white;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  max-height: 250px;
  border-radius: 5px;
  z-index: 5;
`;

export const Selectors = styled.div`
  display: flex;
  overflow: hidden;
`;

export const SelectoButtonsContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: scroll;
  border-right: 0.5px solid
    ${(props) => props.theme.uiComponents.datePicker.borderColor};
  border-left: 0.5px solid
    ${(props) => props.theme.uiComponents.datePicker.borderColor};
  &:first-child {
    border-left: 0;
  }
  &:last-child {
    border-right: 0;
  }
`;

type ButtonProps = {
  $selected?: boolean;
};
export const SelectoButtons = styled.button<ButtonProps>`
  background: ${(props) =>
    props.$selected
      ? props.theme.uiComponents.datePicker.selectedColor
      : "none"};
  color: ${(props) => props.theme.uiComponents.datePicker.fontColor};
  border: none;
  padding: 5px 10px;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  min-width: 30px;
  text-align: left;
  &:hover {
    background: ${(props) =>
      props.$selected
        ? props.theme.uiComponents.datePicker.selectedColor
        : props.theme.uiComponents.datePicker.hoverColor};
  }
`;

export const Footer = styled.div`
  border-top: 0.5px solid
    ${(props) => props.theme.uiComponents.datePicker.borderColor};
  padding: 10px;
  display: flex;
  align-items: center;
  div {
    flex-grow: 1;
    &:last-child {
      text-align: right;
    }
  }
  button {
    padding: 1px 7px;
    border-radius: 3px;
  }
  a {
    color: ${(props) => props.theme.uiComponents.datePicker.selectedColor};
  }
`;
