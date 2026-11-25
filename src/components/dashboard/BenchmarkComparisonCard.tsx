import { TrendingDown } from 'lucide-react';
import { BENCHMARKS, formatPercentPtBr } from '../../utils/metrics';

interface BenchmarkComparisonCardProps {
  observedClickRatePercent: number | null;
  phishingEvaluatedCount: number;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function BenchmarkComparisonCard({
  observedClickRatePercent,
  phishingEvaluatedCount,
}: BenchmarkComparisonCardProps) {
  const hasObservedPhishing =
    phishingEvaluatedCount > 0 && observedClickRatePercent !== null;

  const baselineWidth = clampPercent(BENCHMARKS.BASELINE_PHISHING_CLICK_RATE);
  const observedWidth = hasObservedPhishing
    ? clampPercent(observedClickRatePercent)
    : 0;
  const targetWidth = clampPercent(BENCHMARKS.TARGET_TRAINED_CLICK_RATE);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-emerald-700 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Evolução de Cliques em Phishing na Saúde
          </h2>
          <p className="text-xs text-slate-500">
            Escala real 0–100%: comparativo entre linha de base (KnowBe4),
            sessão atual e meta de 12 meses (-90%).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between gap-2 text-xs font-semibold mb-1.5">
            <span className="text-slate-700">
              Sem treinamento (Setor Saúde — KnowBe4)
            </span>
            <span className="text-rose-700 shrink-0">
              {formatPercentPtBr(BENCHMARKS.BASELINE_PHISHING_CLICK_RATE)}
            </span>
          </div>
          <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="w-full h-full block"
            >
              <rect
                x="0"
                y="0"
                width={baselineWidth}
                height="10"
                className="fill-rose-500 transition-all"
              />
            </svg>
          </div>
        </div>

        <div>
          <div className="flex justify-between gap-2 text-xs font-semibold mb-1.5">
            <span className="text-slate-700">
              Taxa observada na simulação atual
            </span>
            <span className="text-amber-700 text-right">
              {hasObservedPhishing && observedClickRatePercent !== null
                ? formatPercentPtBr(observedClickRatePercent)
                : `Sem phishing avaliado — usando linha de base (${formatPercentPtBr(
                    BENCHMARKS.BASELINE_PHISHING_CLICK_RATE
                  )})`}
            </span>
          </div>
          <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="w-full h-full block"
            >
              <rect
                x="0"
                y="0"
                width={observedWidth}
                height="10"
                className="fill-amber-500 transition-all"
              />
            </svg>
          </div>
        </div>

        <div>
          <div className="flex justify-between gap-2 text-xs font-semibold mb-1.5">
            <span className="text-slate-700">
              Após 1 ano de treino contínuo (-90%)
            </span>
            <span className="text-emerald-700 shrink-0">
              {formatPercentPtBr(BENCHMARKS.TARGET_TRAINED_CLICK_RATE)}
            </span>
          </div>
          <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="w-full h-full block"
            >
              <rect
                x="0"
                y="0"
                width={targetWidth}
                height="10"
                className="fill-emerald-600 transition-all"
              />
            </svg>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="flex justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-100"
        >
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </section>
  );
}
