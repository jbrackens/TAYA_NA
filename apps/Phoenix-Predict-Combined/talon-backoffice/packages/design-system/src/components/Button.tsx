import React from 'react';
import styled from 'styled-components';
import { ThemeType } from '../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface StyledButtonProps {
  $variant: ButtonVariant;
  $size: ButtonSize;
}

const getButtonStyles = (variant: ButtonVariant, theme: ThemeType) => {
  switch (variant) {
    case 'primary':
      return `
        background-color: ${theme.colors.accentBlue};
        color: ${theme.colors.text};
        &:hover {
          opacity: 0.9;
        }
        &:active {
          opacity: 0.8;
        }
      `;
    case 'secondary':
      return `
        background-color: ${theme.colors.surface};
        color: ${theme.colors.text};
        border: 1px solid ${theme.colors.border};
        &:hover {
          background-color: ${theme.colors.card};
        }
        &:active {
          background-color: ${theme.colors.card};
          opacity: 0.8;
        }
      `;
    case 'ghost':
      return `
        background-color: transparent;
        color: ${theme.colors.accentBlue};
        &:hover {
          background-color: ${theme.colors.surface};
        }
        &:active {
          opacity: 0.8;
        }
      `;
    case 'danger':
      return `
        background-color: ${theme.colors.error};
        color: ${theme.colors.text};
        &:hover {
          opacity: 0.9;
        }
        &:active {
          opacity: 0.8;
        }
      `;
  }
};

const getSizeStyles = (size: ButtonSize, theme: ThemeType) => {
  switch (size) {
    case 'sm':
      return `
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        font-size: ${theme.typography.small.fontSize};
        line-height: ${theme.typography.small.lineHeight};
        border-radius: ${theme.radius.sm};
      `;
    case 'md':
      return `
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        font-size: ${theme.typography.base.fontSize};
        line-height: ${theme.typography.base.lineHeight};
        border-radius: ${theme.radius.md};
      `;
    case 'lg':
      return `
        padding: ${theme.spacing.md} ${theme.spacing.lg};
        font-size: ${theme.typography.medium.fontSize};
        line-height: ${theme.typography.medium.lineHeight};
        border-radius: ${theme.radius.md};
      `;
  }
};

const StyledButton = styled.button<StyledButtonProps>`
  font-weight: 600;
  transition: all ${({ theme }) => theme.motion.fast};
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  user-select: none;

  ${({ $variant, theme }) => getButtonStyles($variant, theme)}
  ${({ $size, theme }) => getSizeStyles($size, theme)}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accentBlue};
    outline-offset: 2px;
  }
`;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <StyledButton ref={ref} $variant={variant} $size={size} {...props}>
        {children}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
