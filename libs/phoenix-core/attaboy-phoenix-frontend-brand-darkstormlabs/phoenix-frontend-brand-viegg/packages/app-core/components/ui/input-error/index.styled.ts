import styled from "styled-components";

export const StyledError = styled.div`
  height: auto;
  border-radius: 5px;
  padding: ${(props) => props.theme.baseGutter}px;
  display: flex;
  align-items: center;
  text-align: initial;
  color: ${(props) => props.theme.globalForm.alertColor} !important;
  font-size: ${(props) => 1.1 * props.theme.baseGutter}px;
  background-color: ${(props) => props.theme.globalForm.errorBackgroundColor};
  color: white;
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
`;
