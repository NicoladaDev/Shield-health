import { ShieldCheck } from 'lucide-react';
import { formatPercentPtBr } from '../../utils/metrics';
import type { SectorMetric } from '../../utils/metrics';

interface SectorRiskCardProps {
  sectorMetrics: SectorMetric[];
}

export function SectorRiskCard({ sectorMetrics }: SectorRiskCardProps) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Risco por Setor Hospitalar
          </h2>
          <p className="text-xs text-slate-500">
            Diferencia cliques em phishing de falsos positivos. Sem simulações
            concluídas, exibe a linha de base de referência.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sectorMetrics.map((item) => {
          const isBaselineFallback = item.evaluated === 0;
          const barWidth = Math.min(100, Math.max(0, item.currentRiskPercent));

          return (
            <div key={item.sector} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800">{item.sector}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500">
                    {isBaselineFallback
                      ? `Linha de base (${formatPercentPtBr(
                          item.baselineRiskPercent
                        )}) — sem simulações`
                      : `${item.correct}/${item.evaluated} acertos • ${item.trapClicks} clique(s) em isca • ${item.falsePositives} falso(s) positivo(s)`}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full ${
                      item.currentRiskPercent <= 15
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.currentRiskPercent <= 35
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isBaselineFallback
                      ? `Base: ${formatPercentPtBr(item.currentRiskPercent)}`
                      : `Risco: ${formatPercentPtBr(item.currentRiskPercent)}`}
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <svg
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="w-full h-full block"
                >
                  <rect
                    x="0"
                    y="0"
                    width={barWidth}
                    height="10"
                    className={`transition-all ${
                      item.currentRiskPercent <= 15
                        ? 'fill-emerald-500'
                        : item.currentRiskPercent <= 35
                          ? 'fill-amber-500'
                          : 'fill-rose-500'
                    }`}
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
