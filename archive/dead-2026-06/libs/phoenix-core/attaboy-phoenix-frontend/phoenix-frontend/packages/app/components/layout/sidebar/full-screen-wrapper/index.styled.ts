import styled from "styled-components";
import { Layout, Col, Row } from "antd";

type FullScreenBetslipContainerProps = {
  $isCollapsed: boolean;
  $isVisible: number;
  $isMobileFooterVisible: boolean;
};

export const FullScreenBetslipContainer = styled.div<
  FullScreenBetslipContainerProps
>`
  position: fixed;
  top: ${(props) => (props.$isCollapsed ? "0" : "calc(100% - 43px)")};
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 999;
  display: ${(props) => (props.$isVisible ? "" : "none")};
  transition: top 0.3s linear, transform 0.3s linear;
  transform: ${(props) =>
    props.$isMobileFooterVisible && !props.$isCollapsed
      ? "translateY(-60px)"
      : "translateY(0px)"};
`;

type FullScreenLayoutProps = {
  $isCollapsed: boolean;
};

export const FullScreenLayout = styled(Layout)<FullScreenLayoutProps>`
  background-color: ${(props) => props.theme.betslip.backgroundColor};
  color: ${(props) => props.theme.betslip.mobileBetslipTitleColor};
  bottom: ${(props) => (props.$isCollapsed ? "0%" : "-27%")};
  height: 100%;
`;

export const FullScreenBetslipHeader = styled(Col)`
  background-color: ${(props) =>
    props.theme.betslip.mobileBetslipHeaderBackgroundColor};
  text-align: center;
  cursor: pointer;
  display: flex;
  width: 100%;
  padding: ${(props) => props.theme.baseGutter}px;
  font-size: ${(props) => 1.5 * props.theme.baseGutter}px;
  align-items: center;

  .anticon {
    margin-left: auto;
    margin-right: ${(props) => 2 * props.theme.baseGutter}px;
  }
`;

type RowFullHeightProps = {
  $isCollapsed: boolean;
};

export const RowFullHeight = styled(Row)<RowFullHeightProps>`
  height: 100%;
  display: ${(props) => (props.$isCollapsed ? "" : "none")};
`;
