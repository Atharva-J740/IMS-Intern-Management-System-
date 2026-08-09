import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 m-10 border-2 border-red-500 bg-red-50 rounded-lg text-red-900">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="font-mono text-sm">{this.state.errorMsg}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
