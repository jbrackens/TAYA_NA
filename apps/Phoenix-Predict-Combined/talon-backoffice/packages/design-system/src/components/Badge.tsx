import React from 'react';
import styled, { css, keyframes, DefaultTheme } from 'styled-components';

type BadgeVariant = 'live' | 'finished' | 'upcoming' | 'cancelled';

interface StyledBadgeProps {
  $variant: BadgeVariant;
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const getVariantStyles = ($variant: BadgeVariant, theme: DefaultTheme) => {
  switch ($variant) {
    case 'live':
      return css`
        background-color: ${theme.colors.live};
        color: #000;
        animation: ${pulse} ${theme.motion.pulse};
      `;
    case 'finished':
      return css`
        background-color: ${theme.colors.finished};
        color: #fff;
      `;
    case 'upcoming':
      return css`
        background-color: ${theme.colors.upcoming};
        color: ${theme.colors.text};
      `;
    case 'cancelled':
      return css`
        background-color: ${theme.colors.cancelled};
        color: #fff;
      `;
  }
};

const StyledBadge = styled.span<StyledBadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.typography.small.fontSize};
  font-weight: 600;
  line-height: ${({ theme }) => theme.typography.small.lineHeight};
  white-space: nowrap;

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
`;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'upcoming', children, ...props }, ref) => {
    return (
      <StyledBadge ref={ref} $variant={variant} {...props}>
        {children}
      </StyledBadge>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
