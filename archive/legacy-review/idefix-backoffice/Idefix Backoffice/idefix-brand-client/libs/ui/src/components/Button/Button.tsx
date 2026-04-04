import cn from "classnames";
import React, {
  ButtonHTMLAttributes,
  cloneElement,
  FC,
  isValidElement,
  ReactElement,
  ReactNode
} from "react";
import styled from "styled-components";
import { rgba } from "@brandserver-client/utils";

// TODO: use just union string type instead of enum
enum Color {
  primary = "primary",
  accent = "accent",
  accent2 = "accent2",
  success = "success",
  secondary = "secondary",
  primaryLightest = "primaryLightest",
  primaryLight = "primaryLight",
  primaryLightest2 = "primaryLightest2"
}

enum Size {
  small = "small",
  medium = "medium",
  large = "large"
}

enum Variant {
  text = "text",
  contained = "contained",
  outlined = "outlined"
}

const StyledButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  border: none;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  cursor: pointer;
  position: relative;

  &:disabled {
    box-shadow: none;
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.button--color-${Color.primary} {
    background: ${({ theme }) => theme.palette.primary};
    color: ${({ theme }) => theme.palette.secondaryDarkest};
  }

  &.button--color-${Color.secondary} {
    background: ${({ theme }) => theme.palette.secondarySemiLightest};
    color: ${({ theme }) => theme.palette.secondaryDarkest};
  }

  &.button--color-${Color.secondary}:hover {
    background: ${({ theme }) => theme.palette.secondaryLight};
  }

  &.button--color-${Color.secondary}:active {
    background: ${({ theme }) => theme.palette.secondaryLight};
  }

  &.button--color-${Color.accent} {
    background: ${({ theme }) => theme.palette.accent};
    color: ${({ theme }) => theme.palette.contrast};
  }

  &.button--color-${Color.accent2} {
    background: ${({ theme }) => theme.palette.accent2};
    color: ${({ theme }) => theme.palette.primary};
  }

  &.button--color-${Color.success} {
    background: ${({ theme }) => theme.palette.submit};
    color: ${({ theme }) => theme.palette.contrast};
  }

  &.button--color-${Color.accent}:hover {
    background: ${({ theme }) => theme.palette.accentLight};
  }

  &.button--color-${Color.accent2}:hover {
    background: ${({ theme }) => theme.palette.accent2Light};
  }

  &.button--color-${Color.accent}:active {
    background: ${({ theme }) => theme.palette.accentDark};
  }

  &.button--color-${Color.primaryLightest} {
    background: ${({ theme }) => theme.palette.primaryLightest};
    color: ${({ theme }) => theme.palette.contrastDarkest};
  }

  &.button--color-${Color.primaryLightest}:hover {
    background: ${({ theme }) => theme.palette.primaryLightest2};
  }

  &.button--color-${Color.primaryLightest}:active {
    background: ${({ theme }) => theme.palette.primaryLightest2};
  }

  &.button--color-${Color.primaryLight} {
    background: ${({ theme }) => theme.palette.primaryLight};
    color: ${({ theme }) => theme.palette.contrast};
  }

  &.button--color-${Color.primaryLight}:hover {
    background: ${({ theme }) => rgba(theme.palette.primaryLight, 0.8)};
  }

  &.button--color-${Color.primaryLightest2} {
    background: ${({ theme }) => theme.palette.primaryLightest2};
    color: ${({ theme }) => theme.palette.contrastLight};
  }

  &.button--color-${Color.primaryLightest2}:hover {
    background: ${({ theme }) => theme.palette.primaryLightest};
  }

  &.button--color-${Color.primaryLightest2}:active {
    background: ${({ theme }) => theme.palette.primaryLight};
  }

  /* &.button--color-${Color.accent}:disabled {
    box-shadow: none;
    opacity: 0.5;
    cursor: not-allowed;
  } */

  &.button--size-${Size.small} {
    ${({ theme }) => theme.typography.text16Bold}
    padding: 19px 10px 21px;
    border-radius: 4px;
  }

  &.button--size-${Size.medium} {
    ${({ theme }) => theme.typography.text16Bold}
    padding: 12px 16px;
  }

  &.button--size-${Size.large} {
    ${({ theme }) => theme.typography.text18Bold}
    padding: 16px;
  }

  .button__icon {
    position: absolute;
    right: 20px;
  }
`;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  icon?: ReactNode;
  color?: Color;
  size?: Size;
  variant?: Variant;
  disabled?: boolean;
}

const Button: FC<ButtonProps> & {
  Color: typeof Color;
  Size: typeof Size;
  Variant: typeof Variant;
} = ({
  children,
  icon,
  color = Color.primary,
  size = Size.medium,
  variant = Variant.contained,
  className,
  ...buttonProps
}) => {
  return (
    <StyledButton
      className={cn(
        className,
        `button--color-${color}`,
        `button--size-${size}`,
        `button--variant-${variant}`
      )}
      {...buttonProps}
    >
      {children}
      {icon &&
        isValidElement(icon) &&
        cloneElement(icon as ReactElement, { className: "button__icon" })}
    </StyledButton>
  );
};

Button.Color = Color;
Button.Size = Size;
Button.Variant = Variant;

export { Button, Color, Size, Variant };
