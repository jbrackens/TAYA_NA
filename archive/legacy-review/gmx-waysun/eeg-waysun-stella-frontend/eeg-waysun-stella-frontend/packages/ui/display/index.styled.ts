import styled from "styled-components";

export const DisplayLabel = styled.label`
  display: block;
  font-size: 14px;
  color: ${(props) => props.theme.uiComponents.input.labelColor};
  margin-bottom: 8px;
`;

export const DisplayContent = styled.div`
  border-radius: 10px;
  background-color: ${(props) =>
    props.theme.uiComponents.display.displayBackground};
  padding: 30px;
`;
