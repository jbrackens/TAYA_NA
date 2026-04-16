import styled from "styled-components";
import { Layout, Col, Row } from "antd";

type FullScreenBetslipContainerProps = {
  $isCollapsed: boolean;
  $isVisible: number;
  $isMobileFooterVisible: boolean;
};

export const FullScreenBetslipContainer = styled.div<FullScreenBetslipContainerProps>`
  position: fixed;
  inset: 0;
  z-index: 140;
  display: ${(props) => (props.$isVisible ? "block" : "none")};
  pointer-events: ${(props) => (props.$isCollapsed ? "all" : "none")};
  background: ${(props) =>
    props.$isCollapsed ? "rgba(0, 0, 0, 0.55)" : "transparent"};
  transition: background 0.2s ease;

  @media (min-width: 1200px) {
    display: none;
  }
`;

type FullScreenLayoutProps = {
  $isCollapsed: boolean;
};

export const FullScreenLayout = styled(Layout)<FullScreenLayoutProps>`
  background-color: var(--sb-bg-base);
  color: var(--sb-text-primary);
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: min(82vh, 640px);
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  border-top: 1px solid var(--sb-border);
  transform: ${(props) =>
    props.$isCollapsed ? "translateY(0)" : "translateY(100%)"};
  transition: transform 0.28s ease;
  overflow: hidden;
`;

export const FullScreenBetslipHeader = styled(Col)`
  background-color: var(--sb-bg-surface);
  text-align: center;
  display: flex;
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 600;
  align-items: center;
  color: var(--sb-text-primary);
  border-bottom: 1px solid var(--sb-border);

  .anticon {
    margin-left: auto;
    margin-right: 4px;
    cursor: pointer;
    color: var(--sb-text-secondary);
  }
`;

type RowFullHeightProps = {
  $isCollapsed: boolean;
};

export const RowFullHeight = styled(Row)<RowFullHeightProps>`
  height: calc(100% - 50px);
  display: ${(props) => (props.$isCollapsed ? "" : "none")};
`;

export const BetslipTrigger = styled.button`
  position: fixed;
  right: 16px;
  bottom: 16px;
  height: 46px;
  min-width: 46px;
  padding: 0 14px;
  border: 1px solid var(--sb-border);
  border-radius: 999px;
  background: var(--sb-accent-cyan);
  color: #000000;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  z-index: 141;
  transition: all 150ms ease;

  @media (min-width: 1200px) {
    display: none;
  }

  &:hover {
    filter: brightness(1.08);
  }
`;
