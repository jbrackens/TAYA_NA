"use client";

import React, { ReactNode, ErrorInfo } from "react";
import styled from "styled-components";

const ErrorContainer = styled.div`
  padding: 24px;
  background-color: var(--surface-1, #ffffff);
  border: 1px solid var(--no, #ff8b6b);
  border-radius: 12px;
  margin: 24px 0;
`;

const ErrorTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: var(--no-text, #a8472d);
  margin: 0 0 12px 0;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: var(--t2, #4a4a4a);
  margin: 0 0 12px 0;
  line-height: 1.6;
`;

const ErrorDetails = styled.pre`
  background-color: var(--surface-2, #fcfaf5);
  border: 1px solid var(--border-1, #e5dfd2);
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--t2, #4a4a4a);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-x: auto;
  margin: 12px 0 0 0;
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    // Log to error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>Oops! Something went wrong</ErrorTitle>
          <ErrorMessage>
            We encountered an unexpected error. Please try again or contact
            support if the problem persists.
          </ErrorMessage>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <ErrorDetails>
              {this.state.error.toString()}
              {"\n\n"}
              {this.state.errorInfo?.componentStack}
            </ErrorDetails>
          )}
          <RetryButton onClick={this.handleRetry}>Try Again</RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
