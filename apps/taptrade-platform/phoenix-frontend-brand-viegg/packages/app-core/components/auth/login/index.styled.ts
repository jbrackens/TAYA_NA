import { Row } from "antd";
import styled from "styled-components";
import { CoreButton } from "../../ui/button";

export const RememberMeLabel = styled.label`
  padding-left: ${(props) => 0.7 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.globalForm.fontColor};
`;

export const ResetPasswordLink = styled.p`
  color: ${(props) => props.theme.globalForm.alertLinkColor};
  cursor: pointer;
  margin-bottom: 0;
`;

export const LoginButton = styled(CoreButton)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const RememberMeContainer = styled.div`
  display: flex;
  align-items: center;

  a {
    margin-left: auto;
  }
`;

export const ErrorRow = styled(Row)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;
