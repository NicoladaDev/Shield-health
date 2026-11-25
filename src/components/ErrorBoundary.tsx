import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Intencionalmente não exibe stack traces técnicos na interface clínica.
  }

  private handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  private handleRestoreAndReload = () => {
    try {
      window.localStorage.removeItem('shield_health_state_v1');
    } catch {
      // Ignora restrições de armazenamento local
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div
          role="alert"
          className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900">
                Algo deu errado ao exibir esta tela
              </h1>
              <p className="text-xs text-slate-500">
                Shield Health — Recuperação Segura
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Ocorreu uma falha inesperada na interface. Nenhum dado clínico real
            foi exposto. Você pode tentar novamente ou restaurar os dados locais
            da demonstração.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={this.handleRestoreAndReload}
              className="flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Restaurar demonstração e recarregar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
