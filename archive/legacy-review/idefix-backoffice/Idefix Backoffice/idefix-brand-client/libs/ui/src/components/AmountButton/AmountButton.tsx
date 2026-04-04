import * as React from "react";
import cn from "classnames";
import styled from "styled-components";

const StyledAmountButton = styled.button`
  ${({ theme }) => theme.typography.text14Bold}
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.palette.secondaryLightest};
  cursor: pointer;

  &:hover,
  &.amount-button__active {
    background: ${({ theme }) => theme.palette.accent};
    color: ${({ theme }) => theme.palette.contrast};
  }
`;

export interface AmountButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const AmountButton: React.FC<AmountButtonProps> = ({
  children,
  active,
  onClick,
  className
}) => {
  return (
    <StyledAmountButton
      className={cn(className, { "amount-button__active": active })}
      onClick={onClick}
      type="button"
    >
      {children}
    </StyledAmountButton>
  );
};

export { AmountButton };
