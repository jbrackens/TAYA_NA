import styled from "styled-components";

export const PromoAvailabilityContainer = styled.section`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
  padding: ${(props) => 1.5 * props.theme.baseGutter}px;
  border: 1px solid
    ${(props) => props.theme.content.account.accountHistory.dividerColor};
  border-radius: ${(props) => 0.5 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.content.account.accountHistory.backgroundColor};
`;

export const PromoAvailabilityTitle = styled.h3`
  margin: 0 0 ${(props) => 1 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.account.pageSubtitleColor};
  font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
  font-weight: 600;
`;

export const PromoMetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${(props) => 0.6 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.account.accountHistory.nameColor};
`;

export const PromoMetricLabel = styled.span`
  font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
`;

export const PromoMetricValue = styled.span`
  font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
  font-weight: 700;
  color: ${(props) => props.theme.content.account.accountHistory.valueColor};
`;

export const PromoHint = styled.p`
  margin: ${(props) => 0.8 * props.theme.baseGutter}px 0 0;
  color: ${(props) => props.theme.content.account.pageSubtitleColor};
  font-size: ${(props) => 1.2 * props.theme.baseGutter}px;
`;
