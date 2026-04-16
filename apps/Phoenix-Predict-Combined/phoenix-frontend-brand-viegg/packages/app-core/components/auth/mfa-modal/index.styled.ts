import styled from "styled-components";
import { Row } from "antd";
import { CoreButton } from "../../ui/button";
import { CoreForm } from "../../ui/form";

export const FormItemWithSmallerMarginBottom: typeof CoreForm.Item = styled(
  CoreForm.Item,
)`
  margin-bottom: 20px;
`;

export const ForgotPasswordButton = styled(CoreButton)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const ButtonMarginTop = styled(CoreButton)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const ErrorRow = styled(Row)`
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
`;

export const CancelButton = styled(CoreButton)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const MessageContainer = styled.div`
  text-align: center;
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.uiComponents.modals.paragraphColor};
`;
