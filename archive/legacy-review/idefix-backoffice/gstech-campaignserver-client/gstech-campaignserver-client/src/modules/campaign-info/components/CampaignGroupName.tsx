import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledCampaignGroupName = styled.input`
  height: 48px;
  width: 800px;
  border: none;
  background-color: transparent;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }

  &:disabled {
    color: ${({ theme }) => theme.palette.black};
    cursor: not-allowed;
  }
`;

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  disabledField?: boolean;
}

export const CampaignGroupName: React.FC<Props> = ({ className, value, ...props }) => (
  <StyledCampaignGroupName className={cn(className, "text-header-big")} type="text" value={value} {...props} />
);
