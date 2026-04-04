import { MinusRounded, PlusRounded } from "@brandserver-client/icons";
import cn from "classnames";
import * as React from "react";
import styled from "styled-components";

const StyledOpenCloseIndicator = styled.div`
  line-height: 0;
  transition: all 0.5s;
  transform: rotate(90deg);

  &.open-close-icon--open {
    transform: rotate(0);
  }

  svg {
    width: 20px;
    height: 20px;
    fill: ${({ theme }) => theme.palette.accent};
  }
`;

interface Props {
  isOpen: boolean;
}

const OpenCloseIndicator: React.FC<Props> = ({ isOpen }) => {
  return (
    <StyledOpenCloseIndicator
      className={cn({ "open-close-icon--open": isOpen })}
    >
      {isOpen ? <MinusRounded /> : <PlusRounded />}
    </StyledOpenCloseIndicator>
  );
};

export default OpenCloseIndicator;
