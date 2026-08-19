import { Component, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg mb-2">出错了</p>
            <p className="text-sm text-muted-foreground mb-4">{this.state.error.message}</p>
            <Button onClick={this.reset}>重试</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
