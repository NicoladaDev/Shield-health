import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { BenchmarkComparisonCard } from '../components/dashboard/BenchmarkComparisonCard';
import { CampaignLauncherCard } from '../components/dashboard/CampaignLauncherCard';
import { IncidentQueueSection } from '../components/dashboard/IncidentQueueSection';
import { KpiSummaryGrid } from '../components/dashboard/KpiSummaryGrid';
import { RoiCalculatorCard } from '../components/dashboard/RoiCalculatorCard';
import { SectorRiskCard } from '../components/dashboard/SectorRiskCard';
import type { CreateCampaignInput } from '../store/usePlatformStore';
import type {
  CampaignLaunchResult,
  ChecklistKey,
  EmailScenario,
  IncidentReport,
  IncidentStatus,
  ScenarioDecision,
} from '../types';
import {
  calculateTrainingRoi,
  computeSectorMetrics,
  computeSimulationSummary,
} from '../utils/metrics';

interface DashboardPageProps {
  scenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  incidents: IncidentReport[];
  completedLessonsCount: number;
  totalLessonsCount: number;
  onUpdateIncidentStatus: (id: string, status: IncidentStatus) => void;
  onToggleIncidentChecklist: (id: string, key: ChecklistKey) => void;
  onLaunchCampaign: (input: CreateCampaignInput) => CampaignLaunchResult;
  onDeleteCustomCampaign: (scenarioId: string) => void;
  onGoToSimulator: () => void;
}

export function DashboardPage({
  scenarios,
  decisions,
  incidents,
  completedLessonsCount,
  totalLessonsCount,
  onUpdateIncidentStatus,
  onToggleIncidentChecklist,
  onLaunchCampaign,
  onDeleteCustomCampaign,
  onGoToSimulator,
}: DashboardPageProps) {
  const [staffCount, setStaffCount] = useState(400);
  const [monthlyCostPerEmployee, setMonthlyCostPerEmployee] = useState(12);

  const summary = useMemo(
    () => computeSimulationSummary(scenarios, decisions),
    [scenarios, decisions]
  );

  const sectorMetrics = useMemo(
    () => computeSectorMetrics(scenarios, decisions),
    [scenarios, decisions]
  );

  const roi = useMemo(
    () => calculateTrainingRoi(staffCount, monthlyCostPerEmployee),
    [staffCount, monthlyCostPerEmployee]
  );

  const customScenarios = useMemo(
    () => scenarios.filter((s) => s.isCustomCampaign === true),
    [scenarios]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Visão de Gestão — TI, Segurança e DPO
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Painel Executivo de Conscientização e LGPD
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Acompanhe vulnerabilidade por setor, alertas precoces com prazo da
            ANPD (3 dias úteis) e retorno financeiro do treinamento.
          </p>
        </div>
      </div>

      {/* Top KPI Row */}
      <KpiSummaryGrid
        summary={summary}
        incidentsCount={incidents.length}
        completedLessonsCount={completedLessonsCount}
        totalLessonsCount={totalLessonsCount}
        roi={roi}
      />

      {/* Benchmark Reduction + Risk by Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BenchmarkComparisonCard
          observedClickRatePercent={summary.observedClickRatePercent}
          phishingEvaluatedCount={summary.phishingEvaluatedCount}
        />
        <SectorRiskCard sectorMetrics={sectorMetrics} />
      </div>

      {/* Incident Queue & ANPD 3-Business-Day Monitor */}
      <IncidentQueueSection
        incidents={incidents}
        onUpdateIncidentStatus={onUpdateIncidentStatus}
        onToggleIncidentChecklist={onToggleIncidentChecklist}
      />

      {/* Bottom Row: ROI Calculator + Live Campaign Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RoiCalculatorCard
          staffCount={staffCount}
          monthlyCostPerEmployee={monthlyCostPerEmployee}
          roi={roi}
          onChangeStaffCount={setStaffCount}
          onChangeMonthlyCost={setMonthlyCostPerEmployee}
        />
        <CampaignLauncherCard
          customScenarios={customScenarios}
          onLaunchCampaign={onLaunchCampaign}
          onDeleteCustomCampaign={onDeleteCustomCampaign}
          onGoToSimulator={onGoToSimulator}
        />
      </div>
    </div>
  );
}
