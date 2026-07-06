import styled from "styled-components";

export const ListItemContainer = styled.div`
  background-color: ${(props) =>
    props.theme.content.account.accountHistory.backgroundColor};
  padding: 20px 20px 10px 20px;
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px;
  border-radius: ${(props) => 1 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  .ant-list-item {
    border-bottom: 1px solid
      ${(props) => props.theme.content.account.accountHistory.dividerColor};
    @media (max-width: 1200px) {
      display: block;
    }
  }
`;

export const IdsTableContainer = styled.div`
  padding: ${(props) => 1.2 * props.theme.baseGutter}px 0px;
  font-size: 14px;
  .ant-table {
    font-size: 12px;
  }
`;

export const StyledTable = styled.table`
  width: auto;
  text-align: left;
  & td {
    color: ${(props) =>
    props.theme.content.account.accountHistory.idValueColor};
  }
`;

export const StyledTd = styled.td`
  font-weight: normal;
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  color: ${(props) =>
    props.theme.content.account.accountHistory.nameColor} !important;
`;

export const Amount = styled.td`
  color: ${(props) =>
    props.theme.content.account.accountHistory.valueColor} !important;
`;

export const IdTd = styled.td`
  color: ${(props) =>
    props.theme.content.account.accountHistory.nameColor} !important;
`;

export const TdWithDynamicWidth = styled.td`
  width: ${(props) => (props.width ? props.width : 0)};
  color: ${(props) =>
    props.theme.content.account.accountHistory.nameColor} !important;
  font-size: 14px;
  white-space: nowrap;
  padding-right: ${(props) => 1 * props.theme.baseGutter}px;
`;

export const DynamicTableRow = styled.tr`
  @media (max-width: 1200px) {
    display: flex;
    flex-wrap: wrap;
  }
`;

export const DynamicTableTd = styled.td`
  color: ${(props) =>
    props.theme.content.account.accountHistory.valueColor};
  @media (max-width: 1200px) {
    width: 100%;
  }
`;

export const PaymentMethod = styled.div`
  @media (max-width: 1200px) {
    margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  }

  @media (min-width: 1200px) {
    text-align: end;
  }
  color: ${(props) => props.theme.content.secondaryFontColor};
  font-size: 14px;
  margin-left: auto;
  align-self: center;
`;

export const IdsTableAndPaymentContainer = styled.div`
  @media (max-width: 1200px) {
    display block;
  };
    display: flex;
    width: 100%;
`;

export const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
`;

export const StatusContainer = styled.div`
  @media (min-width: 1200px) {
    display: flex;
    justify-content: flex-end;
  }
`;

export const TimeContainer = styled.div`
  color: ${(props) => props.theme.content.account.accountHistory.timeColor};
  margin-bottom: ${(props) => 2.5 * props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  }
`;

export const BaseBadge = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${(props) =>
    props.theme.content.account.accountHistory.badgeFontColor};
  width: ${(props) => 8.5 * props.theme.baseGutter}px;
  height: ${(props) => 3 * props.theme.baseGutter}px;
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1 * props.theme.baseGutter}px;
  width: ${(props) => 8.5 * props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    margin-top: ${(props) => 1 * props.theme.baseGutter}px;
  }
`;

export const SuccessBadge = styled(BaseBadge)`
  background-color: ${(props) =>
    props.theme.content.account.accountHistory.successBadgeBackgroundColor};
`;

export const PendingBadge = styled(BaseBadge)`
  background-color: ${(props) =>
    props.theme.content.account.accountHistory.pendingBadgeBackgroundColor};
`;

export const RejectedBadge = styled(BaseBadge)`
  background-color: ${(props) =>
    props.theme.content.account.accountHistory.rejectedBadgeBackgroundColor};
`;

export const NoDataContainer = styled.div`
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
