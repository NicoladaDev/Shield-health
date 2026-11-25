import type { RefObject } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { EmailScenario, ScenarioDecision } from '../../types';

interface FeedbackXRayPanelProps {
  scenario: EmailScenario;
  decision: ScenarioDecision;
  hasNextScenario: boolean;
  onNextScenario: () => void;
  onGoToDashboard: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}

export function FeedbackXRayPanel({
  scenario,
  decision,
  hasNextScenario,
  onNextScenario,
  onGoToDashboard,
  headingRef,
}: FeedbackXRayPanelProps) {
  const isPostClickReport = Boolean(
    scenario.isPhishing &&
      decision.hadTrapClick &&
      decision.action === 'reported'
  );
  const isLegitimateLinkClick = Boolean(
    !scenario.isPhishing && decision.action === 'clicked'
  );
  const showTiDashboardButton = Boolean(
    scenario.isPhishing && decision.action === 'reported'
  );

  let headline = '';
  if (decision.isCorrect && scenario.isPhishing) {
    headline = 'Excelente! Golpe identificado e alerta enviado à TI.';
  } else if (decision.isCorrect && !scenario.isPhishing) {
    headline = 'Correto! Este comunicado interno é legítimo.';
  } else if (isPostClickReport) {
    headline =
      'Alerta educativo enviado à TI (clique inicial mantido nas métricas).';
  } else if (isLegitimateLinkClick) {
    headline = 'Link aberto em comunicado legítimo.';
  } else if (scenario.isPhishing && decision.action === 'clicked') {
    headline = 'Simulação educativa: você clicou em uma isca de phishing.';
  } else if (scenario.isPhishing) {
    headline = 'Atenção: este e-mail era um golpe de phishing.';
  } else {
    headline = 'Falso positivo: este e-mail era um comunicado oficial.';
  }

  const cardTone = decision.isCorrect
    ? 'bg-emerald-50/70 border-emerald-200'
    : isPostClickReport || isLegitimateLinkClick
      ? 'bg-amber-50/80 border-amber-200'
      : 'bg-rose-50/70 border-rose-200';

  const titleTone = decision.isCorrect
    ? 'text-emerald-950'
    : isPostClickReport || isLegitimateLinkClick
      ? 'text-amber-950'
      : 'text-rose-950';

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 space-y-5 shadow-xs ${cardTone}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {decision.isCorrect ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle
              className={`w-6 h-6 shrink-0 mt-0.5 ${
                isPostClickReport || isLegitimateLinkClick
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            />
          )}
          <div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className={`text-base font-extrabold focus:outline-none ${titleTone}`}
            >
              {headline}
            </h3>
            <p className="text-sm text-slate-700 mt-1">
              {isLegitimateLinkClick
                ? 'Este e-mail é oficial e não é uma isca de phishing. Ainda assim, confirme sempre o remetente e conclua a triagem com "Marcar como Legítimo" antes de abrir links.'
                : scenario.learningTakeaway}
            </p>
            {isPostClickReport && (
              <p className="text-xs font-semibold text-amber-900 mt-2">
                Como houve clique prévio no link/anexo, a taxa de cliques na
                simulação permanece registrada com transparência; o alerta
                precoce enviado à TI foi aberto para contenção.
              </p>
            )}
            {showTiDashboardButton && (
              <p className="text-xs font-semibold text-emerald-800 mt-2">
                Um alerta precoce foi registrado automaticamente no Painel TI & DPO.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          {showTiDashboardButton && (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="min-h-10 px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
            >
              Ver no Painel TI
            </button>
          )}
          <button
            type="button"
            disabled={!hasNextScenario}
            onClick={onNextScenario}
            className="min-h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Próximo e-mail</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* X-Ray Indicators */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Raio-X dos Sinais neste E-mail
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scenario.indicators.map((ind) => (
            <div
              key={ind.id}
              className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {ind.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ind.severity === 'danger'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {ind.field}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {ind.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Connection to Real Case */}
      <div className="rounded-xl bg-white/90 border border-slate-200 p-4 text-xs">
        <span className="font-bold text-teal-800">
          Conexão com o mundo real — {scenario.relatedCaseTitle}:{' '}
        </span>
        <span className="text-slate-700">{scenario.relatedCaseSummary}</span>
      </div>
    </div>
  );
}
