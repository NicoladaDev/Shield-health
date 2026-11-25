import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { EmailViewer } from '../components/simulator/EmailViewer';
import { FeedbackXRayPanel } from '../components/simulator/FeedbackXRayPanel';
import { InboxList } from '../components/simulator/InboxList';
import { PhishingTrapModal } from '../components/simulator/PhishingTrapModal';
import { HOSPITAL_SECTORS } from '../types';
import type {
  EmailScenario,
  HospitalSector,
  ScenarioDecision,
  UserActionType,
} from '../types';
import { computeSimulationSummary, formatPercentPtBr } from '../utils/metrics';

interface SimulatorPageProps {
  scenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  initialSelectedId?: string;
  onRecordDecision: (scenarioId: string, action: UserActionType) => void;
  onDeleteCustomCampaign?: (scenarioId: string) => void;
  onGoToDashboard: () => void;
}

const SECTOR_FILTERS: ReadonlyArray<'Todos' | HospitalSector> = [
  'Todos',
  ...HOSPITAL_SECTORS,
];

export function SimulatorPage({
  scenarios,
  decisions,
  initialSelectedId,
  onRecordDecision,
  onDeleteCustomCampaign,
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
  const feedbackHeadingRef = useRef<HTMLHeadingElement>(null);
  const appliedInitialIdRef = useRef<string | undefined>(undefined);

  const filteredScenarios = useMemo(() => {
    if (sectorFilter === 'Todos') return scenarios;
    return scenarios.filter((s) => s.sector === sectorFilter);
  }, [scenarios, sectorFilter]);

  useEffect(() => {
    if (!initialSelectedId) {
      appliedInitialIdRef.current = undefined;
      return;
    }
    if (appliedInitialIdRef.current === initialSelectedId) {
      return;
    }
    const target = scenarios.find((s) => s.id === initialSelectedId);
    if (!target) return;
    appliedInitialIdRef.current = initialSelectedId;
    setSectorFilter('Todos');
    setSelectedId(initialSelectedId);
    setHoveredUrl(null);
    setInspectUrlOpen(false);
    setShowTrapModal(false);
  }, [initialSelectedId, scenarios]);

  useEffect(() => {
    if (filteredScenarios.length === 0) {
      if (selectedId !== '') {
        setSelectedId('');
      }
      return;
    }
    if (!filteredScenarios.some((s) => s.id === selectedId)) {
      setSelectedId(filteredScenarios[0].id);
      setHoveredUrl(null);
      setInspectUrlOpen(false);
      setShowTrapModal(false);
    }
  }, [filteredScenarios, selectedId]);

  const activeScenario =
    filteredScenarios.find((s) => s.id === selectedId) ?? filteredScenarios[0];

  const activeDecision =
    activeScenario && Object.hasOwn(decisions, activeScenario.id)
      ? decisions[activeScenario.id]
      : undefined;

  const summary = useMemo(
    () => computeSimulationSummary(scenarios, decisions),
    [scenarios, decisions]
  );

  const hasNextScenario = filteredScenarios.length > 1;

  function handleSelectSector(sector: 'Todos' | HospitalSector) {
    const nextFiltered =
      sector === 'Todos'
        ? scenarios
        : scenarios.filter((s) => s.sector === sector);
    setSectorFilter(sector);
    setHoveredUrl(null);
    setInspectUrlOpen(false);
    setShowTrapModal(false);
    if (!nextFiltered.some((s) => s.id === selectedId)) {
      setSelectedId(nextFiltered[0]?.id ?? '');
    }
  }

  function handleSelectScenario(scenarioId: string) {
    setSelectedId(scenarioId);
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
  }

  function handleAction(action: UserActionType) {
    if (!activeScenario) return;
    onRecordDecision(activeScenario.id, action);
    if (action === 'clicked' && activeScenario.isPhishing) {
      setShowTrapModal(true);
    }
  }

  function handleNextScenario() {
    if (!activeScenario || filteredScenarios.length <= 1) return;
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
        emailViewerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
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
            destino dos links antes de decidir se reporta à TI ou marca como
            legítimo.
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
              {summary.evaluatedCount > 0
                ? formatPercentPtBr(summary.accuracyPercent)
                : '--'}
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
              aria-pressed={isSelected}
              onClick={() => handleSelectSector(sector)}
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
        <InboxList
          scenarios={filteredScenarios}
          decisions={decisions}
          activeScenarioId={activeScenario?.id}
          onSelectScenario={handleSelectScenario}
          onDeleteCustomCampaign={onDeleteCustomCampaign}
        />

        {activeScenario && (
          <div ref={emailViewerRef} className="lg:col-span-8 space-y-5 scroll-mt-20">
            <EmailViewer
              scenario={activeScenario}
              decision={activeDecision}
              hoveredUrl={hoveredUrl}
              inspectUrlOpen={inspectUrlOpen}
              onHoverUrl={setHoveredUrl}
              onToggleInspectUrl={() => setInspectUrlOpen((prev) => !prev)}
              onAction={handleAction}
            />

            {activeDecision && (
              <FeedbackXRayPanel
                scenario={activeScenario}
                decision={activeDecision}
                hasNextScenario={hasNextScenario}
                onNextScenario={handleNextScenario}
                onGoToDashboard={onGoToDashboard}
                headingRef={feedbackHeadingRef}
              />
            )}
          </div>
        )}
      </div>

      <PhishingTrapModal
        isOpen={showTrapModal && Boolean(activeScenario)}
        onClose={() => setShowTrapModal(false)}
        fallbackFocusRef={feedbackHeadingRef}
      />
    </div>
  );
}
