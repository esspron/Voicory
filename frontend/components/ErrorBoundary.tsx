import { Warning } from '@phosphor-icons/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public override state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public override render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Warning size={32} weight="duotone" className="text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-textMain mb-2">Something went wrong</h1>
                        <p className="text-textMuted mb-6">
                            We encountered an unexpected error. Our team has been notified.
                        </p>
                        {this.state.error && (
                            <div className="bg-black/30 rounded-lg p-4 mb-6 text-left overflow-auto max-h-40 scrollbar-thin scrollbar-thumb-white/10">
                                <code className="text-xs text-red-400 font-mono break-words">
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-primary text-black font-semibold rounded-xl hover:bg-primaryHover transition-colors active:scale-95"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
