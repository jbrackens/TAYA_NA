import styled from "styled-components";
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
