import styled from "styled-components";
type PassCheckedProps = {
  $checked?: boolean;
  $disabled?: boolean;
};

export const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
`;
export const Togglelabel = styled.label<PassCheckedProps>`
  color: ${(props) =>
    props.$checked && !props.$disabled
      ? props.theme.uiComponents.toggle.colorChecked
      : props.theme.uiComponents.toggle.colorUnchecked};
  padding-right: 10px;
  font-family: inherit;
  font-size: 14px;
`;
export const ToggleSwitch = styled.div`
  position: relative;
  margin-right: 10px;
  width: 50px;
  min-width: 50px;
  display: inline-block;
  vertical-align: middle;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  text-align: left;
`;
export const ToggleSwitchCheckbox = styled.input`
  display: none;
`;

export const ToggleSwitchWrap = styled.div<PassCheckedProps>`
  display: block;
  overflow: hidden;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  border: 0;
  border-radius: 20px;
  margin: 0;
  &:hover {
    outline: ${(props) =>
      props.$disabled
        ? "0px"
        : `1px solid ${props.theme.uiComponents.general.hoverBorderColor}`};
  }
`;

const toggleRight = {
  right: 0,
};
export const ToggleSwitchInner = styled.span<PassCheckedProps>`
  display: block;
  width: 200%;
  margin-left: -100%;
  transition: margin 0.2s ease-in 0s;
  &:before,
  &:after {
    display: block;
    float: left;
    width: 50%;
    height: 25px;
    padding: 0;
    box-sizing: border-box;
  }
  &:before {
    content: attr(data-yes);
    text-transform: uppercase;
    padding-left: 10px;
  }
  :after {
    content: attr(data-no);
    text-transform: uppercase;
    padding-right: 10px;
    background-color: ${(props) =>
      props.$checked
        ? props.theme.uiComponents.toggle.colorChecked
        : props.theme.uiComponents.toggle.colorUnchecked};
    text-align: right;
  }
`;
export const ToggleSwitchSwitch = styled.span<PassCheckedProps>`
  display: block;
  margin: 2px;
  width: 22px;
  background: ${(props) =>
    props.$disabled
      ? props.theme.uiComponents.toggle.disabled
      : props.theme.uiComponents.toggle.switchColor};
  position: absolute;
  top: 0;
  bottom: 0;
  right: 24px;
  border: 0;
  border-radius: 20px;
  transition: all 0.2s ease-in 0s;
  ${(props) => props.$checked && toggleRight};
`;
