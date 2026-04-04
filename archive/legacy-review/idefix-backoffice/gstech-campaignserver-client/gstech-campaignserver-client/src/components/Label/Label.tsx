import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

import { Close } from "../../icons";

const StyledLabel = styled.div`
  display: inline-flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;

  &.with-icon {
    padding: 0 0 0 8px;
  }

  .icon-wrapper {
    display: flex;
    margin-left: 4px;
    padding: 4px;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      background-color: ${({ theme }) => theme.palette.whiteDirty};
    }
  }

  &.label--color--blue {
    background-color: ${({ theme }) => theme.palette.blueLight};

    .label {
      color: ${({ theme }) => theme.palette.blue};
    }

    .icon {
      fill: ${({ theme }) => theme.palette.blue};
    }
  }

  &.label--color--green {
    background-color: ${({ theme }) => theme.palette.tealLight};

    .label {
      color: ${({ theme }) => theme.palette.teal};
    }

    .icon {
      fill: ${({ theme }) => theme.palette.teal};
    }
  }

  &.label--color--gray {
    background-color: ${({ theme }) => theme.palette.whiteDirty};

    .label {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }

    .icon {
      fill: ${({ theme }) => theme.palette.blackMiddle};
    }
  }

  &.label--color--black {
    background-color: ${({ theme }) => theme.palette.whiteDirty};

    .label {
      color: ${({ theme }) => theme.palette.black};
    }

    .icon {
      fill: ${({ theme }) => theme.palette.black};
    }
  }

  &.label--color--orange {
    background-color: ${({ theme }) => theme.palette.orangeLight};

    .label {
      color: ${({ theme }) => theme.palette.orange};
    }

    .icon {
      fill: ${({ theme }) => theme.palette.orange};
    }
  }
`;

export interface LabelProps {
  className?: string;
  children: React.ReactNode;
  color?: "blue" | "green" | "gray" | "black" | "orange";
  onClose?: () => void;
}

const Label: React.FC<LabelProps> = ({ className, children, onClose, color = "blue" }) => (
  <StyledLabel className={cn(className, `label--color--${color}`, "text-main-med", { "with-icon": !!onClose })}>
    <span className="label">{children}</span>
    {onClose && (
      <div className="icon-wrapper" onClick={() => onClose()}>
        <Close className="icon" />
      </div>
    )}
  </StyledLabel>
);

export { Label };
