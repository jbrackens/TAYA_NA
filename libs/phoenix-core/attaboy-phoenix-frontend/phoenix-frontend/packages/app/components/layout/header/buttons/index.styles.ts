import styled from "styled-components";
import { CoreButton } from "../../../ui/button";

export const HeaderButton = styled(CoreButton)`
  height: ${(props) => `${5 * props.theme.baseGutter}px`};
  width: ${(props) => `${12.1 * props.theme.baseGutter}px`};
  @media (max-width: 1200px) {
    height: ${(props) => `${3.2 * props.theme.baseGutter}px`};
    width: ${(props) => `${6.9 * props.theme.baseGutter}px`};
    font-size: ${(props) => `${1.2 * props.theme.baseGutter}px`};
  }
  @media (max-width: 320px) {
    height: ${(props) => `${2.5 * props.theme.baseGutter}px`};
    width: ${(props) => `${5.2 * props.theme.baseGutter}px`};
    font-size: ${(props) => `${1 * props.theme.baseGutter}px`};
  }
`;

export const LoginButton = styled(HeaderButton)`
  background-color: ${(props) => props.theme.menu.loginButtonBackgroundColor};
  color: ${(props) => props.theme.menu.loginButtonColor} !important;
  margin-right: ${(props) => props.theme.baseGutter}px;
  border: 1px solid ${(props) => props.theme.menu.loginButtonBorderColor};
  & > .ant-btn {
    border: none !important;
  }
  @media (max-width: 1200px) {
    color: ${(props) => props.theme.menu.loginMobileButtonColor} !important;
    background-color: ${(props) =>
      props.theme.menu.loginMobileButtonBacgroundColor};
    border: 1px solid
      ${(props) => props.theme.menu.loginMobileButtonBorderColor};
  }
  &:hover,
  :active,
  :focus {
    background-color: ${(props) =>
      props.theme.menu.loginButtonHoverBackgroundColor};
    border: 1px solid ${(props) => props.theme.menu.loginButtonHoverBorder} !important;
    color: ${(props) => props.theme.menu.loginButtonHoverColor} !important;
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
