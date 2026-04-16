import React from 'react';
import styled from 'styled-components';

interface StyledOddsButtonProps {
  $selected?: boolean;
  $suspended?: boolean;
}

const StyledOddsButton = styled.button<StyledOddsButtonProps>`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accentBlue : theme.colors.surface};
  border: 2px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.accentBlue : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.fast};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 80px;

  ${({ $suspended }) =>
    $suspended &&
    `
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  `}

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.accentBlue};
    background-color: ${({ theme, $selected }) =>
      $selected ? theme.colors.accentBlue : theme.colors.card};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
  }
`;

const OddsValue = styled.span`
  font-weight: 700;
  font-size: ${({ theme }) => theme.typography.large.fontSize};
`;

const MovementIndicator = styled.span<{ $direction: 'up' | 'down' }>`
  font-size: ${({ theme }) => theme.typography.small.fontSize};
  color: ${({ $direction, theme }) =>
    $direction === 'up' ? theme.colors.accentGreen : theme.colors.error};
`;

interface OddsButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  odds: number;
  selected?: boolean;
  suspended?: boolean;
  movement?: 'up' | 'down' | null;
}

export const OddsButton = React.forwardRef<HTMLButtonElement, OddsButtonProps>(
  ({ odds, selected = false, suspended = false, movement, ...props }, ref) => {
    const getMovementSymbol = () => {
      if (!movement) return null;
      return movement === 'up' ? '↑' : '↓';
    };

    return (
      <StyledOddsButton ref={ref} $selected={selected} $suspended={suspended} {...props}>
        <OddsValue>{odds.toFixed(2)}</OddsValue>
        {movement && <MovementIndicator $direction={movement}>{getMovementSymbol()}</MovementIndicator>}
      </StyledOddsButton>
    );
  }
);

OddsButton.displayName = 'OddsButton';

export default OddsButton;
