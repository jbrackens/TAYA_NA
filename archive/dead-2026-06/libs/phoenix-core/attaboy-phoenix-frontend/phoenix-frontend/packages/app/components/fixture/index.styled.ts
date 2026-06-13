import styled from "styled-components";
import { Col, Row } from "antd";

export const StyledCol = styled(Col)`
  border: 1px solid ${(props) => props.theme.content.fixtureList.dividerColor};
  padding-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  padding-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  border-bottom: transparent;
  @media (max-width: 1200px) {
    display: none;
  }
`;

export const BetButtonCol = styled(Col)``;

export const StyledRow = styled(Row)`
  background-color: ${(props) =>
    props.theme.content.fixtureList.fixtureRowBackgroundColor};

  & div:nth-child(even) {
    border-left: transparent !important;
  }

  & div:nth-child(1),
  div:nth-child(2) {
    border-top: transparent !important;
  }
`;

export const SubTitle = styled.div`
  margin-left: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-top: ${(props) => 1.5 * props.theme.baseGutter}px;
  margin-bottom: ${(props) => 1.5 * props.theme.baseGutter}px;
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  color: ${(props) => props.theme.content.fixtureList.mainFontColor};
`;

export const BetButtonRow = styled(Row)`
  padding-right: ${(props) => 1.2 * props.theme.baseGutter}px;
  padding-left: ${(props) => 1.2 * props.theme.baseGutter}px;
  &:last-child {
    margin-bottom: ${(props) => 3 * props.theme.baseGutter}px;
  }
`;

export const CollapseWrapper = styled.div`
  width: 100%;
  & .ant-collapse {
    @media (min-width: 1200px) {
      display: none;
    }
  }
  margin-bottom: ${(props) => 5 * props.theme.baseGutter}px;
`;
