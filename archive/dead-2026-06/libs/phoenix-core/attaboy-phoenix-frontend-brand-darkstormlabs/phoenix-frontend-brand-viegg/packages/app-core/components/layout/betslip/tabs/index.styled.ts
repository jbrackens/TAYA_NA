import styled from "styled-components";
import { Badge } from "antd";

type TabProps = {
  selected: boolean;
  disabled: boolean;
};

export const TabsFullWidth = styled.div`
  width: 100%;
`;

export const Tab = styled.li<TabProps>`
  display: table-cell;
  padding: 10px;
  transition: all 0.5s;
  cursor: pointer;
  margin-bottom: 0px;
  text-align: center;
  cursor: ${(props) => (props.disabled ? "no-drop" : "pointer")};
  color: ${(props) =>
    props.selected
      ? props.theme.betslip.activeTabColor
      : props.theme.betslip.inactiveTabColor};
  &:first-child {
    border-right: 1px solid ${(props) => props.theme.betslip.tabsDividerColor};
  }
`;

export const MainTab = styled(Tab)`
  background-color: ${(props) =>
    props.selected
      ? props.theme.betslip.activeTabBackgroundColor
        ? props.theme.betslip.activeTabBackgroundColor
        : "#1890ff"
      : props.theme.betslip.inactiveTabBackgroundColor};
  border-bottom: 1px solid ${(props) => props.theme.betslip.tabsDividerColor};
`;

export const SecondaryTab = styled(Tab)`
  border-right: 0 !important;
  background-color: ${(props) =>
    props.theme.betslip.secondaryTabsBackgroundColor};
  border-bottom: ${(props) =>
    props.selected
      ? `2px solid ${props.theme.betslip.activeTabBorderBottom}`
      : ""};
`;

export const TabsContainer = styled.ul`
  display: table;
  padding: 0px;
  width: 100%;
  margin-bottom: 0px;
`;

type TabTitleProps = {
  withCloseButton?: boolean;
};

export const TabTitle = styled.span<TabTitleProps>`
  margin-right: 3px;
  margin-left: ${(props) => (props.withCloseButton ? "auto" : "")};
`;

export const TabWithCloseButton = styled.span`
  width: 100%;
  display: flex;
`;

export const StyledBadge = styled(Badge)`
  margin-left: ${(props) => props.theme.baseGutter}px;
  .ant-badge-count {
    box-shadow: none;
  }
  .ant-scroll-number-only-unit {
    color: black !important;
  }
  && > * {
    background-color: ${(props) =>
      props.theme.betslip.tabBadgeBackgroundColor} !important;
  }
`;
