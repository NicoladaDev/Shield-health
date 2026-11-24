import {
  AlertOctagon,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  DollarSign,
  MailWarning,
  ShieldCheck,
  TrendingDown,
  Users,
} from 'lucide-react';
import { OFFICIAL_SOURCES, REAL_CASES } from '../data/benchmarks';
import type { NavSection } from '../types';

interface OverviewPageProps {
  onNavigate: (section: NavSection) => void;
  onStartFeaturedScenario: () => void;
  accuracyPercent: number;
  evaluatedCount: number;
  totalScenarios: number;
  completedLessonsCount: number;
  totalLessons: number;
}

export function OverviewPage({
  onNavigate,
  onStartFeaturedScenario,
  accuracyPercent,
  evaluatedCount,
  totalScenarios,
  completedLessonsCount,
  totalLessons,
}: OverviewPageProps) {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 text-white p-5 sm:p-8 lg:p-10 shadow-lg">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 relative z-10">
          <div className="max-w-3xl space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/15 backdrop-blur-xs text-teal-100 text-xs font-semibold tracking-wide leading-snug">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sistema de Conscientização Cibernética para o Setor da Saúde</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <img
                src="./logo.png"
                alt="Logo Shield Health"
                className="w-14 h-14 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-lg"
              />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                A segurança na saúde começa pelas pessoas.
              </h1>
            </div>

            <p className="text-teal-50/90 text-sm sm:text-base leading-relaxed max-w-2xl">
              Firewall e antivírus são essenciais, mas a recepcionista, o enfermeiro, o
              biomédico e o faturamento são a <strong>primeira barreira</strong> — ou a
              primeira brecha. O <strong>Shield Health</strong> combina microaulas curtas de
              plantão, simulações seguras de phishing e reporte ágil à TI alinhado à LGPD.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={onStartFeaturedScenario}
                className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-teal-900 font-bold text-sm hover:bg-teal-50 transition-colors shadow-sm cursor-pointer"
              >
                <MailWarning className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Testar Simulação do Laboratório</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('lessons')}
                className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700/70 text-white border border-teal-400/30 font-semibold text-sm hover:bg-teal-700 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Microaulas (2 min)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white border border-white/20 font-semibold text-sm hover:bg-white/20 transition-colors cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Painel TI & DPO</span>
              </button>
            </div>
          </div>

          {/* Progress card */}
          <div className="w-full xl:w-64 shrink-0 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4">
            <div className="text-xs font-semibold text-teal-100 uppercase tracking-wider mb-2">
              Progresso nesta sessão
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-teal-100">Simulações:</span>
                <span className="font-bold">
                  {evaluatedCount}/{totalScenarios}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-100">Precisão atual:</span>
                <span className="font-bold">
                  {evaluatedCount > 0 ? `${accuracyPercent}%` : 'Aguardando'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-100">Microaulas:</span>
                <span className="font-bold">
                  {completedLessonsCount}/{totalLessons}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O que o projeto faz e Para quem (Destaque Público) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-xs space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            O que o Shield Health faz
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Conscientização cibernética prática e alerta precoce na saúde
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Treina colaboradores contra golpes de engenharia social com
            simulações seguras de phishing de plantão, microaulas de 2 minutos e
            um canal rápido de reporte à TI que monitora o prazo legal de 3 dias
            úteis da Resolução ANPD nº 15/2024 (LGPD).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-200 p-6 shadow-xs space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-3 py-1 rounded-full">
            <Users className="w-4 h-4 text-sky-700" />
            Para quem é o projeto
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Hospitais, clínicas, laboratórios e equipes de TI e DPO
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Desenvolvido para profissionais da linha de frente (<strong>Laboratório</strong>,{' '}
            <strong>Enfermagem</strong>, <strong>Recepção</strong> e{' '}
            <strong>Faturamento</strong>) que lidam com urgências e dados
            sensíveis de pacientes, e para <strong>Gestores de TI, Segurança da Informação e DPOs</strong>{' '}
            que precisam reduzir riscos e comprovar conformidade com a LGPD.
          </p>
        </div>
      </section>

      {/* 4 Key Data Cards from Script */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ataques no Brasil
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            +3.000 / semana
          </div>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Média de tentativas por organização de saúde em 2025 (+40% vs ano
            anterior, acima da média mundial — Check Point).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Custo de Vazamento
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            R$ 7 milhões
          </div>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Custo médio por incidente no Brasil (Brasscom). No mundo, a saúde
            segue como o setor mais caro (IBM 2026).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Impacto do Treino
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            -90% em 1 ano
          </div>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Sem treino, quase 42% clicam em phishing na saúde. Simulações
            contínuas derrubam os cliques em ~90% (KnowBe4).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prazo LGPD / ANPD
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            3 dias úteis
          </div>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Dado de saúde é sensível. Incidentes relevantes devem ser comunicados
            à ANPD em até 3 dias úteis (Resolução nº 15/2024).
          </p>
        </div>
      </section>

      {/* Os 3 ganhos da conscientização */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-bold text-slate-900">
            Os 3 ganhos da conscientização contínua
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-bold text-teal-700 uppercase mb-1">
              1. Menos portas abertas
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Cada profissional que reconhece um golpe de urgência no plantão é
              uma invasão bloqueada antes mesmo de tocar a rede.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-bold text-teal-700 uppercase mb-1">
              2. Alerta mais cedo
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              O colaborador treinado não apenas deixa de clicar: ele avisa a TI
              em segundos, garantindo tempo para conter e cumprir a ANPD.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-bold text-teal-700 uppercase mb-1">
              3. Melhor custo-benefício
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Treinar toda a equipe durante um ano inteiro custa uma pequena
              fração de um único vazamento de R$ 7 milhões.
            </p>
          </div>
        </div>
      </section>

      {/* Casos Reais */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Hospitais na mira: casos reais
            </h2>
            <p className="text-sm text-slate-600">
              Na saúde, ataque cibernético não é só problema de TI — é risco real
              para o paciente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REAL_CASES.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {item.location}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {item.date}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {item.organization}
                </h3>
                <p className="text-xs font-medium text-rose-700 mt-1">
                  {item.vector}
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {item.impact}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-teal-800 font-medium">
                Lição: {item.lesson}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Fontes */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Fontes e Referências do Projeto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-600">
          {OFFICIAL_SOURCES.map((source) => (
            <div key={source.label} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
              <div>
                <strong className="text-slate-800">{source.label}:</strong>{' '}
                {source.detail}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
