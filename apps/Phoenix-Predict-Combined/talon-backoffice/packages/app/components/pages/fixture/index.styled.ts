import styled from "styled-components";
import { Row } from "antd";

export const Container = styled.div`
  margin-right: ${(props) => 3.5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 3.5 * props.theme.baseGutter}px;
`;

const BaseHeader = styled(Row)`
  border-radius: 5px;
  margin-right: ${(props) => 3.5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 3.5 * props.theme.baseGutter}px;
  & div {
    text-align: center;
  }
`;

export const StyledHeader = styled(BaseHeader)`
  height: ${(props) => 17.5 * props.theme.baseGutter}px;
  background: url("/images/header_background.png"),
    transparent
      linear-gradient(
        to bottom,
        ${(props) => props.theme.content.fixtureList.gradientFromColor},
        ${(props) => props.theme.content.fixtureList.gradientToColor} 50%
      );
  @media (max-width: 1200px) {
    display: none;
  }
`;

export const GameName = styled.div`
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  font-size: ${(props) => 2.1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.gameNameColor};
`;

export const TournamentName = styled.div`
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(props) => props.theme.content.fixtureList.tournamentNameColor};
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  opacity: 0.53;
`;

export const StyledMobileHeader = styled(BaseHeader)`
  height: ${(props) => 22.5 * props.theme.baseGutter}px;
  background: url("/images/header_background.png"),
    transparent
      linear-gradient(
        to bottom,
        ${(props) => props.theme.content.fixtureList.gradientFromColor},
        ${(props) => props.theme.content.fixtureList.gradientToColor} 75%
      );
  @media (min-width: 1200px) {
    display: none;
  }
`;

export const ScoreContainer = styled.div`
  font-weight: 800;
  font-stretch: normal;
  font-style: normal;
  font-size: ${(props) => 3.6 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.scoreColor};
`;

export const TeamName = styled.div`
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  /* font-size: ${(props) => 1.1 * props.theme.baseGutter}px; */
  font-size: ${(props) => 2 * props.theme.baseGutter}px; 
  color: ${(props) => props.theme.content.fixtureList.teamNameColor};
`;

export const StatusContainer = styled.div`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const NotStartedStatus = styled.div`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.statuses.notStartedColor};
  margin-bottom: 0px;
`;

export const LiveStatus = styled(StatusContainer)`
  color: ${(props) => props.theme.content.fixtureList.liveBadgeColor};
  width: ${(props) => 4 * props.theme.baseGutter}px;
  height: ${(props) => 2 * props.theme.baseGutter}px;
  border-radius: 2px;
  box-shadow: 0 0 25px 0
    ${(props) => props.theme.content.fixtureList.liveBadgeGradientColor};
  background-color: ${(props) =>
    props.theme.content.fixtureList.statuses.liveColor};
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
`;

export const SuspendedStatus = styled(StatusContainer)`
  color: ${(props) => props.theme.content.fixtureList.statuses.suspendedColor};
`;

export const EndedStatus = styled(StatusContainer)`
  color: ${(props) => props.theme.content.fixtureList.statuses.endedColor};
`;

export const CancelledStatus = styled(StatusContainer)`
  color: ${(props) => props.theme.content.fixtureList.statuses.cancelledColor};
`;

export const UnknownStatus = styled(StatusContainer)`
  color: ${(props) => props.theme.content.fixtureList.statuses.unknownColor};
`;

export const SpinnerContainer = styled.div`
  margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  text-align: center;
`;
