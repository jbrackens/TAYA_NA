"use client";

import styled from "styled-components";

const ErrorContainer = styled.div`
  padding: 40px 24px;
  text-align: center;
  background-color: var(--surface-1, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--no, #ff8b6b);
`;

const ErrorIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const ErrorTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--no-text, #a8472d);
  margin: 0 0 12px 0;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: var(--t2, #4a4a4a);
  margin: 0 0 24px 0;
  line-height: 1.6;
`;

const RetryButton = styled.button`
  padding: 8px 16px;
  background-color: var(--accent, #2be480);
  color: #003827;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--accent-lo, #1fa65e);
    color: #ffffff;
    transform: translateY(-1px);
  }
`;

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while fetching the data. Please try again.",
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
