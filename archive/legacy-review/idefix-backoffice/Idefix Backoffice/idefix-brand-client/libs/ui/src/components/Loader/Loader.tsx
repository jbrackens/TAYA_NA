import * as React from "react";
import styled from "styled-components";

const StyledLoaderWrap = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  .loader-wrap__loader {
    border: 4px solid ${({ theme }) => theme.palette.secondaryLight};
    border-top: 4px solid ${({ theme }) => theme.palette.accent};
    border-radius: 50%;
    max-width: 116px;
    max-height: 118px;
    width: 100%;
    height: 100%;
    animation: spin 2s linear infinite;

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  }
`;

export interface LoaderProps {
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ className }) => {
  return (
    <StyledLoaderWrap className={className}>
      <div className="loader-wrap__loader" />
    </StyledLoaderWrap>
  );
};

export { Loader };
