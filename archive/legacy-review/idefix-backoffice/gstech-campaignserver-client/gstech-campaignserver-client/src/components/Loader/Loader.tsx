import * as React from "react";
import styled, { keyframes } from "styled-components";
import cn from "classnames";

const motion = keyframes`
  0% {
      transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const StyledLoaderWrapper = styled.div`
  display: inline-block;
  position: relative;
  width: 100%;
  height: 100%;

  &.wrapped {
    width: 50px;
    height: 50px;
    margin: 0 auto;
  }

  .loader-wrapper__loader {
    box-sizing: border-box;
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    margin: 2px;
    border: 2px solid ${({ theme }) => theme.palette.blackMiddle};
    border-radius: 50%;
    animation: ${motion} 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    border-color: ${({ theme }) => theme.palette.blackMiddle} transparent transparent transparent;

    :nth-child(1) {
      animation-delay: -0.45s;
    }

    :nth-child(2) {
      animation-delay: -0.3s;
    }

    :nth-child(3) {
      animation-delay: -0.15s;
    }
  }
`;

interface Props {
  className?: string;
  wrapped?: boolean;
}

const Loader: React.FC<Props> = ({ className, wrapped }) => (
  <StyledLoaderWrapper className={cn(className, { wrapped })}>
    <div className="loader-wrapper__loader" />
  </StyledLoaderWrapper>
);

export { Loader };
