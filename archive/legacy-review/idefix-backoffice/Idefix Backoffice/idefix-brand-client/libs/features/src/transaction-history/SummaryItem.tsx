import * as React from "react";
import styled from "styled-components";

const StyledSummaryItem = styled.div`
  padding: 24px 12px;
  border-radius: 10px;

  .summary-item {
    &__icon {
      svg {
        width: 48px;
        height: 48px;
      }
    }

    &__title {
      margin: 9px 0 0 0;
      ${({ theme }) => theme.typography.text16};
    }

    &__value {
      margin-top: 9px;
      ${({ theme }) => theme.typography.text24Bold};
    }
  }
`;

interface IProps {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  className?: string;
}

const SummaryItem: React.FC<IProps> = ({ icon, title, content, className }) => {
  return (
    <StyledSummaryItem className={className}>
      <span className="summary-item__icon">{icon}</span>
      <h4 className="summary-item__title">{title}</h4>
      <div className="summary-item__value">{content}</div>
    </StyledSummaryItem>
  );
};

export default SummaryItem;
