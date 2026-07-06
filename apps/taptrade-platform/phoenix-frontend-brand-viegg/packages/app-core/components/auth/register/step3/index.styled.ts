import { Row } from "antd";
import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  justify-content: center;
  flex-flow: column;
  place-items: center;

  div {
    display: flex !important;
    text-align: center;
  }
`;

export const MessageContainer = styled.div`
  margin-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.uiComponents.modals.paragraphColor};
`;

export const StyledLink = styled.a`
  color: ${(props) => props.theme.globalForm.linkColor};
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  &:hover {
    color: ${(props) => props.theme.globalForm.linkHoverColor};
  }
`;

export const ErrorContainer = styled(Row)`
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
`;
