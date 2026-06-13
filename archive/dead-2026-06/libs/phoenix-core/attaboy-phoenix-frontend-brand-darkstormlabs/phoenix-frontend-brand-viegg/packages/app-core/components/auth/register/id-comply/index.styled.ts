import styled from "styled-components";
import { Button } from "antd";
import { CoreButton } from "../../../ui/button";

export const AcceptButton = styled(CoreButton)`
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  margin-top: ${(props) => props.theme.baseGutter}px;
`;

export const CancelButton = styled(Button)`
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.uiComponents.modals.registerModal
      .backButtonButtonBackgroundColor};
  border: none;
  color: ${(props) =>
    props.theme.uiComponents.modals.registerModal.backButtonColor};

  &:hover,
  :active,
  :focus {
    background-color: ${(props) =>
      props.theme.uiComponents.modals.registerModal
        .backButtonButtonBackgroundHoverColor};
    color: ${(props) =>
      props.theme.uiComponents.modals.registerModal.backButtonColor};
  }
`;
