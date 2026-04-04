import styled from "styled-components";

export const SPORT_ICON_SIZE = 24;

export const SportIconStyled = styled.span`
  display: inline-flex;
  width: ${SPORT_ICON_SIZE}px;
  height: ${SPORT_ICON_SIZE}px;

  border: 1px transparent solid;
  border-radius: 0.33rem;

  background: #ffffff;

  overflow: hidden;

  & + span {
    margin-left: ${SPORT_ICON_SIZE / -3}px;
    border-color: rgba(0, 0, 0, 0.15);
  }

  img {
    width: ${SPORT_ICON_SIZE}px;
    height: ${SPORT_ICON_SIZE}px;
    margin-top: -1px;
    margin-left: -1px;
  }
`;
