import * as React from "react";
import styled from "styled-components";

import { Forward } from "../../../icons";

const StyledCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 400px;

  .info {
    color: ${({ theme }) => theme.palette.blackDark};
    margin-top: 2px;
  }

  .preview-button {
    display: flex;
    align-items: center;
    margin-top: 10px;
    cursor: pointer;

    & > span {
      color: ${({ theme }) => theme.palette.black9e};
    }

    & > svg {
      margin-left: 4px;
      fill: ${({ theme }) => theme.palette.black9e};
    }

    &:hover {
      & > span {
        color: ${({ theme }) => theme.palette.blackDark};
      }
      & > svg {
        fill: ${({ theme }) => theme.palette.blackDark};
      }
    }
  }
`;

interface PreviewCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  info: string;
  previewButton?: boolean;
  onPreviewClick?: () => void;
}

const PreviewCardContent: React.FC<PreviewCardContentProps> = ({
  info,
  previewButton,
  onPreviewClick,
  ...rest
}: PreviewCardContentProps) => (
  <StyledCard {...rest}>
    <div className="info text-small-reg">{info}</div>
    {previewButton && (
      <div className="preview-button" onClick={onPreviewClick}>
        <span className="text-small-reg">Preview</span>
        <Forward />
      </div>
    )}
  </StyledCard>
);

export { PreviewCardContent };
