import styled from "styled-components";

type Props = {
  checked?: boolean;
  fullWidth?: boolean;
  $loading?: boolean;
};

export const Input = styled.input<Props>`
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
  ${(props) =>
    props.$loading && {
      visibility: "hidden",
    }}
`;

export const Checkmark = styled.div<Props>`
  position: absolute;
  top: 10px;
  left: 5px;
  height: 15px;
  width: 15px;
  background-color: transparent;
  background-color: ${(props) =>
    props.checked
      ? props.theme.uiComponents.checkbox.selectedColor
      : "transparent"};
  border: 1px solid
    ${(props) =>
      props.checked
        ? props.theme.uiComponents.checkbox.selectedColor
        : props.theme.uiComponents.checkbox.border};
  border-radius: 4px;
  ${(props) =>
    props.$loading && {
      visibility: "hidden",
    }}
`;

export const Tick = styled.span<Props>`
  display: ${(props) => (props.checked ? "initial" : "none")};
  position: absolute;
  left: 20%;
  top: 50%;
  width: 5px;
  height: 8px;
  border: solid
    ${(props) => props.theme.uiComponents.checkbox.checkboxTextColor};
  border-width: 0 2px 2px 0;
  -webkit-transform: rotate(45deg) translate(-50%, -50%);
  -ms-transform: rotate(45deg) translate(-50%, -50%);
  transform: rotate(45deg) translate(-50%, -50%);
`;

export const Label = styled.div<Props>`
  color: ${(props) => props.theme.uiComponents.checkbox.checkboxTextColor};
  align-items: center;
  position: relative;
  padding: 10px 0;
  padding-left: 25px;
  cursor: pointer;
  font-size: 14px;
  line-height: 14px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  &:hover {
    ${Checkmark} {
      border: 1px solid
        ${(props) =>
          props.checked
            ? props.theme.uiComponents.checkbox.selectedColor
            : props.theme.uiComponents.checkbox.hoverColor};
    }
  }
`;

type ContainerProps = {
  disabled?: boolean;
};

export const Container = styled.div<ContainerProps>`
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  > * {
    opacity: ${(props) => (props.disabled ? "0.6" : "1")};
    pointer-events: ${(props) => (props.disabled ? "none" : "all")};
  }
`;

export const LoaderDiv = styled.div`
  width: 100%;
  position: absolute;
`;
