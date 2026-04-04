import React, { FC } from "react";
import { Breakpoints } from "../../breakpoints";
import styled from "styled-components";

const StyledCard = styled.div`
  position: relative;
  padding: 30px 44px 44px 44px;
  box-sizing: border-box;
  border-radius: ${({ theme }) => theme.shape.borderRadiusBig};
  background: ${({ theme }) => theme.palette.primaryLight};
  color: ${({ theme }) => theme.palette.contrastLight};

  & * {
    box-sizing: border-box;
  }

  /*
    Remove right side border radius when Card isn't the last child.
    What means that there is an element displayed next to Card.
   */
  &:not(:last-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding: 14px 25px 5px 21px;
  }
`;

export interface CardProps {
  children: React.ReactElement;
  className?: string;
}

const Card: FC<CardProps> = ({ className, children }) => {
  return <StyledCard className={className}>{children}</StyledCard>;
};

export { Card };
