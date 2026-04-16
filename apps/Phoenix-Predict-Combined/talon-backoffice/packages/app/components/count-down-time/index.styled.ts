import styled from "styled-components";

export const BreakTimeContainer = styled.div`
  color: ${(props) => props.theme.content.account.limits.breakTimeInfoColor};
  & span {
    color: ${(props) => props.theme.content.account.limits.breakTimeColor};
    margin-left: ${(props) => 0.5 * props.theme.baseGutter}px;
  }
`;
