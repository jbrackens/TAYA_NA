import styled from "styled-components";
import { CoreForm } from "../../ui/form";

export const FormItemWithSmallerMarginBottom: typeof CoreForm.Item = styled(
  CoreForm.Item,
)`
  margin-bottom: 20px;
`;

export const MessageContainer = styled.div`
  color: ${(props) =>
    props.theme.uiComponents.modals.forgotPasswordModal.messageColor};
`;

export const Container = styled.div`
  margin: 0 !important;
  height: 100vh;
  background-color: ${(props) => props.theme.cashier.bodyBackgroundColor};
  text-align: center;
  display: flex;
  justify-content: center;
  padding: ${(props) => 1 * props.theme.baseGutter}px;
  padding-top: ${(props) => 2 * props.theme.baseGutter}px;
  .ant-spin {
    background: transparent;
  }
`;
