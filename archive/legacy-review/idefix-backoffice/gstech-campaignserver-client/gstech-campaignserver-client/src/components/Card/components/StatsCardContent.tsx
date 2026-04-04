import * as React from "react";
import styled from "styled-components";

const StyledCard = styled.div`
  .stats-card__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 224px;
    &:not(:first-child) {
      margin-top: 8px;
    }
    .row__dotsline {
      bottom: 3px;
    }
    .row__title {
      padding-right: 4px;
      white-space: nowrap;
      color: ${({ theme }) => theme.palette.blackDark};
    }
    .row__value {
      display: flex;
      padding-left: 4px;
      white-space: nowrap;
      color: ${({ theme }) => theme.palette.blackDark};
    }
    .row__subvalue {
      margin-right: 8px;
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
    .row__dots-line {
      overflow: hidden;
      color: ${({ theme }) => theme.palette.blackLight};
    }
  }
`;

interface StatsCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  stats: {
    title: string;
    value: string | number;
    subvalue?: string | number;
    withCurrencySymbol?: boolean;
  }[];
}

const StatsCardContent: React.FC<StatsCardContentProps> = ({ stats, ...rest }: StatsCardContentProps) => (
  <StyledCard {...rest}>
    {stats.map(({ title, value, subvalue, withCurrencySymbol }) => {
      const formattedValue = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      return (
        <div className="stats-card__row" key={title}>
          <div className="row__title text-small-reg">
            <span>{title}</span>
          </div>
          <span className="row__dots-line">........................................................</span>
          <div className="row__value text-small-med">
            {subvalue && (
              <div className="row__subvalue text-small-reg">
                <span>{`${subvalue}%`}</span>
              </div>
            )}
            <span>{withCurrencySymbol ? `€${formattedValue}` : formattedValue}</span>
          </div>
        </div>
      );
    })}
  </StyledCard>
);

export { StatsCardContent };
