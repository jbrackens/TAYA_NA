import styled from "styled-components";
import { Form, Tabs, Divider } from "antd";
import { CoreButton } from "../../ui/button";

export const FormItemWithSmallerMarginBottom: typeof Form.Item = styled(
  Form.Item,
)`
  margin-bottom: 20px;
`;

export const StyledTabs = styled(Tabs)`
  height: 100%;

  .ant-tabs-nav {
    background-color: ${(props) =>
      props.theme.cashier.tabsHeaderBackgroundColor};
    margin: 0 !important;

    :before {
      border-bottom: 1px solid ${(props) => props.theme.cashier.dividerColor};
    }
  }

  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${(props) => props.theme.cashier.tabActiveColor};
  }

  .ant-tabs-tab-btn {
    font-size: ${(props) => 1.6 * props.theme.baseGutter}px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
    color: ${(props) => props.theme.cashier.inactiveTabColor};
  }

  .ant-tabs-ink-bar {
    background-color: ${(props) =>
      props.theme.cashier.activeTabBorderColor} !important;
  }

  .ant-tabs-tab,
  .ant-tabs-tab-active {
    margin-left: ${(props) => 3 * props.theme.baseGutter}px;
  }

  .ant-tabs-content {
    height: 100%;
  }

  .ant-tabs-tabpane {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .ant-tabs-content-holder {
    padding-top: ${(props) => 2 * props.theme.baseGutter}px;
    padding-left: ${(props) => 2 * props.theme.baseGutter}px;
    padding-right: ${(props) => 2 * props.theme.baseGutter}px;
    background-color: ${(props) =>
      props.theme.cashier.tabsContentBackgroundColor} !important;
  }
`;

export const StyledButton = styled(CoreButton)`
  margin-top: ${(props) => 2 * props.theme.baseGutter}px;
`;

export const MessageContainer = styled.div`
  color: ${(props) =>
    props.theme.uiComponents.modals.forgotPasswordModal.messageColor};
`;

export const StyledDivider = styled(Divider)`
  color: ${(props) => props.theme.cashier.dividerTextColor} !important;

  :after,
  :before {
    border-top: 1px solid ${(props) => props.theme.cashier.dividerColor} !important;
  }
`;
