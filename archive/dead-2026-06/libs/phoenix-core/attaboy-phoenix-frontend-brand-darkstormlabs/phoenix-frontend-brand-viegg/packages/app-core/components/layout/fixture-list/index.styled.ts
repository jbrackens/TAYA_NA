import styled from "styled-components";
import { AvatarComponent } from "../../avatar";
import { Divider, Row, List, Button, Col } from "antd";

export const FixtureContainer = styled(List)`
  height: ${(props) => 14.5 * props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    height: ${(props) => 19 * props.theme.baseGutter}px;
  }
  & .ant-spin-nested-loading,
  .ant-spin-container {
    height: 100%;
  }

  & .ant-row-middle {
    height: calc(100% - ${(props) => 4.9 * props.theme.baseGutter + 2}px);
    @media (max-width: 1200px) {
      height: calc(100% - ${(props) => 3.5 * props.theme.baseGutter + 2}px);
    }
  }
`;

export const FxtureHeader = styled(Row)`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  display: flex;
  align-content: center;
  margin-left: ${(props) => 0.8 * props.theme.baseGutter}px;
  margin-right: ${(props) => 0.8 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.content.fixtureList.headerBackgroundColor};
  color: ${(props) => props.theme.content.fixtureList.headerColor};
  height: ${(props) => 4.9 * props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    height: ${(props) => 3.5 * props.theme.baseGutter}px;
  }
  & .ant-col {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

export const FixtureContent = styled(Row)`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.mainFontColor};
  padding: ${(props) => 1 * props.theme.baseGutter}px;
  cursor: pointer;
  &:hover {
    background-color: ${(props) =>
      props.theme.content.fixtureList.hoverBackgroudColor};
  }
`;

export const AvatarComponentStyled = styled(AvatarComponent)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const TemporaryEmptyAvater = styled.span`
  margin-left: 0 !important;
  margin-right: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const StyledDivider = styled(Divider)`
  background-color: ${(props) => props.theme.content.fixtureList.dividerColor};
  margin: 0;
  width: auto;
  margin-left: ${(props) => 0.8 * props.theme.baseGutter}px;
  margin-right: ${(props) => 0.8 * props.theme.baseGutter}px;
  min-width: auto;
`;

export const BetButtonsContainer = styled(Row)`
  @media (max-width: 1200px) {
    margin-top: ${(props) => 1 * props.theme.baseGutter}px !important;
  }
`;

export const MarketsCountButtonContainer = styled(Col)`
  padding-left: ${(props) => 0.3 * props.theme.baseGutter}px;
  padding-right: ${(props) => 1 * props.theme.baseGutter}px;
`;

export const MarketsCountButton = styled(Button)`
  width: 100%;
  padding: 0;
  background-color: ${(props) =>
    props.theme.content.fixtureList.betButtonBackgroundColor};
  border: 1px solid
    ${(props) => props.theme.content.fixtureList.betButtonBorderColor};
  color: ${(props) => props.theme.content.fixtureList.marketCountButtonColor};
  height: 100%;
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  height: ${(props) => 6 * props.theme.baseGutter}px;

  & img {
    height: ${(props) => 0.85 * props.theme.baseGutter}px;
    width: ${(props) => 0.5 * props.theme.baseGutter}px;
    margin-left: ${(props) => 0.8 * props.theme.baseGutter}px;
  }

  &:hover {
    border: 1px solid
      ${(props) => props.theme.content.fixtureList.hoverBetButtonBorderColor};
    background-color: ${(props) =>
      props.theme.content.fixtureList.hoverBetButtonBackgroundColor} !important;
    color: ${(props) => props.theme.content.fixtureList.hoverBetButtonColor};

    & img {
      filter: opacity(0.5)
        drop-shadow(
          0 0 0
            ${(props) =>
              props.theme.content.fixtureList.hoverBetButtonBorderColor}
        );
    }
  }

  &:active,
  :focus {
    border: 1px solid
      ${(props) =>
        props.theme.content.fixtureList.highlightedBetButtonBorderColor};
  }
`;

export const DateContainer = styled(Col)`
  & .ant-row {
    opacity: 0.32;
  }
  align-self: center;
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
`;

export const MobileDateContainer = styled(DateContainer)`
  padding-right: ${(props) => 1 * props.theme.baseGutter}px;
`;

export const CompetitorsContainer = styled(Col)`
  border-right: 1px solid
    ${(props) => props.theme.content.fixtureList.dividerColor};
  & span {
    margin-left: ${(props) => props.theme.baseGutter}px;
  }
`;

export const CompetitorName = styled(Col)`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

export const LiveBadge = styled.div`
  width: 28px;
  height: 14px;
  font-size: ${(props) => 0.8 * props.theme.baseGutter}px;
  font-weight: 800;
  font-stretch: normal;
  font-style: normal;
  margin: 0 auto;
  border-radius: 2px;
  box-shadow: 0 0 25px 0
    ${(props) => props.theme.content.fixtureList.liveBadgeGradientColor};
  background-color: ${(props) =>
    props.theme.content.fixtureList.liveBadgeBackgroundColor};
  color: ${(props) => props.theme.content.fixtureList.liveBadgeColor};
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const IconContainer = styled(LiveBadge)`
  background-color: transparent;
  box-shadow: none;
  color: ${(props) => props.theme.content.fixtureList.statuses.notStartedColor};
  svg {
    font-size: 20px;
  }
`;

export const ScoreContainer = styled(Col)`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  text-align: center;
  align-self: center;
`;

export const BetButtonRow = styled(Row)`
  padding-left: ${(props) => 1 * props.theme.baseGutter}px;

  div {
    padding-right: ${(props) => 0.6 * props.theme.baseGutter}px;
  }

  & .ant-col:last-child {
    padding-right: ${(props) => 0.3 * props.theme.baseGutter}px !important;
  }
`;

export const LoadMoreButtonContainer = styled.div`
  text-align: center;
`;

export const LoadMoreButton = styled(Button)`
  margin-top: ${(props) => 8 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 8 * props.theme.baseGutter}px;

  @media (max-width: 1200px) {
    margin-top: ${(props) => 2 * props.theme.baseGutter}px;
    margin-bottom: ${(props) => 3 * props.theme.baseGutter}px;
  }

  width: ${(props) => 15 * props.theme.baseGutter}px;
  height: ${(props) => 5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.loadMoreButtonColor};
  background-color: ${(props) =>
    props.theme.content.fixtureList.loadMoreButtonBackgroundColor};
  box-shadow: 0 3px 26px 0
    ${(props) => props.theme.content.fixtureList.loadMoreButtonShadowColor};
  border: none;

  &:hover,
  :active,
  :focus {
    color: ${(props) => props.theme.content.fixtureList.loadMoreButtonColor};
    background-color: ${(props) =>
      props.theme.content.fixtureList.loadMoreButtonHoverBackgroundColor};
    box-shadow: 0 3px 26px 0
      ${(props) =>
        props.theme.content.fixtureList.loadMoreButtonHoverShadowColor};
  }
`;
