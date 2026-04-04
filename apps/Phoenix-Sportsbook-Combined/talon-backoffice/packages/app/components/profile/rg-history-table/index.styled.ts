import styled from "styled-components";

export const Container = styled.div`
  padding: ${(props) => 3 * props.theme.baseGutter}px;
  margin: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-top: 0;
  background-color: ${(props) =>
    props.theme.content.rgLimitsHistory.containerBackgroundColor};
`;
