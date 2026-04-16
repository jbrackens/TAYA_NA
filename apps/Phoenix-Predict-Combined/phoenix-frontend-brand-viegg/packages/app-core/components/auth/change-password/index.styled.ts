import styled from "styled-components";
import { Typography } from "antd";
import { CoreButton } from "../../ui/button";
import { CoreAlert } from "../../ui/alert";

export const Container = styled.div`
  background-color: ${(props) =>
    props.theme.content.changePassword.backgroundColor};
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px;
`;

export const StyledTitle = styled(Typography.Title)`
  color: ${(props) => props.theme.globalForm.titleColor} !important;
  margin-left: ${(props) => 3 * props.theme.baseGutter}px;
`;

export const StyledButton = styled(CoreButton)`
  height: ${(props) => 5 * props.theme.baseGutter}px;
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const StyledAlert = styled(CoreAlert)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;
