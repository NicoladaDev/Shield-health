import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, X } from 'lucide-react';
import type { HospitalSector, IncidentChannel, IncidentReport } from '../types';
import type { CreateIncidentInput } from '../store/usePlatformStore';
import { calculateAnpdDeadline, formatPtBrDateTime } from '../utils/anpd';
import { containsPotentialCpf, INPUT_LIMITS } from '../utils/validation';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateIncidentInput) => IncidentReport;
  onGoToDashboard: () => void;
}

const SECTORS: HospitalSector[] = [
  'Laboratório',
  'Recepção',
  'Enfermagem',
  'Faturamento',
];

const CHANNELS: IncidentChannel[] = [
  'E-mail de phishing',
  'Link ou tela de login falsa',
  'Mensagem WhatsApp / SMS',
  'Acesso indevido a prontuário',
];

export function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  onGoToDashboard,
}: ReportModalProps) {
  const [sector, setSector] = useState<HospitalSector>('Laboratório');
  const [channel, setChannel] = useState<IncidentChannel>('E-mail de phishing');
  const [summary, setSummary] = useState('');
  const [involvesSensitiveHealthData, setInvolvesSensitiveHealthData] = useState(true);
  const [createdReport, setCreatedReport] = useState<IncidentReport | null>(null);

  const hasCpfWarning = containsPotentialCpf(summary);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasCpfWarning) return;
    const report = onSubmit({
      sector,
      channel,
      summary:
        summary.trim() ||
        `Suspeita de ${channel.toLowerCase()} reportada pelo setor de ${sector}.`,
      involvesSensitiveHealthData,
    });
    setCreatedReport(report);
  }

  function handleResetAndClose() {
    setCreatedReport(null);
    setSummary('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="px-5 sm:px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="report-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Canal de Alerta Rápido à TI
              </h2>
              <p className="text-xs text-rose-800">
                Reportar cedo protege pacientes e cumpre o prazo legal da ANPD.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-100 hover:text-slate-800 cursor-pointer"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdReport ? (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-emerald-900">
                  Alerta enviado para a equipe de TI e DPO!
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  Protocolo gerado:{' '}
                  <span className="font-mono font-bold">
                    {createdReport.protocol}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Clock className="w-4 h-4 text-teal-700" />
                Relógio LGPD / ANPD iniciado (3 dias úteis)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conforme a <strong>Resolução ANPD nº 15/2024</strong>, caso a TI
                confirme exposição relevante de dados sensíveis de saúde, a
                comunicação formal deve ocorrer até{' '}
                <strong className="text-slate-900">
                  {formatPtBrDateTime(
                    calculateAnpdDeadline(createdReport.reportedAt)
                  )}
                </strong>
                .
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetAndClose();
                  onGoToDashboard();
                }}
                className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 cursor-pointer"
              >
                Ver na Fila TI & DPO
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Seu setor no hospital
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as HospitalSector)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de suspeita
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as IncidentChannel)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Descreva brevemente o ocorrido (sem dados reais de pacientes)
                </label>
                <span className="text-[11px] text-slate-400">
                  {summary.length}/{INPUT_LIMITS.INCIDENT_SUMMARY}
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={INPUT_LIMITS.INCIDENT_SUMMARY}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ex.: Recebi e-mail pedindo login urgente para validar exame crítico com domínio estranho."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
              />
              {hasCpfWarning && (
                <p className="mt-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  Proteção LGPD: detectamos um padrão semelhante a CPF no texto.
                  Remova dados pessoais reais de pacientes antes de enviar o alerta.
                </p>
              )}
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={involvesSensitiveHealthData}
                onChange={(e) =>
                  setInvolvesSensitiveHealthData(e.target.checked)
                }
                className="mt-1 accent-teal-700"
              />
              <span className="text-xs text-amber-900 leading-relaxed">
                <strong>Pode envolver dados sensíveis de pacientes</strong>{' '}
                (prontuário, CPF, exames ou prescrições). Ativa prioridade LGPD
                para o DPO.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Sem punição: reportar rápido salva a rede.
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={hasCpfWarning}
                  className="min-h-11 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  Enviar Alerta Agora
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
