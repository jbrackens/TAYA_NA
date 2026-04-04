import React from 'react';
import styled from 'styled-components';

const StyledCard = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing.md};
  transition: all ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.textSecondary};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, ...props }, ref) => {
    return (
      <StyledCard ref={ref} {...props}>
        {children}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

export default Card;
