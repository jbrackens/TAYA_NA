import styled from "styled-components";

export const Wrapper = styled.div`
  padding: 0 1rem;

  font-size: 0.75rem;
  color: ${(props) => props.theme.menuDefaultColor || "#ffffff"};

  cursor: default;
`;
