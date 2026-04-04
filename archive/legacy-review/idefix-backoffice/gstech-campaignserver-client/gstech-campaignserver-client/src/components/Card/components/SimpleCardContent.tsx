import * as React from "react";
import styled from "styled-components";

const StyledCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 128px;

  .simple-card__text-block {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
    align-items: flex-start;
    overflow-y: hidden;
  }

  .simple-card__title {
    color: ${({ theme }) => theme.palette.blackDark};
  }
  .simple-card__subtitle {
    color: ${({ theme }) => theme.palette.black};
  }
`;

interface SimpleCardContentProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const SimpleCardContent: React.FC<SimpleCardContentProps> = ({ title, children, icon, ...rest }) => (
  <StyledCard {...rest}>
    <div className="simple-card__text-block">
      <span className="simple-card__title text-small-reg">{title}</span>
      <span className="simple-card__subtitle text-header-small">{children}</span>
    </div>
    {icon && icon}
  </StyledCard>
);

export { SimpleCardContent };
