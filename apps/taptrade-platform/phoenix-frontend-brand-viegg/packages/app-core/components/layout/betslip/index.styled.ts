import styled from "styled-components";
import { List, Spin } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { LiveBadge } from "../fixture-list/index.styled";
import { CoreButton } from "../../ui/button";

export const BetslipContainer = styled.div`
  align-items: center;
  margin: 0;
  width: 100%;
  @media (min-width: 1200px) {
    width: ${(props) => 35 * props.theme.baseGutter}px;
  }
  @media (max-width: 1200px) {
    height: 100%;
  }
  display: flex;
  flex-direction: column;
  box-shadow: none;
  background: var(--color-bg-overlay);
  border-left: 0;
`;

export const FakeBackground = styled.div`
  background-color: var(--color-bg-base);
  @media (min-width: 1200px) {
    padding-top: ${(props) => 7.2 * props.theme.baseGutter}px;
  }
`;

export const BetslipStandardListItem = styled(List.Item)`
  background-color: rgba(33, 55, 67, 0.78);
  border: 1px solid rgba(99, 120, 136, 0.22) !important;
  border-radius: var(--radius-md);
  padding: 12px;
  margin: 8px 10px;
  box-shadow: none;
  & .ant-list-item-extra {
    margin-left: 0;
  }
`;

export const ListItemOdds = styled.span`
  color: var(--color-accent);
  margin-right: ${(props) => 0.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
`;

export const CloseButton = styled(CloseCircleOutlined)`
  color: var(--color-muted);
  &:hover {
    color: var(--color-live);
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
    color: #ffffff;
    margin-bottom: 0px;
  }

  & .ant-list-item-meta-description {
    color: var(--color-muted);
    font-size: 11px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
  }
`;

export const WinnerContainer = styled.div`
  width: 100%;
  margin-top: 8px;

  & .ant-input-number {
    background-color: var(--color-bg-elevated);
    color: #ffffff;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(99, 120, 136, 0.22);
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
  font-weight: 600;
  color: var(--sb-text-primary);
`;

export const BetslipSettingsListItem = styled(List.Item)`
  background-color: rgba(15, 31, 42, 0.96);
  padding: ${(props) => 1 * props.theme.baseGutter}px
    ${(props) => 1.2 * props.theme.baseGutter}px;
  color: var(--color-neutral);
  border-bottom: 1px solid rgba(99, 120, 136, 0.16);
`;

export const StakeListItem = styled(BetslipSettingsListItem)`
  border-top: 1px solid
    ${(props) => props.theme.betslip.listItemBorderBottomColor};
`;

export const SummaryContainer = styled.div`
  background: rgba(15, 31, 42, 0.98);
  width: 100%;
  border-top: 1px solid rgba(99, 120, 136, 0.18);
`;

export const SummaryRow = styled.div`
  &:first-child {
    padding-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
  width: 100%;
  display: flex;
  color: var(--color-neutral);
  padding-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-size: 12px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  align-items: center;
  min-height: 32px;
`;

export const SummaryRowBold = styled.div`
  &:first-child {
    padding-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
  width: 100%;
  display: flex;
  color: #ffffff;
  padding-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-size: 12px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  align-items: center;
  min-height: 36px;
`;

export const SummaryRowNoPadding = styled.div`
  margin-left: ${(props) => 0.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 0.5 * props.theme.baseGutter}px;
  width: 100%;
  display: flex;
  color: var(--sb-text-secondary);
`;

export const SummaryAmount = styled.span`
  margin-left: auto;
  color: var(--sb-text-primary);
`;

export const SummaryButtonContainer = styled.div`
  border-top: 1px solid rgba(99, 120, 136, 0.18);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 8px;
`;

export const ClearBetslip = styled.div`
  margin: 12px;
  text-align: center;
  cursor: pointer;
  color: var(--color-neutral);
  transition: all 150ms ease;
  &:hover {
    color: var(--color-live);
  }
`;

export const InlineCoreButton = styled(CoreButton)`
  display: inline;
  margin-left: ${(props) => 1 * props.theme.baseGutter}px;
  border-radius: 8px;
`;

export const DimmedLabel = styled.span`
  color: var(--color-neutral);
  font-size: 12px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  align-self: center;
`;

export const DimmedAcceptOddsLabel = styled(DimmedLabel)`
  font-size: 12px;
`;

export const PlaceBetButton = styled(CoreButton)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  height: 44px;
  margin-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  @media (min-width: 1200px) {
    width: ${(props) => 33.2 * props.theme.baseGutter}px;
  }

  width: calc(100% - 30px);
  background: var(--color-accent) !important;
  border-color: var(--color-accent) !important;
  color: #000000 !important;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 700;
  transition: all 150ms ease;

  @media (max-width: 1200px) {
    margin-bottom: ${(props) => 12.5 * props.theme.baseGutter}px;
  }

  &:hover,
  &:focus,
  &:active {
    filter: brightness(1.1);
    background: var(--color-accent-dim) !important;
    border-color: var(--color-accent-dim) !important;
    color: #000000 !important;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed !important;
    filter: none;
  }
