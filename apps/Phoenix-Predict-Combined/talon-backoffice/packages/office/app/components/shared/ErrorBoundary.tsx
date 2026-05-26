"use client";

import React, { ReactNode, ErrorInfo } from "react";

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

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
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
        <div className="my-6 rounded-xl border border-[var(--no,#ff8b6b)] bg-[var(--surface-1,#ffffff)] p-6">
          <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--no-text,#a8472d)]">
            Oops! Something went wrong
          </h2>
          <p className="m-0 mb-3 text-sm leading-[1.6] text-[var(--t2,#4a4a4a)]">
            We encountered an unexpected error. Please try again or contact
            support if the problem persists.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="m-0 mt-3 overflow-x-auto rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] p-3 font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-xs text-[var(--t2,#4a4a4a)]">
              {this.state.error.toString()}
              {"\n\n"}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          <button
            className="mt-3 cursor-pointer rounded-lg border-0 bg-[var(--accent,#2be480)] px-4 py-2 font-semibold text-[#003827] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--accent-lo,#1fa65e)] hover:text-white"
            onClick={this.handleRetry}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
