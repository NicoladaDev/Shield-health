import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileWarning,
  Link2,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import type {
  EmailScenario,
  ScenarioDecision,
  UserActionType,
} from '../../types';

interface EmailViewerProps {
  scenario: EmailScenario;
  decision?: ScenarioDecision;
  hoveredUrl: string | null;
  inspectUrlOpen: boolean;
  onHoverUrl: (url: string | null) => void;
  onToggleInspectUrl: () => void;
  onAction: (action: UserActionType) => void;
}

export function EmailViewer({
  scenario,
  decision,
  hoveredUrl,
  inspectUrlOpen,
  onHoverUrl,
  onToggleInspectUrl,
  onAction,
}: EmailViewerProps) {
  const hasDecision = Boolean(decision);
  const canPostClickReport = Boolean(
    scenario.isPhishing && decision?.action === 'clicked'
  );
  const isReportDisabled = hasDecision && !canPostClickReport;
  const isMarkSafeDisabled = hasDecision;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Email Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900">
              Setor: {scenario.sector}
            </span>
            {scenario.urgencyTag && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">
                {scenario.urgencyTag}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">{scenario.receivedAt}</span>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
          {scenario.subject}
        </h2>

        <div className="rounded-xl bg-white border border-slate-200 p-3 sm:p-3.5 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 sm:w-12">De:</span>
            <span className="font-bold text-slate-900">
              {scenario.senderName}
            </span>
            <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] break-all max-w-full">
              &lt;{scenario.senderEmail}&gt;
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 sm:w-12">Para:</span>
            <span className="text-slate-700">{scenario.recipientRole}</span>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="p-4 sm:p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
        {scenario.bodyParagraphs.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}

        {/* Simulated CTA Link */}
        {scenario.ctaLabel && scenario.ctaActualUrl && (
          <div className="pt-2 space-y-2.5">
            {scenario.ctaDisplayUrl && (
              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600">Link exibido no texto:</span>
                <code className="font-mono text-slate-900 font-semibold break-all">
                  {scenario.ctaDisplayUrl}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                disabled={hasDecision}
                onMouseEnter={() => onHoverUrl(scenario.ctaActualUrl ?? null)}
                onMouseLeave={() => onHoverUrl(null)}
                onFocus={() => onHoverUrl(scenario.ctaActualUrl ?? null)}
                onBlur={() => onHoverUrl(null)}
                onClick={() => onAction('clicked')}
                className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-700 text-white font-semibold text-sm hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
              >
                <span>{scenario.ctaLabel}</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                aria-expanded={inspectUrlOpen}
                onClick={onToggleInspectUrl}
                className="w-full sm:w-auto min-h-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>
                  {inspectUrlOpen ? 'Ocultar destino' : 'Inspecionar link'}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-start gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Dica: toque em <strong>Inspecionar link</strong> (ou passe o
                mouse no computador) para comparar o endereço exibido com o
                destino real antes de clicar.
              </span>
            </div>

            {(hoveredUrl || inspectUrlOpen) && (
              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs shadow-md max-w-full">
                <span className="text-slate-400 shrink-0">Destino real:</span>
                <span className="break-all">
                  {hoveredUrl ?? scenario.ctaActualUrl}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Simulated Attachment */}
        {scenario.attachmentName && (
          <div className="pt-2">
            <button
              type="button"
              disabled={hasDecision}
              onClick={() => onAction('clicked')}
              className="w-full sm:w-auto flex items-center gap-3 p-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left cursor-pointer max-w-full"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <FileWarning className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold text-slate-900 break-all">
                  {scenario.attachmentName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {hasDecision
                    ? 'Anexo bloqueado após decisão registrada'
                    : 'Anexo • Toque para abrir na estação'}
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {hasDecision
                ? canPostClickReport
                  ? 'Clique registrado — envie um reporte educativo à TI se desejar:'
                  : 'Decisão registrada para este e-mail:'
                : 'Qual é a sua decisão para este e-mail?'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isReportDisabled}
              onClick={() => onAction('reported')}
              className={`min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                decision?.action === 'reported'
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                  : 'bg-teal-700 text-white hover:bg-teal-800 shadow-xs'
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Reportar Phishing à TI</span>
            </button>

            <button
              type="button"
              disabled={isMarkSafeDisabled}
              onClick={() => onAction('marked_safe')}
              className={`min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                decision?.action === 'marked_safe'
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Marcar como Legítimo</span>
            </button>
          </div>
        </div>

        {canPostClickReport && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Você clicou na isca — a falha já foi preservada nas métricas de
            cliques, mas você ainda pode acionar <strong>Reportar Phishing à TI</strong>{' '}
            para treinar o alerta precoce e abrir o registro no Painel TI.
          </p>
        )}
      </div>
    </div>
  );
}
