import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  CheckCircle2,
  Clock,
  PlusCircle,
  Send,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import type {
  EmailScenario,
  HospitalSector,
  IncidentReport,
  IncidentStatus,
  ScenarioDecision,
} from '../types';
import type { CreateCampaignInput } from '../store/usePlatformStore';
import {
  calculateAnpdDeadline,
  formatPtBrDateTime,
  getHoursRemaining,
} from '../utils/anpd';
import {
  BENCHMARKS,
  calculateTrainingRoi,
  computeSectorMetrics,
  computeSimulationSummary,
  formatCurrencyBrl,
} from '../utils/metrics';
import { INPUT_LIMITS, isValidEmailAddress } from '../utils/validation';

interface DashboardPageProps {
  scenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  incidents: IncidentReport[];
  completedLessonsCount: number;
  totalLessonsCount: number;
  onUpdateIncidentStatus: (id: string, status: IncidentStatus) => void;
  onToggleIncidentChecklist: (
    id: string,
    key: keyof IncidentReport['checklist']
  ) => void;
  onLaunchCampaign: (input: CreateCampaignInput) => void;
  onGoToSimulator: () => void;
}

const SECTORS: HospitalSector[] = [
  'Laboratório',
  'Recepção',
  'Enfermagem',
  'Faturamento',
];

const INCIDENT_STATUSES: IncidentStatus[] = [
  'Em triagem TI',
  'Acesso contido',
  'Comunicado à ANPD',
];

