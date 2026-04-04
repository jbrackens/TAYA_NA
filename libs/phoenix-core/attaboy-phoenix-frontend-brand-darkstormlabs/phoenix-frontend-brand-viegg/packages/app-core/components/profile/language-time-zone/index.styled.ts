import styled from "styled-components";
import { Card, Row, Col, Divider } from "antd";
import { CoreButton } from "../../ui/button";

export const StyledCard = styled(Card)`
  background-color: ${(props) => props.theme.content.settings.backgroundColor};
  margin-right: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
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
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  height: ${(props) => 7 * props.theme.baseGutter}px;
  @media (max-width: 992px) {
    height: ${(props) => 9 * props.theme.baseGutter}px;
  }

  @media (max-width: 576px) {
    margin-top: ${(props) => props.theme.baseGutter}px;
    margin-bottom: ${(props) => props.theme.baseGutter}px;
  }
  align-items: center;
  align-content: center;
  margin-left: ${(props) => 4 * props.theme.baseGutter}px;
  margin-right: ${(props) => 4 * props.theme.baseGutter}px;
`;

export const NameCol = styled(Col)`
  color: ${(props) => props.theme.content.settings.nameFont};
`;

export const ValueCol = styled(Col)`
  color: ${(props) => props.theme.content.personalData.mainFontColor};
`;

export const StyledButton = styled(CoreButton)`
  height: ${(props) => 5 * props.theme.baseGutter}px;
  margin-left: ${(props) => 2.5 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 5 * props.theme.baseGutter}px;
`;

export const StyledDivider = styled(Divider)`
  margin: 0;
  background-color: ${(props) => props.theme.content.settings.dividerColor};
`;