`;

export const ToReturnContainer = styled.span`
  margin-left: auto;
`;

export const ToReturnLabel = styled.span`
  font-size: 12px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  margin-left: 5px;
  margin-right: 3px;
  color: var(--color-neutral);
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
  font-size: 12px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  color: #d7bb62;
`;

export const CurrencyContainer = styled.span`
  color: #ffffff;
  margin-right: ${(props) => props.theme.baseGutter}px;
`;

export const PossibleReturnValue = styled.span`
  margin-left: auto;
  color: #d7bb62;
  padding-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const EmptyBetslipMessage = styled.div`
  color: var(--color-neutral);
  padding: 42px 14px;
  text-align: center;
`;

export const EmptyBetslipBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export const EmptyBetslipTitle = styled.div`
  font-size: 14px;
  color: #ffffff;
`;

export const EmptyBetslipSubtitle = styled.div`
  font-size: 12px;
  color: var(--color-muted);
`;

export const EmptyBetslipFeatureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 16px;
  text-align: left;
`;

export const EmptyBetslipFeatureCard = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid rgba(99, 120, 136, 0.16);
  border-radius: var(--radius-sm);
  background: rgba(33, 55, 67, 0.6);
  padding: 10px 12px;
`;

export const EmptyBetslipFeatureIcon = styled.div`
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const EmptyBetslipFeatureTitle = styled.div`
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
`;

export const EmptyBetslipFeatureDescription = styled.div`
  color: var(--color-muted);
  font-size: 11px;
  line-height: 1.4;
  margin-top: 2px;
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

export const StakeControlPanel = styled.div`
  display: grid;
  gap: 10px;
  width: 100%;
`;

export const StakeControlHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const StakeControlLabel = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const StakeControlHint = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
`;

export const StakeInputShell = styled.div`
  width: 100%;

  .ant-input-number {
    width: 100%;
    height: 42px;
    background: rgba(45, 74, 90, 0.82) !important;
    border: 1px solid rgba(99, 120, 136, 0.22) !important;
    border-radius: var(--radius-sm);
    color: #ffffff !important;
    box-shadow: none;
  }

  .ant-input-number:hover,
  .ant-input-number-focused,
  .ant-input-number:focus-within {
    border-color: var(--color-accent) !important;
    background: rgba(45, 74, 90, 0.92) !important;
  }

  .ant-input-number-input {
    height: 40px;
    color: #ffffff;
    font-size: var(--font-size-base);
    font-weight: 700;
  }

  .ant-input-number-handler-wrap {
    background: rgba(15, 31, 42, 0.88);
    border-left: 1px solid rgba(99, 120, 136, 0.16);
  }

  .ant-input-number-handler {
    border-color: rgba(99, 120, 136, 0.16);
    background: transparent;
  }

  .ant-input-number-handler:hover {
    background: rgba(0, 231, 0, 0.08);
  }

  .anticon {
    color: var(--color-neutral) !important;
  }
`;

export const StakeQuickChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const StakeQuickChipButton = styled.button<{ $active?: boolean }>`
  min-width: 56px;
  height: 30px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "var(--color-accent)" : "rgba(99, 120, 136, 0.2)"};
  background: ${(props) =>
    props.$active ? "var(--color-accent-muted)" : "rgba(15, 31, 42, 0.82)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.88);
  }
`;

export const SummaryStack = styled.div`
  display: grid;
  width: 100%;
`;

export const SummarySection = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(99, 120, 136, 0.16);
`;

export const SummaryMetricRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const SummaryMetricLabel = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  font-weight: 600;
`;

export const SummaryMetricValue = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 800;
`;

export const SummaryMetricValueAccent = styled(SummaryMetricValue)`
  color: #d7bb62;
`;

export const SummaryPromoGroup = styled.div`
  display: grid;
  gap: 8px;
`;

export const SummaryPromoCard = styled.div`
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(99, 120, 136, 0.16);
  background: rgba(33, 55, 67, 0.56);
`;

export const SummaryPromoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const SummaryPromoTitle = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const SummaryPromoMeta = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
`;

export const SummarySwitchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(99, 120, 136, 0.16);
`;

export const SummaryActionsStack = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px 14px 16px;
`;

export const SecondaryActionButton = styled(CoreButton)`
  width: 100%;
  height: 38px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(99, 120, 136, 0.2) !important;
  background: rgba(33, 55, 67, 0.78) !important;
  color: #ffffff !important;
  font-size: var(--font-size-sm);
  font-weight: 700;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover,
  &:focus,
  &:active {
    background: rgba(45, 74, 90, 0.9) !important;
    border-color: var(--color-accent) !important;
    color: #ffffff !important;
  }
`;

export const SecondaryInlineActionButton = styled(SecondaryActionButton)`
  width: auto;
  min-width: 110px;
  height: 34px;
  padding: 0 12px;
`;
