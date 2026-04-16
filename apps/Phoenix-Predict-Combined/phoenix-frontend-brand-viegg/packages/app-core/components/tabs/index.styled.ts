import styled from "styled-components";
import { Tabs } from "antd";

export const StyledTabs = styled(Tabs)`
  & .ant-tabs-nav:before {
    border-bottom: 1px solid
      ${(props) => props.theme.content.fixtureList.dividerColor};
  }

  & .ant-tabs-nav {
    margin: 0 !important;
  }

  & .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${(props) => props.theme.content.fixtureList.mainFontColor};
  }

  & .ant-tabs-tab-btn {
    font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
    color: ${(props) => props.theme.content.fixtureList.inactiveTabColor};
  }

  & .ant-tabs-ink-bar {
    background-color: ${(props) =>
      props.theme.content.fixtureList.activeTabBorderBottom} !important;
  }

  & .ant-tabs-tab,
  .ant-tabs-tab-active {
    margin-left: ${(props) => 3 * props.theme.baseGutter}px;
  }
`;
