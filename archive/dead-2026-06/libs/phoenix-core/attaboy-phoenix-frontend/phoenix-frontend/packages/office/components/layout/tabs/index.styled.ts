import { Tabs, Row } from "antd";
import styled from "styled-components";

const { TabPane } = Tabs;

const PADDING_SIZE = 48;

export const TabsSection = styled(Tabs)`
  display: flex;
  flex-grow: 1;

  margin: ${PADDING_SIZE / 2}px ${-1 * PADDING_SIZE}px ${PADDING_SIZE / -2}px
    ${-1 * PADDING_SIZE}px;

  .ant-tabs-content-holder {
    display: flex;
    flex-grow: 1;
    width: auto;
    padding: ${PADDING_SIZE}px ${PADDING_SIZE}px;

    background: #ffffff;

    overflow-y: auto;
    overflow-x: hidden;
  }

  .ant-tabs-nav {
    margin-bottom: 0;
    padding: 0 ${PADDING_SIZE}px;
  }
`;

export const TabPaneStatic = styled(TabPane)`
  overflow: hidden;
`;

export const TabSectionRow = styled(Row)`
  flex-grow: 1;

  .ant-col {
    display: flex;
  }

  /* fixing issue with no table data on small resolution */
  .ant-table-body {
    max-height: none !important;
  }
`;
