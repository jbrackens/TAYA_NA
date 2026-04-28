"use client";

import styled from "styled-components";

// Reusable Card component — P8 cream surface
export const Card = styled.div`
  padding: 20px;
  background-color: var(--surface-1, #ffffff);
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 12px;
`;

// Reusable Badge component — semantic status colors mapped to P8
export const Badge = styled.span<{
  $variant?: "default" | "success" | "warning" | "danger";
}>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background-color: ${(props) => {
    switch (props.$variant) {
      case "success":
        return "var(--yes-soft, rgba(113, 238, 184, 0.18))";
      case "warning":
        return "rgba(217, 119, 6, 0.12)";
      case "danger":
        return "var(--no-soft, rgba(255, 139, 107, 0.16))";
      default:
        return "var(--accent-soft, rgba(43, 228, 128, 0.14))";
    }
  }};
  color: ${(props) => {
    switch (props.$variant) {
      case "success":
        return "var(--yes-text, #1a6849)";
      case "warning":
        return "var(--warn, #d97706)";
      case "danger":
        return "var(--no-text, #a8472d)";
      default:
        return "var(--focus-ring, #0e7a53)";
    }
  }};
  border: 1px solid
    ${(props) => {
      switch (props.$variant) {
        case "success":
          return "var(--yes, #71eeb8)";
        case "warning":
          return "rgba(217, 119, 6, 0.4)";
        case "danger":
          return "var(--no, #ff8b6b)";
        default:
          return "var(--accent, #2be480)";
      }
    }};
`;

// Reusable Button component — P8 mint primary, secondary white card, ghost danger
export const Button = styled.button<{
  $variant?: "primary" | "secondary" | "danger";
  $size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}>`
  padding: ${(props) => {
    const sz = props.$size || props.size;
    switch (sz) {
      case "sm":
        return "6px 12px";
      case "lg":
        return "12px 24px";
      default:
        return "10px 20px";
    }
  }};
  background: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case "secondary":
        return "var(--surface-1, #ffffff)";
      case "danger":
        return "transparent";
      default:
        return "var(--accent, #2be480)";
    }
  }};
  color: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case "secondary":
        return "var(--t1, #1a1a1a)";
      case "danger":
        return "var(--no-text, #a8472d)";
      default:
        return "#003827";
    }
  }};
  border: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case "secondary":
        return "1px solid var(--border-1, #e5dfd2)";
      case "danger":
        return "1.5px solid var(--no, #ff8b6b)";
      default:
        return "none";
    }
  }};
  border-radius: 8px;
  cursor: pointer;
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: ${(props) => {
    const sz = props.$size || props.size;
    return sz === "sm" ? "12px" : "14px";
  }};
  transition: all 0.15s ease;
  box-shadow: ${(props) => {
    const variant = props.$variant || props.variant;
    return variant === "primary" || !variant
      ? "0 4px 12px rgba(43, 228, 128, 0.18)"
      : "none";
  }};

  &:hover:not(:disabled) {
    ${(props) => {
      const variant = props.$variant || props.variant;
      switch (variant) {
        case "secondary":
          return "background-color: var(--surface-2, #fcfaf5); border-color: var(--focus-ring, #0e7a53); color: var(--focus-ring, #0e7a53);";
        case "danger":
          return "background: var(--no-soft, rgba(255, 139, 107, 0.16));";
        default:
          return "background: var(--accent-lo, #1fa65e); color: #ffffff; box-shadow: 0 6px 18px rgba(43, 228, 128, 0.25);";
      }
    }}
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Reusable Input component — P8 form styling
export const Input = styled.input`
  padding: 10px 14px;
  background-color: var(--surface-1, #ffffff);
  border: 1px solid var(--border-1, #e5dfd2);
  color: var(--t1, #1a1a1a);
  border-radius: 8px;
  font-size: 14px;
  font-family: "Inter", sans-serif;
  height: 40px;
  transition: all 0.15s ease;

  &::placeholder {
    color: var(--t3, #8b8378);
  }

  &:focus {
    outline: none;
    border-color: var(--focus-ring, #0e7a53);
    box-shadow: 0 0 0 3px var(--accent-soft, rgba(43, 228, 128, 0.14));
  }
`;
