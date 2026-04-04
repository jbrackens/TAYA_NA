import styled from "styled-components";
import { Col, Row } from "antd";

type ButtonColumnProps = {
  $isSelected?: boolean;
};

export const ButtonColumn = styled(Col)<ButtonColumnProps>`
  height: ${(props) => 6 * props.theme.baseGutter}px;
  display: flex;
  justify-content: center;
  border-right: 1px solid var(--sb-border);
  border-top: 2px solid
    ${(props) => (props.$isSelected ? "var(--sb-accent-cyan)" : "var(--sb-border)")};
  text-align: center;
  cursor: pointer;
  color: ${(props) =>
    props.$isSelected ? "var(--sb-text-primary)" : "var(--sb-text-secondary)"};
  font-size: 11px;
  transition: all 150ms ease;

  &:hover {
    color: var(--sb-text-primary);
    background: var(--sb-bg-elevated);
  }

  svg {
    margin-top: 4px;
  }
`;

type RowContainerProps = {
  $isVisible: boolean;
};

export const RowContainer = styled(Row)<RowContainerProps>`
  background-color: var(--sb-bg-base) !important;
  color: var(--sb-text-secondary) !important;
  @media (max-width: 768px) {
    display: flex;
    transform: ${(props) =>
      props.$isVisible ? "translatey(0)" : "translatey(100%)"};
  }
  display: none;
  transform: translateY(0);
  transition: transform 0.4s;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 100vw;
  justify-content: space-around;
  align-items: center;
  z-index: 120;
  background-color: var(--sb-bg-base);
`;
