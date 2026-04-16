'use client';

import styled from 'styled-components';

const ErrorContainer = styled.div`
  padding: 40px 24px;
  text-align: center;
  background-color: #1a1f3a;
  border-radius: 8px;
  border: 1px solid #d32f2f;
`;

const ErrorIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const ErrorTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #ff6b6b;
  margin: 0 0 12px 0;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: #a0a0a0;
  margin: 0 0 24px 0;
  line-height: 1.6;
`;

const RetryButton = styled.button`
  padding: 8px 16px;
  background-color: #4a7eff;
  color: #0b0e1c;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background-color: #6593ff;
    transform: translateY(-2px);
  }
`;

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An error occurred while fetching the data. Please try again.',
  onRetry,
  showRetryButton = true,
}: ErrorStateProps) {
  return (
    <ErrorContainer>
      <ErrorIcon>⚠️</ErrorIcon>
      <ErrorTitle>{title}</ErrorTitle>
      <ErrorMessage>{message}</ErrorMessage>
      {showRetryButton && onRetry && (
        <RetryButton onClick={onRetry}>Try Again</RetryButton>
      )}
    </ErrorContainer>
  );
}

export default ErrorState;
