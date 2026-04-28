import styled from "styled-components";

export const Wrapper = styled.div`
  padding: 0 1rem;

  font-size: 0.75rem;
  color: ${(props) =>
    (props.theme as { menuDefaultColor?: string }).menuDefaultColor ||
    "var(--t1, #1a1a1a)"};

  cursor: default;
`;
