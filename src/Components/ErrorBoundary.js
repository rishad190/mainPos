"use client";

import { Component } from "react";
import { Button } from "@/Components/ui/button";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-semibold mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 text-sm mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button onClick={this.handleRetry} variant="destructive">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
