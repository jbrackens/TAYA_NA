import styled from "styled-components";
import { Card, Row, Col, Divider } from "antd";
import { CoreButton } from "../../ui/button";

export const StyledCard = styled(Card)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-top: ${(props) => -1 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.theme.content.account.notifications.backgroundColor};
  margin-bottom: ${(props) => 2.5 * props.theme.baseGutter}px;
  border: none;
  & .ant-card-head {
    border: none;
    color: ${(props) => props.theme.content.mainFontColor};
    font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  }
  & .ant-card-body {
    padding: 0;
  }
`;

export const InfoRow = styled(Row)`
  height: ${(props) => 7 * props.theme.baseGutter}px;
  align-items: center;
  align-content: center;
`;

export const NameCol = styled(Col)`
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  margin-left: ${(props) => 4 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.account.notifications.nameFont};
`;

export const ValueCol = styled(Col)`
  color: ${(props) => props.theme.content.account.notifications.valueFont};
  & .ant-form-item {
    margin-bottom: 0 !important;
  }
`;

export const StyledDivider = styled(Divider)`
  margin: 0;
  background-color: ${(props) =>
    props.theme.content.account.notifications.dividerColor};
`;

export const StyledButton = styled(CoreButton)`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  height: ${(props) => 5 * props.theme.baseGutter}px;
`;

export const SpinnerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;
