import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledCard = styled.div`
  &.card {
    display: flex;
    flex-direction: column;
    width: fit-content;
    height: fit-content;
    position: relative;
    border-radius: 8px;
    padding: 16px;
  }

  &.default {
    background-color: ${({ theme }) => theme.palette.white};
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.24);
  }

  &.flat {
    background-color: ${({ theme }) => theme.palette.whiteDirty};
    box-shadow: none;
  }
`;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  appearance?: "default" | "flat";
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, appearance = "default", className, ...rest }) => (
  <StyledCard className={cn("card", className, appearance)} {...rest}>
    {children}
  </StyledCard>
);

const StyledCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  & > :last-child {
    margin-top: -4px;
    margin-right: -4px;
  }
`;

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  action?: React.ReactNode;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, action, ...rest }) => (
  <StyledCardHeader {...rest}>
    <div className="text-main-med">{children}</div>
    {action && action}
  </StyledCardHeader>
);

const StyledCardContent = styled.div`
  display: flex;
`;

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardContent: React.FC<CardContentProps> = ({ children, ...rest }) => {
  return <StyledCardContent {...rest}>{children}</StyledCardContent>;
};

export { Card, CardHeader, CardContent };
