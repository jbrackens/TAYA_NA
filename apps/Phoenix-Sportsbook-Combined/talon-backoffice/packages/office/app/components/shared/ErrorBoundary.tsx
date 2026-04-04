'use client';

import React, { ReactNode, ErrorInfo } from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  padding: 24px;
  background-color: #1a1a2e;
  border: 1px solid #d32f2f;
  border-radius: 8px;
  margin: 24px 0;
`;

const ErrorTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #ff6b6b;
  margin: 0 0 12px 0;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: #a0a0a0;
  margin: 0 0 12px 0;
  line-height: 1.6;
`;

const ErrorDetails = styled.pre`
  background-color: #0f3460;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #a0a0a0;
  overflow-x: auto;
  margin: 12px 0 0 0;
`;

const RetryButton = styled.button`
  padding: 8px 16px;
  background-color: #4a7eff;
  color: #1a1a2e;
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
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
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </ErrorMessage>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>
              {this.state.error.toString()}
              {'\n\n'}
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
