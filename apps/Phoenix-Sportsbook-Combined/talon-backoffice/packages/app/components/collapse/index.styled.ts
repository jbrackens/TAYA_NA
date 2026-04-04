import styled from "styled-components";
import { Collapse } from "antd";

export const StyledCollapse = styled(Collapse)`
  border-top: none !important;
  border: 1px solid ${(props) => props.theme.content.fixtureList.dividerColor};
  background-color: ${(props) =>
    props.theme.content.fixtureList.backgroundColor} !important;

  & .ant-collapse-header {
    font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
    font-weight: 600;
    font-stretch: normal;
    font-style: normal;
    background-color: ${(props) =>
      props.theme.content.fixtureList.backgroundColor} !important;
    color: ${(props) =>
      props.theme.content.fixtureList.mainFontColor} !important;
  }

  & .ant-collapse-item {
    border-bottom: 1px solid
      ${(props) => props.theme.content.fixtureList.dividerColor};
  }

  & .ant-collapse-content {
    background-color: ${(props) =>
      props.theme.content.fixtureList.backgroundColor} !important;
  }

  & .ant-collapse-content-box {
    padding: 0;
  }

  & .anticon {
    margin-right: ${(props) => 2 * props.theme.baseGutter}px;
    font-size: ${(props) => 1.5 * props.theme.baseGutter}px !important;
    color: ${(props) =>
      props.theme.content.fixtureList.collapseInactiveArrowColor} !important;
  }

  & .ant-collapse-item-active {
    & .anticon {
      color: ${(props) =>
        props.theme.content.fixtureList.activeTabBorderBottom} !important;
    }
  }

  &:last-child {
    border-bottom: none !important;
  }

  & .ant-collapse-item:last-child {
    border-bottom: none !important;
  }
`;
