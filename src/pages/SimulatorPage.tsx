import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileWarning,
  Inbox,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type {
  EmailScenario,
  HospitalSector,
  ScenarioDecision,
  UserActionType,
} from '../types';
import { computeSimulationSummary } from '../utils/metrics';

interface SimulatorPageProps {
  scenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  initialSelectedId?: string;
  onRecordDecision: (scenarioId: string, action: UserActionType) => void;
  onGoToDashboard: () => void;
}

const SECTOR_FILTERS: Array<'Todos' | HospitalSector> = [
  'Todos',
  'Laboratório',
  'Enfermagem',
  'Recepção',
  'Faturamento',
];

export function SimulatorPage({
  scenarios,
  decisions,
  initialSelectedId,
  onRecordDecision,
  onGoToDashboard,
}: SimulatorPageProps) {
  const [sectorFilter, setSectorFilter] = useState<'Todos' | HospitalSector>(
    'Todos'
  );
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedId ?? scenarios[0]?.id ?? ''
  );
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);
  const [inspectUrlOpen, setInspectUrlOpen] = useState(false);
  const [showTrapModal, setShowTrapModal] = useState(false);
  const emailViewerRef = useRef<HTMLDivElement>(null);

  const filteredScenarios = useMemo(() => {
    if (sectorFilter === 'Todos') return scenarios;
    return scenarios.filter((s) => s.sector === sectorFilter);
  }, [scenarios, sectorFilter]);

  const activeScenario =
    filteredScenarios.find((s) => s.id === selectedId) ??
    filteredScenarios[0] ??
    scenarios[0];

  const activeDecision = activeScenario
    ? decisions[activeScenario.id]
    : undefined;

  const summary = useMemo(
    () => computeSimulationSummary(scenarios, decisions),
    [scenarios, decisions]
  );

  function handleAction(action: UserActionType) {
    if (!activeScenario) return;
    onRecordDecision(activeScenario.id, action);
    if (action === 'clicked' && activeScenario.isPhishing) {
      setShowTrapModal(true);
    }
  }

  function handleNextScenario() {
    if (!activeScenario) return;
    const currentIndex = filteredScenarios.findIndex(
      (s) => s.id === activeScenario.id
    );
    const nextScenario =
      filteredScenarios[(currentIndex + 1) % filteredScenarios.length];
    if (nextScenario) {
      setSelectedId(nextScenario.id);
      setHoveredUrl(null);
      setInspectUrlOpen(false);
      setShowTrapModal(false);
      if (window.innerWidth < 1024) {
        emailViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ambiente Controlado de Simulação
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Caixa de Entrada de Plantão
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Analise cada e-mail como se estivesse no meio do turno. Inspecione o
            destino dos links antes de decidir se reporta à TI ou marca como legítimo.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2">
          <div className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs text-center sm:text-left">
            <span className="text-slate-500 block sm:inline">Avaliados:</span>{' '}
            <strong className="text-slate-900">
              {summary.evaluatedCount}/{summary.totalScenarios}
            </strong>
          </div>
          <div className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] sm:text-xs text-center sm:text-left">
            <span className="text-emerald-800 block sm:inline">Bloqueados:</span>{' '}
            <strong className="text-emerald-950">
              {summary.phishingReportedCount}
            </strong>
          </div>
          <div className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs text-center sm:text-left">
            <span className="text-slate-500 block sm:inline">Precisão:</span>{' '}
            <strong className="text-teal-700">
              {summary.evaluatedCount > 0 ? `${summary.accuracyPercent}%` : '--'}
            </strong>
          </div>
        </div>
      </div>

      {/* Sector Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SECTOR_FILTERS.map((sector) => {
          const isSelected = sectorFilter === sector;
          return (
            <button
              key={sector}
              type="button"
              onClick={() => setSectorFilter(sector)}
              className={`min-h-9 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {sector}
            </button>
          );
        })}
      </div>

      {/* Split Pane Email Client */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Inbox List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Inbox className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Caixa de Entrada ({filteredScenarios.length})</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 truncate">
              @hospitalcentral.org.br
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 lg:max-h-[640px] overflow-y-auto">
            {filteredScenarios.map((scenario) => {
              const decision = decisions[scenario.id];
              const isSelected = activeScenario?.id === scenario.id;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(scenario.id);
                    setHoveredUrl(null);
                    setInspectUrlOpen(false);
                    setShowTrapModal(false);
                    if (window.innerWidth < 1024) {
                      setTimeout(() => {
                        emailViewerRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }, 50);
                    }
                  }}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/80 border-l-4 border-l-teal-700'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {scenario.sector}
                      </span>
                      {scenario.isFeaturedPitch && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          <Sparkles className="w-2.5 h-2.5" />
                          Cenário do Roteiro
                        </span>
                      )}
                      {scenario.isCustomCampaign && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                          Nova Campanha TI
                        </span>
                      )}
                    </div>

                    {decision ? (
                      decision.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                    )}
                  </div>

                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {scenario.senderName}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                    {scenario.subject}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    {scenario.receivedAt}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Email Viewer + Interactive X-Ray */}
        {activeScenario && (
          <div ref={emailViewerRef} className="lg:col-span-8 space-y-5 scroll-mt-20">
            {/* Email Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Email Header */}
              <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900">
                      Setor: {activeScenario.sector}
                    </span>
                    {activeScenario.urgencyTag && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">
                        {activeScenario.urgencyTag}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {activeScenario.receivedAt}
                  </span>
                </div>

                <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                  {activeScenario.subject}
                </h2>

                <div className="rounded-xl bg-white border border-slate-200 p-3 sm:p-3.5 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-500 sm:w-12">De:</span>
                    <span className="font-bold text-slate-900">
                      {activeScenario.senderName}
                    </span>
                    <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] break-all max-w-full">
                      &lt;{activeScenario.senderEmail}&gt;
                    </code>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-500 sm:w-12">Para:</span>
                    <span className="text-slate-700">
                      {activeScenario.recipientRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="p-4 sm:p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
                {activeScenario.bodyParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}

                {/* Simulated CTA Link */}
                {activeScenario.ctaLabel && activeScenario.ctaActualUrl && (
                  <div className="pt-2 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <button
                        type="button"
                        onMouseEnter={() =>
                          setHoveredUrl(activeScenario.ctaActualUrl ?? null)
                        }
                        onMouseLeave={() => setHoveredUrl(null)}
                        onFocus={() =>
                          setHoveredUrl(activeScenario.ctaActualUrl ?? null)
                        }
                        onBlur={() => setHoveredUrl(null)}
                        onClick={() => handleAction('clicked')}
                        className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-700 text-white font-semibold text-sm hover:bg-sky-800 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>{activeScenario.ctaLabel}</span>
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectUrlOpen((prev) => !prev)}
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
                        Dica: toque em <strong>Inspecionar link</strong> (ou passe
                        o mouse no computador) para conferir o endereço real sem clicar.
                      </span>
                    </div>

                    {(hoveredUrl || inspectUrlOpen) && (
                      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs shadow-md max-w-full">
                        <span className="text-slate-400 shrink-0">Destino real:</span>
                        <span className="break-all">
                          {hoveredUrl ?? activeScenario.ctaActualUrl}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Simulated Attachment */}
                {activeScenario.attachmentName && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleAction('clicked')}
                      className="w-full sm:w-auto flex items-center gap-3 p-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer max-w-full"
                    >
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <FileWarning className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-slate-900 break-all">
                          {activeScenario.attachmentName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Anexo • Toque para abrir na estação
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Qual é a sua decisão para este e-mail?</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleAction('reported')}
                    className={`min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                      activeDecision?.action === 'reported'
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                        : 'bg-teal-700 text-white hover:bg-teal-800 shadow-xs'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Reportar Phishing à TI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('marked_safe')}
                    className={`min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                      activeDecision?.action === 'marked_safe'
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Marcar como Legítimo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Educational Feedback & X-Ray Panel */}
            {activeDecision && (
              <div
                className={`rounded-2xl border p-5 sm:p-6 space-y-5 shadow-xs ${
                  activeDecision.isCorrect
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {activeDecision.isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3
                        className={`text-base font-extrabold ${
                          activeDecision.isCorrect
                            ? 'text-emerald-950'
                            : 'text-rose-950'
                        }`}
                      >
                        {activeDecision.isCorrect && activeScenario.isPhishing
                          ? 'Excelente! Golpe identificado e alerta enviado à TI.'
                          : activeDecision.isCorrect && !activeScenario.isPhishing
                            ? 'Correto! Este comunicado interno é legítimo.'
                            : activeDecision.action === 'clicked'
                              ? 'Simulação educativa: você clicou em uma isca de phishing.'
                              : activeScenario.isPhishing
                                ? 'Atenção: este e-mail era um golpe de phishing.'
                                : 'Falso positivo: este e-mail era um comunicado oficial.'}
                      </h3>
                      <p className="text-sm text-slate-700 mt-1">
                        {activeScenario.learningTakeaway}
                      </p>
                      {activeDecision.isCorrect && activeScenario.isPhishing && (
                        <p className="text-xs font-semibold text-emerald-800 mt-2">
                          Um alerta precoce foi registrado automaticamente no Painel TI & DPO.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                    {activeDecision.isCorrect && activeScenario.isPhishing && (
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
                      onClick={handleNextScenario}
                      className="min-h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
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
                    {activeScenario.indicators.map((ind) => (
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
                    Conexão com o mundo real — {activeScenario.relatedCaseTitle}:{' '}
                  </span>
                  <span className="text-slate-700">
                    {activeScenario.relatedCaseSummary}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Safe Phishing Interception Modal (when user clicks link/attachment) */}
      {showTrapModal && activeScenario && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="p-5 bg-rose-600 text-white flex items-center gap-3 shrink-0">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-100">
                  Treinamento Seguro — Shield Health
                </div>
                <h3 className="text-lg font-extrabold leading-tight">
                  Isso foi uma simulação de phishing!
                </h3>
              </div>
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
                  onClick={() => setShowTrapModal(false)}
                  className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 cursor-pointer"
                >
                  Ver Raio-X dos Sinais de Alerta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
