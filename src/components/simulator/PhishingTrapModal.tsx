import { useRef } from 'react';
import type { RefObject } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface PhishingTrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

export function PhishingTrapModal({
  isOpen,
  onClose,
  fallbackFocusRef,
}: PhishingTrapModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { titleId } = useModalAccessibility({
    isOpen,
    onClose,
    containerRef: dialogRef,
    fallbackFocusRef,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-t-3xl sm:rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full max-h-[90dvh] flex flex-col overflow-hidden focus:outline-none"
      >
        <div className="p-5 bg-rose-600 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-100">
                Treinamento Seguro — Shield Health
              </div>
              <h3 id={titleId} className="text-lg font-extrabold leading-tight">
                Isso foi uma simulação de phishing!
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-1.5 rounded-lg text-rose-100 hover:bg-rose-700 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-slate-700 overflow-y-auto">
          <p>
            <strong>Nenhum dado real foi exposto.</strong> No meio da correria
            do plantão, quase <strong>42% dos profissionais de saúde</strong>{' '}
            clicam em iscas como esta antes de treinar.
          </p>
          <p className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
            Em um ataque real, esta tela capturaria sua senha ou executaria
            ransomware na rede — como ocorreu na Change Healthcare e nos
            hospitais de Londres.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 cursor-pointer"
            >
              Ver Raio-X dos Sinais de Alerta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
