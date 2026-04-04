'use client';

import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const SpinnerContainer = styled.div<{ $centered?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  ${props => props.$centered ? 'min-height: 400px;' : ''}
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #0f3460;
  border-top-color: #4a7eff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.p`
  margin: 12px 0 0 0;
  font-size: 14px;
  color: #a0a0a0;
  text-align: center;
`;

interface LoadingSpinnerProps {
  centered?: boolean;
  text?: string;
}

export function LoadingSpinner({ centered = true, text = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <SpinnerContainer $centered={centered}>
      <div>
        <Spinner />
        {text && <LoadingText>{text}</LoadingText>}
      </div>
    </SpinnerContainer>
  );
}

// Skeleton for list items
const SkeletonLine = styled.div`
  height: 16px;
  background: linear-gradient(90deg, #0f3460 25%, #16213e 50%, #0f3460 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  margin-bottom: 12px;
  animation: ${pulse} 1.5s ease-in-out infinite;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SkeletonCard = styled.div`
  padding: 16px;
  background-color: #0f3460;
  border-radius: 8px;
  margin-bottom: 12px;
`;

interface SkeletonProps {
  count?: number;
}

export function SkeletonLoader({ count = 3 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <SkeletonLine style={{ width: '80%' }} />
          <SkeletonLine style={{ width: '60%' }} />
          <SkeletonLine style={{ width: '70%' }} />
        </SkeletonCard>
      ))}
    </>
  );
}

export default LoadingSpinner;
