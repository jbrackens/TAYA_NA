import * as React from "react";
import styled from "styled-components";

interface IPickersWrapper {
  text: string;
  children: React.ReactNode;
  isOptional?: boolean;
}

const StyledPickersWrapper = styled.div`
  .time-block {
    display: flex;
    flex-direction: column;
  }

  .time-block__title {
    color: ${({ theme }) => theme.palette.blackDark};

    & > span {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }

  .time-block__pickers {
    margin-top: 8px;
  }
`;

const PickersWrapper: React.FC<IPickersWrapper> = ({ text, isOptional, children }) => (
  <StyledPickersWrapper>
    <div className="time-block">
      <p className="time-block__title text-main-reg">
        {text} {isOptional && <span>(optional)</span>}
      </p>
      <div className="time-block__pickers">{children}</div>
    </div>
  </StyledPickersWrapper>
);

export { PickersWrapper };
