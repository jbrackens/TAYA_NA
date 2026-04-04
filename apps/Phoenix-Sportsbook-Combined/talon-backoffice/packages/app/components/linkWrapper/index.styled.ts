import styled from "styled-components";

export const AnchorWithNoDefaultStyle = styled.a`
  &,
  :hover {
    all: unset;
  }
`;
