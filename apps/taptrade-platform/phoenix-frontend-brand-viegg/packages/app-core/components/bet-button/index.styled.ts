import styled from "styled-components";
import { Button } from "antd";

type ArrowProps = {
  hidden: boolean;
};

export const ArrowUp = styled.span<ArrowProps>`
  position: absolute;
  top: 9px;
  right: 8px;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 6px solid var(--color-odds-up);
  opacity: ${({ hidden }) => (hidden ? 0 : 1)};
  transition: opacity var(--duration-flash) var(--ease-standard);
`;

export const ArrowDown = styled.span<ArrowProps>`
  position: absolute;
  bottom: 9px;
  right: 8px;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 6px solid var(--color-odds-down);
  opacity: ${({ hidden }) => (hidden ? 0 : 1)};
  transition: opacity var(--duration-flash) var(--ease-standard);
`;

type BetButtonProps = {
  $ishighlighted: boolean;
  $flashDirection?: "up" | "down" | null;
};

const resolveFlashBackground = (props: BetButtonProps) => {
  if (props.$ishighlighted) {
    return "var(--color-accent-muted)";
  }
  if (props.$flashDirection === "up") {
    return "rgba(0, 231, 0, 0.14)";
  }
  if (props.$flashDirection === "down") {
    return "rgba(231, 51, 42, 0.14)";
  }
  return "rgba(19, 32, 48, 0.92)";
};

const resolveFlashBorder = (props: BetButtonProps) => {
  if (props.$ishighlighted) {
    return "var(--color-accent)";
  }
  if (props.$flashDirection === "up") {
    return "rgba(0, 231, 0, 0.38)";
  }
  if (props.$flashDirection === "down") {
    return "rgba(231, 51, 42, 0.34)";
  }
  return "rgba(99, 120, 136, 0.22)";
};

export const BetButton = styled(Button)<BetButtonProps>`
  width: 100%;
  min-width: 72px;
  height: 36px;
  padding: 0 10px !important;
  border-radius: var(--radius-sm);
  border: 1px solid ${(props) => resolveFlashBorder(props)} !important;
  background: ${(props) => resolveFlashBackground(props)} !important;
  color: ${(props) =>
    props.$ishighlighted ? "var(--color-accent)" : "#ffffff"} !important;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  transition:
    background var(--duration-flash) var(--ease-standard),
    border-color var(--duration-flash) var(--ease-standard),
    transform var(--duration-transition) var(--ease-standard);

  &:hover,
  &:focus,
  &:active {
    color: ${(props) =>
      props.$ishighlighted ? "var(--color-accent)" : "#ffffff"} !important;
    border-color: ${(props) => resolveFlashBorder(props)} !important;
    background: ${(props) =>
      props.$ishighlighted
        ? "var(--color-accent-muted)"
        : "rgba(26, 48, 71, 0.98)"} !important;
    transform: scale(1.02);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    color: var(--color-neutral) !important;
    background: rgba(19, 32, 48, 0.9) !important;
  }

  div {
    position: relative;
    width: 100%;
    padding-right: 0;
  }
`;

export const SelectionName = styled.div`
  color: var(--color-neutral);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

export const OddsValueContainer = styled.div`
  display: block;
  margin-top: 2px;
  color: inherit;
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.15;
`;
