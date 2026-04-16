import styled from "styled-components";
import { List, Spin } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { LiveBadge } from "../fixture-list/index.styled";
import { CoreButton } from "../../ui/button";

export const BetslipContainer = styled.div`
  align-items: center;
  margin: 0px;
  width: auto;
  @media (min-width: 1200px) {
    width: ${(props) => 35 * props.theme.baseGutter}px;
  }
  @media (max-width: 1200px) {
    height: 100%;
  }
  display: flex;
  flex-direction: column;
  box-shadow: 0 3px 6px 0 ${(props) => props.theme.betslip.boxShadowColor};
`;

export const FakeBackground = styled.div`
  background-color: ${(props) => props.theme.content.backgroundColor};
  @media (min-width: 1200px) {
    padding-top: ${(props) => 8.5 * props.theme.baseGutter}px;
  }
`;

export const BetslipStandardListItem = styled(List.Item)`
  background-color: ${(props) => props.theme.betslip.listItemBackgroundColor};
  border-bottom: 1px solid
    ${(props) => props.theme.betslip.listItemBorderBottomColor} !important;
  padding: 15px;
  & .ant-list-item-extra {
    margin-left: 0;
  }
`;

export const ListItemOdds = styled.span`
  color: ${(props) => props.theme.betslip.listItemOddsColor};
  margin-right: ${(props) => 0.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
`;

export const CloseButton = styled(CloseCircleOutlined)`
  color: ${(props) => props.theme.betslip.listItemRemoveButtonColor};
  &:hover {
    color: ${(props) => props.theme.betslip.listItemRemoveButtonHoverColor};
  }
`;

export const ListItemMeta = styled(List.Item.Meta)`
  margin-bottom: 0px !important;
  & > div {
    & > h4 {
      margin-bottom: 0px !important;
    }
  }
  & .ant-list-item-meta-title {
    color: ${(props) => props.theme.betslip.listItemSelectionNameColor};
    margin-bottom: 0px;
  }

  & .ant-list-item-meta-description {
    color: ${(props) => props.theme.betslip.listItemMatchWinnerTitle};
    font-size: ${(props) => 1.1 * props.theme.baseGutter}px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
  }
`;

export const WinnerContainer = styled.div`
  width: 100%;

  & .ant-input-number {
    background-color: ${(props) =>
      props.theme.betslip.listItemInputBackgroundColor};
    color: ${(props) => props.theme.betslip.listItemInputColor};
    border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
    border: 1px solid ${(props) => props.theme.betslip.listItemInputBorderColor};
  }
  .ant-input-number-handler-wrap {
    width: ${(props) => 2.6 * props.theme.baseGutter}px;
    margin-right: 1px;
    background-color: transparent;
    border-left: none;
    .ant-input-number-handler {
      background-color: ${(props) =>
        props.theme.betslip.listItemInputHoverButtons.backgroundColor};
    }

    .ant-input-number-handler {
      height: 50% !important;
      &:hover {
        svg {
          color: ${(props) =>
            props.theme.betslip.listItemInputHoverButtons.iconHoverColor};
        }
      }
    }

    .ant-input-number-handler-up {
      border-left: none !important;
      border-top: 1px solid transparent;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
    }

    .ant-input-number-handler-down {
      border-left: none !important;
      border-top: 1px solid
        ${(props) =>
          props.theme.betslip.listItemInputHoverButtons.buttonsDividerColor};
      border-bottom-left-radius: 5px;
      border-bottom-right-radius: 5px;
    }

    .anticon {
      right: 7px;
      font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
      top: 6px;
    }

    svg {
      color: ${(props) =>
        props.theme.betslip.listItemInputHoverButtons.iconColor};
    }
  }
`;

export const WinnerName = styled.div`
  font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.betslip.listItemWinnerNameColor};
`;

export const BetslipSettingsListItem = styled(List.Item)`
  background-color: ${(props) => props.theme.betslip.listItemBackgroundColor};
  padding: ${(props) => 1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.betslip.iconsColor};
  border-bottom: 1px solid
    ${(props) => props.theme.betslip.listItemBorderBottomColor};
`;

