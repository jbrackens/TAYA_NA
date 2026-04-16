import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

interface StyledSkeletonProps {
  $width?: string | number;
  $height?: string | number;
  $borderRadius?: string;
}

const StyledSkeleton = styled.div<StyledSkeletonProps>`
  width: ${({ $width }) => (typeof $width === 'number' ? `${$width}px` : $width)};
  height: ${({ $height }) => (typeof $height === 'number' ? `${$height}px` : $height)};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.surface} 0%,
    ${({ theme }) => theme.colors.card} 50%,
    ${({ theme }) => theme.colors.surface} 100%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 2s infinite;
  border-radius: ${({ $borderRadius, theme }) => $borderRadius || theme.radius.sm};
`;

interface SkeletonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width = '100%', height = 20, borderRadius, ...props }, ref) => {
    return (
      <StyledSkeleton
        ref={ref}
        $width={width}
        $height={height}
        $borderRadius={borderRadius}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
