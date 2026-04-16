import styled from "styled-components";
import { Badge } from "antd";
import { CloseOutlined } from "@ant-design/icons";

type TabProps = {
  selected: boolean;
  disabled: boolean;
};

type TabPanelProps = {
  $active: boolean;
};

export const TabsFullWidth = styled.div`
  width: 100%;
`;

export const TabsContainer = styled.ul`
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  background: rgba(15, 31, 42, 0.98);
  border-bottom: 1px solid rgba(99, 120, 136, 0.18);
`;

const BaseTab = styled.li<TabProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--space-3);
  margin: 0;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  color: ${(props) =>
    props.selected ? "#ffffff" : "var(--color-neutral)"};
  opacity: ${(props) => (props.disabled ? 0.45 : 1)};
  transition: all var(--duration-transition) var(--ease-standard);
  user-select: none;

  &:hover {
    color: ${(props) => (props.disabled ? "var(--color-neutral)" : "#ffffff")};
  }
`;

export const MainTab = styled(BaseTab)`
  flex: 1 1 0;
  background: ${(props) =>
    props.selected ? "rgba(33, 55, 67, 0.82)" : "transparent"};
  border-bottom: 2px solid
    ${(props) => (props.selected ? "var(--color-accent)" : "transparent")};
`;

export const SecondaryTab = styled(BaseTab)`
  flex: 1 1 0;
  min-height: 40px;
  background: ${(props) =>
    props.selected ? "rgba(33, 55, 67, 0.84)" : "rgba(15, 31, 42, 0.9)"};
  border-bottom: 2px solid
    ${(props) => (props.selected ? "var(--color-accent)" : "transparent")};
`;

export const TabTitle = styled.span<{ withCloseButton?: boolean }>`
  margin-left: ${(props) => (props.withCloseButton ? "auto" : "0")};
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const TabWithCloseButton = styled.span`
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
`;

export const CloseIconButton = styled(CloseOutlined)`
  margin-left: auto;
  color: var(--color-muted);
  transition: color var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
  }
`;

export const StyledBadge = styled(Badge)`
  margin-left: var(--space-2);

  .ant-badge-count {
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    padding: 0 6px;
    box-shadow: none;
    border-radius: var(--radius-pill);
    background: var(--color-accent);
    color: #0f1f2a !important;
    font-size: 10px;
    font-weight: 800;
  }
`;

export const TabPanel = styled.div<TabPanelProps>`
  display: ${(props) => (props.$active ? "block" : "none")};
`;
