import styled from "styled-components";

export const ScrollerStyled = styled.div`
  display: block;
  width: 100%;
  height: auto;
  max-height: 75vh;

  position: relative;
  overflow-x: hidden;
  overflow-y: auto;

  background: var(--surface-1, #ffffff);
`;
