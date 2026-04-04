import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

import { Arrow } from "../../icons";

const StyledExpander = styled.div`
  .title {
    display: flex;
    align-items: center;
    width: max-content;
    cursor: pointer;

    &__icon {
      margin-left: 4px;
      fill: ${({ theme }) => theme.palette.blackMiddle};
      transition: 0.2s;

      &--opened {
        transform: rotate(180deg);
      }
    }
  }

  .content {
    margin-top: 16px;

    & > :first-child {
      animation: opacity 0.2s;
    }
  }

  @keyframes opacity {
    0% {
      transform: translateY(-40px);
      opacity: 0;
    }
    100% {
      transform: translateY(0px);
      opacity: 1;
    }
  }
`;

interface IProps {
  isOpen: boolean;
  text: string;
  children: React.ReactNode;
  className?: string;
  onChange: () => void;
}

const Expander: React.FC<IProps> = ({ isOpen, text, className, onChange, children }) => (
  <StyledExpander className={className}>
    <div className="title" onClick={onChange}>
      <span className="text-header">{text}</span>
      <Arrow className={cn("title__icon", { "title__icon--opened": isOpen })} />
    </div>
    {isOpen && <div className="content">{children}</div>}
  </StyledExpander>
);

export { Expander };
