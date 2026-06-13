import styled from "styled-components";

export const SpanPaddingTop = styled.span`
  padding-top: ${(props) => props.theme.baseGutter}px;
`;

export const ErrorContainer = styled.div`
  margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
`;
