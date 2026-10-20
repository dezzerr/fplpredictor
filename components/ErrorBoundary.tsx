"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Use compact mode for inline components */
  compact?: boolean;
  /** Component name for error logging */
  name?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.name || "Unknown";
    console.error(`ErrorBoundary [${componentName}] caught an error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Compact fallback for inline components
      if (this.props.compact) {
        return (
          <div className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {this.props.name ? `${this.props.name} failed to load` : "Failed to load"}
            </span>
            <Button onClick={this.handleReset} variant="ghost" size="sm" className="h-6 px-2">
              <RefreshCcw className="h-3 w-3" />
            </Button>
          </div>
        );
      }

      // Full fallback for page-level errors
      return (
        <Card className="p-6 m-4">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <Button onClick={this.handleReset} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    compact?: boolean;
    name?: string;
  }
) {
  const displayName = options?.name || Component.displayName || Component.name || "Component";
  
  function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary 
        fallback={options?.fallback} 
        compact={options?.compact}
        name={displayName}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  
  WithErrorBoundaryWrapper.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundaryWrapper;
}
