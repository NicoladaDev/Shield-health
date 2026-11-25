import { useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Copy,
} from 'lucide-react';
import {
  CHECKLIST_KEYS,
  CHECKLIST_LABELS,
  HOSPITAL_SECTORS,
  INCIDENT_STATUSES,
} from '../../types';
import type {
  ChecklistKey,
  HospitalSector,
  IncidentReport,
  IncidentStatus,
} from '../../types';
import {
  formatPtBrDateTime,
  getAnpdDeadlineStatus,
} from '../../utils/anpd';
import {
  containsPotentialCpf,
  INPUT_LIMITS,
  sanitizeText,
  stripControlAndBidiChars,
} from '../../utils/validation';

interface IncidentQueueSectionProps {
  incidents: IncidentReport[];
  onUpdateIncidentStatus: (id: string, status: IncidentStatus) => void;
  onToggleIncidentChecklist: (id: string, key: ChecklistKey) => void;
}

type StatusFilter = 'Todos' | IncidentStatus;
type SectorFilter = 'Todos' | HospitalSector;

function buildPlainTextAnpdSummary(incident: IncidentReport): string {
  const deadlineStatus = getAnpdDeadlineStatus(
    incident.reportedAt,
    incident.status
  );
  const rawSummary = stripControlAndBidiChars(
    incident.summary,
    INPUT_LIMITS.INCIDENT_SUMMARY,
    true
  );
  const sanitizedSummary = containsPotentialCpf(rawSummary)
    ? '[Resumo omitido por proteção LGPD]'
    : sanitizeText(rawSummary, INPUT_LIMITS.INCIDENT_SUMMARY);

  const checklistLines = CHECKLIST_KEYS.map((key) => {
    const mark = incident.checklist[key] ? '[x]' : '[ ]';
    return `${mark} ${CHECKLIST_LABELS[key]}`;
  }).join('\n');

  const deadlineLine = deadlineStatus.isCompleted
    ? 'Prazo ANPD: Comunicado dentro do prazo (Encerrado)'
    : `Prazo limite ANPD (3 dias úteis): ${formatPtBrDateTime(
        deadlineStatus.deadline
      )} (${deadlineStatus.label})`;

  return [
    `Protocolo: ${sanitizeText(incident.protocol, 40)}`,
    `Setor: ${incident.sector}`,
    `Canal: ${incident.channel}`,
    `Status: ${incident.status}`,
    `Dados sensíveis de saúde (LGPD): ${
      incident.involvesSensitiveHealthData ? 'Sim' : 'Não'
    }`,
    `Reportado em: ${formatPtBrDateTime(incident.reportedAt)}`,
    deadlineLine,
    `Resumo: ${sanitizedSummary}`,
    'Checklist de Resposta TI/DPO:',
    checklistLines,
  ].join('\n');
}

