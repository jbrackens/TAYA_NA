import styled from "styled-components";
import {
  Button,
  Collapse,
  Typography,
  Divider,
  Col,
  Row,
  Tag,
  Spin,
} from "antd";

export const StyledTitle = styled(Typography.Title)`
  font-size: ${(props) => 2.4 * props.theme.baseGutter}px !important;
  color: ${(props) => props.theme.content.account.pageTitleColor} !important;
`;

export const Subtitle = styled(Typography.Title)`
  font-size: ${(props) => props.theme.baseGutter}px !important;
  color: ${(props) => props.theme.content.account.pageSubtitleColor} !important;
`;

export const StyledUl = styled.ul`
  padding-left: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  padding-right: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  padding-top: ${(props) => 2 * props.theme.baseGutter}px !important;
  .ant-tag {
    margin-right: 0px;
  }
`;

export const BetDetailsListItem = styled.li`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.backgroundColor};
  color: ${(props) => props.theme.content.mainFontColor};
  border-radius: 5px;
  list-style-type: none;
  padding: ${(props) => 2 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const BetPartListItem = styled.div`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.betPartBackgroundColor};
  color: ${(props) => props.theme.content.mainFontColor};
  border-radius: 5px;
  list-style-type: none;
  padding: ${(props) => 2 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
`;

export const NameCell = styled.td`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.listItemKeyColor};
  @media (min-width: 1200px) {
    padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
    width: 40%;
  }
`;

type ValueCellProps = {
  isBold?: boolean;
};

export const ValueCell = styled.td<ValueCellProps>`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) =>
    props.theme.content.account.betHistory.listItemValueColor};
  @media (max-width: 1200px) {
    width: 100%;
    padding-left: 0px;
  }
  padding-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-weight: ${(props) => (props.isBold ? "bold" : "normal")};
`;

export const WinLossTable = styled.table`
  width: 100%;
`;

export const DynamicTableRow = styled.tr`
  @media (max-width: 1200px) {
    display: flex;
    flex-wrap: wrap;
  }
  width: 100%;
  & > td {
    padding-bottom: ${(props) => 0.5 * props.theme.baseGutter}px;
  }
`;

export const ListContainer = styled.div``;

export const ListHeaderContainer = styled.div`
  width: 100%;
  display: flex;
  margin-bottom: ${(props) => 2 * props.theme.baseGutter}px;
  &:first-child {
    color: ${(props) =>
      props.theme.content.account.betHistory.listItemTitleColor};
  }
`;

export const ResultContainer = styled.span`
  margin-left: auto;
  margin-right: ${(props) => 2 * props.theme.baseGutter}px;
  @media (min-width: 1200px) {
    display: none;
  }
`;

export const MobileResultContainer = styled.span`
  margin-left: auto;
  margin-right: ${(props) => 2 * props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    display: none;
  }
`;

export const StakeAndResultContainer = styled.span`
  display: flex;
`;

export const BetPartResultContainer = styled.span`
  margin-left: auto;
`;

export const ResultCol = styled(Col)`
  text-align: end;
`;

export const SelectionContainer = styled.div`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  padding-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
  color: ${(props) =>
    props.theme.content.account.betHistory.selectionNameColor};
`;

export const OddsNameContainer = styled.span`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.oddsNameColor};
`;

export const CollapseButton = styled(Button)`
  border: none;
  margin: 15px 0 15px 0;
  height: ${(props) => 5 * props.theme.baseGutter}px !important;
  background-color: ${(props) =>
    props.theme.content.account.betHistory.detailsButtonBackgroundColor};
  color: ${(props) =>
    props.theme.content.account.betHistory.detailsButtonColor};
  border-radius: 5px;
  &:hover,
  :active,
  :focus {
    background-color: ${(props) =>
      props.theme.content.account.betHistory.detailsButtonHoverBackgroundColor};
    color: ${(props) =>
      props.theme.content.account.betHistory.detailsButtonColor};
  }
`;

export const CustomCollapse = styled(Collapse)`
  border: none;
  background-color: transparent !important;
  .ant-collapse {
    border: none !important;
  }

  .ant-collapse-content {
    background-color: transparent !important;
  }

  .ant-collapse-header {
    display: none;
  }

  .ant-collapse-item {
    border: none;
  }

  .ant-collapse-content {
    border: none;
  }

  .ant-collapse-content-box {
    padding: 0;
  }
`;

export const DivPaddingBottom = styled.div`
  color: ${(props) => props.theme.content.account.betHistory.legNameColor};
  margin-left: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const PeriodName = styled.span`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.3 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.periodNameColor};
`;

export const DateContainer = styled.span`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.dateColor};
`;

export const MarketName = styled.div`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.marketNameColor};
`;

export const DivDisplayFlex = styled.div`
  display: flex;
  width: 100%;
  @media (max-width: 1200px) {
    display: block;
  }
`;

export const SpanMarginLeftAuto = styled.div`
  margin-left: auto;
  display: inline-block;
  @media (max-width: 1200px) {
    width: 100%;
  }
`;

export const BetPartFooter = styled.div`
  display: flex;
  width: 100%;
`;

export const DivPaddingRight = styled.div`
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.account.betHistory.betPartTitleColor};
`;

export const BetPartValue = styled.div`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.betPartValueColor};
`;

export const PlValue = styled.div`
  font-weight: bold;
`;

type PlValueContainerProps = {
  isPositive: boolean;
};
export const PlValueContainer = styled(PlValue)<PlValueContainerProps>`
  color: ${(props) => (props.isPositive ? "green" : "red")};
`;

export const CustomDivider = styled(Divider)`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.dividerColor};
`;

export const LegOddContainer = styled.div`
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  color: ${(props) => props.theme.content.account.betHistory.legOddsColor};
`;

export const RowPaddingBottom = styled(Row)`
  padding-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
  span {
    align-self: end;
    margin-top: ${(props) => 0.5 * props.theme.baseGutter}px;
  }
`;

export const EmptyDataContainer = styled.div`
  height: ${(props) => 21 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.account.noDataContainerFontColor};
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${(props) =>
    props.theme.content.account.noDataContainerBackgroundColor};
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 5 * props.theme.baseGutter}px;
`;

export const DropdownsContainer = styled(Row)`
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px !important;
  margin-bottom: ${(props) => 1.7 * props.theme.baseGutter}px !important;
  & .ant-typography {
    margin-left: 0px !important;
  }
  & .ant-select-selector {
    padding: 0 !important;
  }
`;

const BaseTag = styled(Tag)`
  display: flex;
  color: ${(props) => props.theme.content.account.betHistory.tag.fontColor};
  border: none;
  height: ${(props) => 3 * props.theme.baseGutter}px;
  width: ${(props) => 8 * props.theme.baseGutter}px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-family: Mulish, sans-serif;
  font-size: 14px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
`;

export const CancelledStatusTag = styled(BaseTag)`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.tag.cancelledStatusColor};
`;

export const VoidedStatusTag = styled(BaseTag)`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.tag.voidedStatusColor};
`;

export const OpenStatusTag = styled(BaseTag)`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.tag.openStatusColor};
`;

export const LostResultTag = styled(BaseTag)`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.tag.lostResultColor};
`;

export const WonResultTag = styled(BaseTag)`
  background-color: ${(props) =>
    props.theme.content.account.betHistory.tag.wonResultColor};
`;

export const CenteredSpin = styled(Spin)`
  width: 100%;
`;
