import styled from "styled-components";
import { Button } from "./..";

const componentVariables = {
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  DEFAULT_LENGTH: "500px",
  BORDER_COLOR: "#d9d9d9",
  LIST_SELECTED_COLOR: "#e6f7ff",
  LIST_SELECTED_HOVER_COLOR: "#dcf4ff",
  COMMON_HOVER_DISABLED: "#f5f5f5",
  COMMON_DARK_HOVER_DISABLED: "#d6d6d6",
  BUTTON_COLOR: "#1890ff",
  BUTTON_HOVER_COLOR: "#40a9ff",
};

type StyledTransferProps = {
  $fullWidth: boolean;
};
export const StyledTransfer = styled.div<StyledTransferProps>`
  padding: 20px 15px;
  display: flex;
  background-color: ${(props) => props.theme.uiComponents.transfer.background};
  max-width: ${(props) =>
    props.$fullWidth ? "100%" : componentVariables.DEFAULT_LENGTH};
`;

export const CheckboxWrapper = styled.div`
  border: 1px solid ${(props) => props.theme.uiComponents.transfer.border};
  width: 100%;
  border-radius: 2px;
`;

export const CheckboxHeader = styled.div`
  border-bottom: 1px solid
    ${(props) => props.theme.uiComponents.transfer.border};
  padding: 10px;
  display: flex;
  align-items: center;
  svg {
    height: 12px;
    margin-right: 5px;
  }
`;

export const CheckboxContainer = styled.div`
  padding: 0;
  min-width: 200px;
  height: 200px;
  overflow: auto;
`;

type CheckboxOuterProps = {
  $selected: boolean;
};
export const CheckboxOuter = styled.div<CheckboxOuterProps>`
  padding-left: 10px;
`;

export const TransferButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2px;
`;

type TransferBtnsProps = {
  disabled: boolean;
};
export const TransferBtns = styled(Button)<TransferBtnsProps>`
  border-radius: 3px;
  cursor: pointer;
  padding: 6px 10px;
  margin: 10px 20px;
  &:hover {
    border-color: ${(props) =>
      props.disabled
        ? props.theme.uiComponents.transfer.disabledButtonColor
        : props.theme.uiComponents.transfer.activeButtonColor};
    color: ${(props) =>
      props.disabled
        ? props.theme.uiComponents.transfer.disabledButtonColor
        : props.theme.uiComponents.transfer.activeButtonColor};
  }
`;

type DropdownContentProps = {
  $show: boolean;
};
export const DropdownContent = styled.div<DropdownContentProps>`
  padding: 5px 0;
  display: ${(props) => (props.$show ? "block" : "none")};
  position: absolute;
  background-color: ${componentVariables.WHITE};
  min-width: 130px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1;
  button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
    outline: inherit;
    color: black;
    padding: 6px 10px;
    text-decoration: none;
    display: block;
    &:hover {
      background-color: ${componentVariables.COMMON_HOVER_DISABLED};
    }
    &:active {
      background-color: ${componentVariables.COMMON_DARK_HOVER_DISABLED};
    }
  }
`;

export const Dropdown = styled.div`
  position: relative;
  display: inline-block;
`;

export const LoadingDiv = styled.div`
  padding: 20px;
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