export function IncidentQueueSection({
  incidents,
  onUpdateIncidentStatus,
  onToggleIncidentChecklist,
}: IncidentQueueSectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('Todos');
  const [sortByDeadline, setSortByDeadline] = useState(false);
  const [copyFeedbackById, setCopyFeedbackById] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  const statusFilterId = useId();
  const sectorFilterId = useId();

  const filteredIncidents = useMemo(() => {
    const filtered = incidents.filter((inc) => {
      if (statusFilter !== 'Todos' && inc.status !== statusFilter) {
        return false;
      }
      if (sectorFilter !== 'Todos' && inc.sector !== sectorFilter) {
        return false;
      }
      return true;
    });

    if (!sortByDeadline) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aCompleted = a.status === 'Comunicado à ANPD';
      const bCompleted = b.status === 'Comunicado à ANPD';
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      const aDeadline = getAnpdDeadlineStatus(a.reportedAt, a.status).deadline.getTime();
      const bDeadline = getAnpdDeadlineStatus(b.reportedAt, b.status).deadline.getTime();
      return aDeadline - bDeadline;
    });
  }, [incidents, statusFilter, sectorFilter, sortByDeadline]);

  async function handleCopySummary(incident: IncidentReport) {
    const dossierText = buildPlainTextAnpdSummary(incident);
    try {
      if (
        typeof navigator === 'undefined' ||
        typeof navigator.clipboard?.writeText !== 'function'
      ) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(dossierText);
      setCopyFeedbackById((prev) => ({
        ...prev,
        [incident.id]: { ok: true, message: 'Resumo copiado!' },
      }));
    } catch {
      setCopyFeedbackById((prev) => ({
        ...prev,
        [incident.id]: {
          ok: false,
          message: 'Não foi possível copiar automaticamente neste navegador.',
        },
      }));
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Fila de Alertas Precoces & Relógio LGPD / ANPD (3 dias úteis)
            </h2>
            <p className="text-xs text-slate-500">
              Resolução CD/ANPD nº 15/2024: controle automático do prazo de 3
              dias úteis considerando fins de semana e feriados nacionais
              brasileiros (fixos e móveis 2025–2027).
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start shrink-0">
          Exibindo {filteredIncidents.length} de {incidents.length}
        </span>
      </div>

      {/* Filters and Deadline Sort */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <div>
            <label
              htmlFor={statusFilterId}
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Filtrar por status
            </label>
            <select
              id={statusFilterId}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="Todos">Todos</option>
              {INCIDENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={sectorFilterId}
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Filtrar por setor
            </label>
            <select
              id={sectorFilterId}
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value as SectorFilter)}
              className="w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="Todos">Todos</option>
              {HOSPITAL_SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          aria-pressed={sortByDeadline}
          onClick={() => setSortByDeadline((prev) => !prev)}
          className={`min-h-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            sortByDeadline
              ? 'bg-teal-700 text-white border-teal-700'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
          <span>Ordenar por prazo ANPD</span>
        </button>
      </div>

      {filteredIncidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
          Nenhum alerta encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => {
            const deadlineStatus = getAnpdDeadlineStatus(
              incident.reportedAt,
              incident.status
            );
            const copyFeedback = Object.hasOwn(copyFeedbackById, incident.id)
              ? copyFeedbackById[incident.id]
              : undefined;

            return (
              <div
                key={incident.id}
                className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                        {incident.protocol}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-900">
                        {incident.sector}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {incident.channel}
                      </span>
                      {incident.involvesSensitiveHealthData && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                          <AlertTriangle className="w-3 h-3" />
                          Dado Sensível (LGPD)
                        </span>
                      )}

                      {deadlineStatus.isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                          <CheckCircle2 className="w-3 h-3" />
                          Comunicado dentro do prazo • Encerrado
                        </span>
                      ) : deadlineStatus.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Prazo vencido ({Math.max(1, deadlineStatus.hoursOverdue)}h)
                        </span>
                      ) : deadlineStatus.isUrgent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3" />
                          Urgente ANPD: {deadlineStatus.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900">
                          <Clock className="w-3 h-3" />
                          {deadlineStatus.label}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-800 font-medium">
                      {incident.summary}
                    </p>

                    <div className="text-xs text-slate-500">
                      Reportado em {formatPtBrDateTime(incident.reportedAt)}
                      {!deadlineStatus.isCompleted && (
                        <>
                          {' '}
                          • Prazo limite ANPD:{' '}
                          <strong className="text-slate-900">
                            {formatPtBrDateTime(deadlineStatus.deadline)}
                          </strong>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0 w-full lg:w-auto">
                    <select
                      aria-label={`Status do incidente ${incident.protocol}`}
                      value={incident.status}
                      onChange={(e) =>
                        onUpdateIncidentStatus(
                          incident.id,
                          e.target.value as IncidentStatus
                        )
                      }
                      className="w-full sm:w-auto min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      {INCIDENT_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void handleCopySummary(incident)}
                      className="w-full sm:w-auto min-h-9 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>Copiar resumo ANPD</span>
                    </button>

                    {copyFeedback && (
                      <span
                        role="status"
                        className={`text-[11px] font-semibold ${
                          copyFeedback.ok ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {copyFeedback.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Response Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80">
                  {CHECKLIST_KEYS.map((key) => {
                    const label = CHECKLIST_LABELS[key];
                    const checked = incident.checklist[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={checked}
                        onClick={() =>
                          onToggleIncidentChecklist(incident.id, key)
                        }
                        className={`min-h-10 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-colors cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            checked ? 'text-emerald-600' : 'text-slate-300'
                          }`}
                        />
                        <span className="leading-snug">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