export function DashboardPage({
  scenarios,
  decisions,
  incidents,
  completedLessonsCount,
  totalLessonsCount,
  onUpdateIncidentStatus,
  onToggleIncidentChecklist,
  onLaunchCampaign,
  onGoToSimulator,
}: DashboardPageProps) {
  // ROI calculator state
  const [staffCount, setStaffCount] = useState(400);
  const [monthlyCostPerEmployee, setMonthlyCostPerEmployee] = useState(12);

  // Campaign launcher state
  const [campaignSector, setCampaignSector] =
    useState<HospitalSector>('Recepção');
  const [campaignSubject, setCampaignSubject] = useState(
    'URGENTE: atualização obrigatória de senha do cadastro de pacientes'
  );
  const [campaignSenderName, setCampaignSenderName] = useState(
    'Suporte Sistemas Hospitalares'
  );
  const [campaignSenderEmail, setCampaignSenderEmail] = useState(
    'suporte@hospital-atualizacao-cad.com.br'
  );
  const [campaignMessage, setCampaignMessage] = useState(
    'Seu acesso à recepção expira em 15 minutos. Clique no link para confirmar sua credencial e manter o atendimento ativo.'
  );
  const [campaignCreatedFeedback, setCampaignCreatedFeedback] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

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

  function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignSubject.trim() || !campaignSenderName.trim() || !campaignMessage.trim()) {
      setCampaignError('Preencha remetente, assunto e texto da isca educativa.');
      setCampaignCreatedFeedback(false);
      return;
    }
    if (!isValidEmailAddress(campaignSenderEmail)) {
      setCampaignError('Informe um endereço de e-mail válido para a simulação.');
      setCampaignCreatedFeedback(false);
      return;
    }
    setCampaignError(null);
    onLaunchCampaign({
      sector: campaignSector,
      subject: campaignSubject,
      senderName: campaignSenderName,
      senderEmail: campaignSenderEmail,
      urgencyMessage: campaignMessage,
    });
    setCampaignCreatedFeedback(true);
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            Taxa de Cliques (Simulação)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {summary.currentClickRatePercent}%
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              meta: {BENCHMARKS.TARGET_TRAINED_CLICK_RATE}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Linha de base saúde (KnowBe4): {BENCHMARKS.BASELINE_PHISHING_CLICK_RATE}%
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            Alertas Reportados à TI
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {incidents.length}
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
              {summary.evaluatedCount > 0 ? `${summary.accuracyPercent}%` : '--'}
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
              {roi.costRatioTimesCheaper}x
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

      {/* Benchmark Reduction + Risk by Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KnowBe4 Benchmark Visual */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Evolução de Cliques em Phishing na Saúde
              </h2>
              <p className="text-xs text-slate-500">
                Comparativo entre linha de base (KnowBe4), sessão atual e meta de
                12 meses (-90%).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700">
                  Sem treinamento (Setor Saúde — KnowBe4)
                </span>
                <span className="text-rose-700">42,0%</span>
              </div>
              <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all"
                  style={{ width: '84%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700">
                  Taxa observada na simulação atual
                </span>
                <span className="text-amber-700">
                  {summary.currentClickRatePercent}%
                </span>
              </div>
              <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(4, summary.currentClickRatePercent * 2))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700">
                  Após 1 ano de treino contínuo (-90%)
                </span>
                <span className="text-emerald-700">4,2%</span>
              </div>
              <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: '9%' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sector Vulnerability Map */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Risco por Setor Hospitalar
              </h2>
              <p className="text-xs text-slate-500">
                Atualizado ao vivo conforme os cenários são resolvidos no
                Simulador.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {sectorMetrics.map((item) => (
              <div key={item.sector} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item.sector}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {item.evaluated > 0
                        ? `${item.correct}/${item.evaluated} acertos`
                        : 'Sem simulações concluídas'}
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
                      Risco: {item.currentRiskPercent}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.currentRiskPercent <= 15
                        ? 'bg-emerald-500'
                        : item.currentRiskPercent <= 35
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, item.currentRiskPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Incident Queue & ANPD 3-Business-Day Monitor */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-rose-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fila de Alertas Precoces & Relógio LGPD / ANPD (3 dias úteis)
              </h2>
              <p className="text-xs text-slate-500">
                Resolução CD/ANPD nº 15/2024: controle automático do prazo para
                comunicação de incidentes com dados sensíveis de saúde.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 self-start">
            {incidents.length} registro(s) ativo(s)
          </span>
        </div>

        <div className="space-y-4">
          {incidents.map((incident) => {
            const deadline = calculateAnpdDeadline(incident.reportedAt);
            const hoursLeft = getHoursRemaining(deadline);

            return (
              <div
                key={incident.id}
                className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-slate-50/50 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
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
                    </div>
                    <p className="text-sm text-slate-800 font-medium">
                      {incident.summary}
                    </p>
                    <div className="text-xs text-slate-500">
                      Reportado em {formatPtBrDateTime(incident.reportedAt)} •
                      Prazo limite ANPD:{' '}
                      <strong className="text-slate-900">
                        {formatPtBrDateTime(deadline)}
                      </strong>{' '}
                      ({hoursLeft}h restantes)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
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
                  </div>
                </div>

                {/* Response Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80">
                  {(
                    [
                      ['containedAccess', '1. Bloquear conta / link'],
                      ['assessedPatientData', '2. Auditar dados expostos'],
                      ['notifiedDpo', '3. Acionar DPO / Jurídico'],
                      ['preparedAnpdNotice', '4. Dossiê ANPD pronto'],
                    ] as const
                  ).map(([key, label]) => {
                    const checked = incident.checklist[key];
                    return (
                      <button
                        key={key}
                        type="button"
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
      </section>

      {/* Bottom Row: ROI Calculator + Live Campaign Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Calculator */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Calculadora de Custo-Benefício (ROI)
              </h2>
              <p className="text-xs text-slate-500">
                Compare o investimento anual em conscientização com o custo médio
                de 1 vazamento no Brasil (Brasscom).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Colaboradores treinados no hospital</span>
                <span className="text-teal-800 font-bold">{staffCount} pessoas</span>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={staffCount}
                onChange={(e) => setStaffCount(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Custo mensal estimado por colaborador</span>
                <span className="text-teal-800 font-bold">
                  R$ {monthlyCostPerEmployee}/mês
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                step={1}
                value={monthlyCostPerEmployee}
                onChange={(e) =>
                  setMonthlyCostPerEmployee(Number(e.target.value))
                }
                className="w-full accent-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-4">
              <div className="text-[11px] font-bold text-teal-800 uppercase">
                Investimento Anual em Treino
              </div>
              <div className="text-xl font-extrabold text-teal-950 mt-1">
                {formatCurrencyBrl(roi.annualTrainingCostBrl)}
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
              <div className="text-[11px] font-bold text-rose-800 uppercase">
                Custo Médio de 1 Vazamento
              </div>
              <div className="text-xl font-extrabold text-rose-950 mt-1">
                {formatCurrencyBrl(roi.avgBreachCostBrl)}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 text-white p-4 text-xs leading-relaxed">
            Treinar <strong>{staffCount} profissionais</strong> durante 12 meses
            custa{' '}
            <strong className="text-teal-300">
              {roi.costRatioTimesCheaper} vezes menos
            </strong>{' '}
            que um único incidente. Evitar apenas 1 vazamento economiza{' '}
            <strong className="text-emerald-300">
              {formatCurrencyBrl(roi.netSavingsIfOneIncidentPreventedBrl)}
            </strong>
            .
          </div>
        </section>

        {/* Live Phishing Campaign Launcher */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-sky-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Disparar Nova Simulação de Phishing
              </h2>
              <p className="text-xs text-slate-500">
                Crie uma campanha educativa segura e envie imediatamente para a
                Caixa de Entrada do Simulador.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateCampaign} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Setor alvo
                </label>
                <select
                  value={campaignSector}
                  onChange={(e) =>
                    setCampaignSector(e.target.value as HospitalSector)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do remetente falso
                </label>
                <input
                  type="text"
                  maxLength={INPUT_LIMITS.CAMPAIGN_SENDER_NAME}
                  value={campaignSenderName}
                  onChange={(e) => setCampaignSenderName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail simulado (domínio externo)
              </label>
              <input
                type="email"
                maxLength={INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL}
                value={campaignSenderEmail}
                onChange={(e) => setCampaignSenderEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assunto com gatilho de urgência
              </label>
              <input
                type="text"
                maxLength={INPUT_LIMITS.CAMPAIGN_SUBJECT}
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Texto da isca educativa
              </label>
              <textarea
                rows={2}
                maxLength={INPUT_LIMITS.CAMPAIGN_MESSAGE}
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
              />
            </div>

            {campaignError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {campaignError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <button
                type="submit"
                className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 text-white text-xs font-bold hover:bg-sky-800 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Enviar Simulação para o Simulador</span>
              </button>

              {campaignCreatedFeedback && (
                <button
                  type="button"
                  onClick={onGoToSimulator}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Campanha enviada! Abrir no Simulador →
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
