import React, { FC } from "react";
import styled from "styled-components";
import { CheckIcon } from "@brandserver-client/icons";

const StyledFieldSuccess = styled.div`
  display: flex;
  align-items: center;
  border-radius: 2px;
  color: ${({ theme }) => theme.palette.successDark};
  fill: ${({ theme }) => theme.palette.successDark};
  background: ${({ theme }) => theme.palette.contrast};

  ${({ theme }) => theme.typography.text12}

  &::before {
    content: "";
    width: 10px;
    height: 20px;
    border-radius: 2px 0 0 2px;
    background: ${({ theme }) => theme.palette.success};
  }

  .field-success__icon {
    width: 10px;
    height: 10px;
    margin-left: 5px;
  }

  .field-success__text {
    margin-left: 5px;
  }
`;

export interface FieldSuccessProps {
  children: React.ReactElement | string;
  className?: string;
}

const FieldSuccess: FC<FieldSuccessProps> = ({ className, children }) => {
  return (
    <StyledFieldSuccess className={className}>
      <CheckIcon className="field-success__icon" />
      <div className="field-success__text">{children}</div>
    </StyledFieldSuccess>
  );
};

export { FieldSuccess };