export const StakeListItem = styled(BetslipSettingsListItem)`
  border-top: 1px solid
    ${(props) => props.theme.betslip.listItemBorderBottomColor};
`;

export const SummaryContainer = styled.div`
  background-color: ${(props) => props.theme.betslip.listItemBackgroundColor};
`;

export const SummaryRow = styled.div`
  &:first-child {
    padding-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
  width: 100%;
  display: flex;
  color: ${(props) => props.theme.betslip.summary.possibleReturnTitleColor};
  padding-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
`;

export const SummaryRowBold = styled.div`
  &:first-child {
    padding-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
  width: 100%;
  display: flex;
  color: ${(props) => props.theme.betslip.summary.possibleReturnTitleColor};
  padding-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
`;

export const SummaryRowNoPadding = styled.div`
  margin-left: ${(props) => 0.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 0.5 * props.theme.baseGutter}px;
  width: 100%;
  display: flex;
  color: ${(props) => props.theme.betslip.summary.possibleReturnTitleColor};
`;

export const SummaryAmount = styled.span`
  margin-left: auto;
  color: ${(props) => props.theme.betslip.summary.totalStakeValueColor};
`;

export const SummaryButtonContainer = styled.div`
  border-top: 1px solid
    ${(props) => props.theme.betslip.listItemBorderBottomColor};
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

export const ClearBetslip = styled.div`
  margin: 10px;
  text-align: center;
  cursor: pointer;
  color: ${(props) => props.theme.betslip.summary.clearBetslipColor};
  &:hover {
    color: ${(props) => props.theme.betslip.summary.clearBetslipHoverColor};
  }
`;

export const InlineCoreButton = styled(CoreButton)`
  display: inline;
  margin-right: ${(props) => 1 * props.theme.baseGutter}px;
`;

export const DimmedLabel = styled.span`
  color: ${(props) => props.theme.betslip.summary.totalStakeTitleColor};
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  align-self: center;
`;

export const DimmedAcceptOddsLabel = styled(DimmedLabel)`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const PlaceBetButton = styled(CoreButton)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  height: ${(props) => 5 * props.theme.baseGutter}px;
  margin-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  @media (min-width: 1200px) {
    width: ${(props) => 33.2 * props.theme.baseGutter}px;
  }

  width: 100%;

  @media (max-witdh: 1200px) {
    margin-bottom: ${(props) => 12.5 * props.theme.baseGutter}px;
  }
`;

export const ToReturnContainer = styled.span`
  margin-left: auto;
`;

export const ToReturnLabel = styled.span`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  margin-left: 5px;
  margin-right: 3px;
  color: ${(props) => props.theme.betslip.listItemToReturn.titleColor};
`;

export const BetslipLiveBadge = styled(LiveBadge)`
  margin: initial;
  height: ${(props) => 1.7 * props.theme.baseGutter}px;
  width: ${(props) => 3.4 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 0.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1 * props.theme.baseGutter}px;
  align-items: center;
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  margin-top: ${(props) => 0.5 * props.theme.baseGutter}px;
`;

export const ToReturnValue = styled.span`
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.betslip.listItemToReturn.valueColor};
`;

export const CurrencyContainer = styled.span`
  color: ${(props) => props.theme.betslip.summary.currencyColor};
  margin-right: ${(props) => props.theme.baseGutter}px;
`;

export const PossibleReturnValue = styled.span`
  margin-left: auto;
  color: ${(props) => props.theme.betslip.summary.possibleReturnValueColor};
  padding-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const EmptyBetslipMessage = styled.div`
  color: ${(props) => props.theme.betslip.emptyBetslipMessageColor};
  padding: 25px 0;
  text-align: center;
`;

export const ErrorContainer = styled.div`
  padding-top: 10px;
  color: red;
`;

export const StyledSpin = styled(Spin)`
  color: ${(props) => props.theme.betslip.loadingSpinnerColor};
  & .ant-spin-dot-item {
    background-color: ${(props) => props.theme.betslip.loadingSpinnerColor};
  }

  & .ant-spin-text {
    text-shadow: 0 2px 1px ${(props) => props.theme.betslip.badgeFontColor} !important;
  }
`;
