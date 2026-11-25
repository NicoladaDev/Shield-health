import { BENCHMARKS, formatPercentPtBr } from '../../utils/metrics';
import type { RoiEstimate, SimulationSummary } from '../../utils/metrics';

interface KpiSummaryGridProps {
  summary: SimulationSummary;
  incidentsCount: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  roi: RoiEstimate;
}

export function KpiSummaryGrid({
  summary,
  incidentsCount,
  completedLessonsCount,
  totalLessonsCount,
  roi,
}: KpiSummaryGridProps) {
  const hasEvaluatedPhishing =
    summary.phishingEvaluatedCount > 0 &&
    summary.observedClickRatePercent !== null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 uppercase">
          Taxa de Cliques (Simulação)
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900">
            {hasEvaluatedPhishing && summary.observedClickRatePercent !== null
              ? formatPercentPtBr(summary.observedClickRatePercent)
              : '--'}
          </span>
          <span className="text-xs font-semibold text-emerald-700">
            meta: {formatPercentPtBr(BENCHMARKS.TARGET_TRAINED_CLICK_RATE)}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {hasEvaluatedPhishing
            ? `Linha de base saúde (KnowBe4): ${formatPercentPtBr(
                BENCHMARKS.BASELINE_PHISHING_CLICK_RATE
              )}`
            : `Sem phishing avaliado — usando linha de base (${formatPercentPtBr(
                BENCHMARKS.BASELINE_PHISHING_CLICK_RATE
              )})`}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 uppercase">
          Alertas Reportados à TI
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900">
            {incidentsCount}
          </span>
          <span className="text-xs font-semibold text-teal-700">
            detecção precoce
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Monitorados no relógio ANPD nº 15/2024
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 uppercase">
          Precisão nas Simulações
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900">
            {summary.evaluatedCount > 0
              ? formatPercentPtBr(summary.accuracyPercent)
              : '--'}
          </span>
          <span className="text-xs font-medium text-slate-500">
            ({summary.correctCount}/{summary.evaluatedCount} acertos)
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Microaulas concluídas: {completedLessonsCount}/{totalLessonsCount}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 uppercase">
          Custo-Benefício (ROI)
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-teal-700">
            {new Intl.NumberFormat('pt-BR', {
              maximumFractionDigits: 2,
            }).format(roi.costRatioTimesCheaper)}
            x
          </span>
          <span className="text-xs font-semibold text-slate-600">
            mais barato
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          que 1 vazamento médio de R$ 7 milhões
        </div>
      </div>
    </div>
  );
}
