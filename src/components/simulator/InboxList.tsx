import { CheckCircle2, Inbox, Sparkles, Trash2, XCircle } from 'lucide-react';
import type { EmailScenario, ScenarioDecision } from '../../types';

interface InboxListProps {
  scenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  activeScenarioId?: string;
  onSelectScenario: (scenarioId: string) => void;
  onDeleteCustomCampaign?: (scenarioId: string) => void;
}

export function InboxList({
  scenarios,
  decisions,
  activeScenarioId,
  onSelectScenario,
  onDeleteCustomCampaign,
}: InboxListProps) {
  return (
    <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Inbox className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Caixa de Entrada ({scenarios.length})</span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 truncate">
          @hospitalcentral.org.br
        </span>
      </div>

      <div className="divide-y divide-slate-100 max-h-72 lg:max-h-[640px] overflow-y-auto">
        {scenarios.map((scenario) => {
          const decision = Object.hasOwn(decisions, scenario.id)
            ? decisions[scenario.id]
            : undefined;
          const isSelected = activeScenarioId === scenario.id;
          const canDelete =
            scenario.isCustomCampaign === true &&
            Boolean(onDeleteCustomCampaign);

          return (
            <div
              key={scenario.id}
              className={`flex items-stretch transition-colors ${
                isSelected
                  ? 'bg-teal-50/80 border-l-4 border-l-teal-700'
                  : 'hover:bg-slate-50 border-l-4 border-l-transparent'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectScenario(scenario.id)}
                className="flex-1 min-w-0 text-left p-4 cursor-pointer"
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
                    {scenario.isCustomCampaign === true && (
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

              {canDelete && onDeleteCustomCampaign && (
                <div className="flex items-start p-2.5 pl-0 shrink-0">
                  <button
                    type="button"
                    aria-label={`Excluir campanha ${scenario.subject}`}
                    title="Excluir campanha customizada"
                    onClick={() => onDeleteCustomCampaign(scenario.id)}
                    className="min-w-9 min-h-9 p-2 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
