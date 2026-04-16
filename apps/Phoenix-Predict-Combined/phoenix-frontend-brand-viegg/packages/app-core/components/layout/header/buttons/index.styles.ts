import styled from "styled-components";
import { CoreButton } from "../../../ui/button";

export const HeaderButton = styled(CoreButton)`
  height: 36px;
  min-width: 96px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  @media (max-width: 1200px) {
    height: 34px;
    min-width: 86px;
    font-size: 12px;
  }
  @media (max-width: 320px) {
    height: 30px;
    min-width: 72px;
    font-size: 11px;
  }
`;

export const LoginButton = styled(HeaderButton)`
  background: var(--sb-accent-cyan);
  color: #000000 !important;
  margin-right: 0;
  border: 1px solid transparent;
  & > .ant-btn {
    border: none !important;
  }
  @media (max-width: 1200px) {
    color: #000000 !important;
    background: var(--sb-accent-cyan);
    border: 1px solid transparent;
  }
  &:hover,
  :active,
  :focus {
    filter: brightness(1.08);
    background: var(--sb-accent-cyan) !important;
    border: 1px solid transparent !important;
    color: #000000 !important;
  }
`;

export const SignUpButton = styled(HeaderButton)`
  margin-right: ${(props) => `${1.5 * props.theme.baseGutter}px`};
  background-color: ${(props) => props.theme.menu.signUpButtonBackgroundColor};
  border: 1px solid ${(props) => props.theme.menu.signUpButtonBorderColor};
  color: ${(props) => props.theme.menu.signUpMobileButtonColor} !important;
  @media (max-width: 1200px) {
    color: ${(props) => props.theme.menu.signUpMobileButtonColor} !important;
    background-color: ${(props) =>
      props.theme.menu.signUpMobileButtonBacgroundColor};
    border: 1px solid
      ${(props) => props.theme.menu.signUpMobileButtonBorderColor};
  }
  &:hover,
  :active,
  :focus {
    background-color: ${(props) =>
      props.theme.menu.signUpButtonHoverBackgroundColor};
    border: 1px solid transparent;
  }
`;
