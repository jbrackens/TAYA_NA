import styled from "styled-components";
import { ScrollbarStyleExtraRight } from "ui";

export const Content = styled.div`
  background-color: ${(props) => props.theme.content.background};
  ${ScrollbarStyleExtraRight}
  height: 100%;
`;
