import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  MailWarning,
  RotateCcw,
} from 'lucide-react';
import type { NavSection } from '../types';

interface LayoutProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  onOpenReportModal: () => void;
  onResetDemo: () => void;
  pendingIncidentsCount: number;
  evaluatedScenariosCount: number;
  totalScenariosCount: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  children: ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  mobileLabel: string;
  description: string;
  icon: typeof Activity;
}> = [
  {
    id: 'overview',
    label: 'Visão Geral',
    mobileLabel: 'Início',
    description: 'Cenário Brasil e casos reais',
    icon: Activity,
  },
  {
    id: 'simulator',
    label: 'Simulador de Plantão',
    mobileLabel: 'Simulador',
    description: 'Treino seguro de phishing',
    icon: MailWarning,
  },
  {
    id: 'lessons',
    label: 'Microaulas (2 min)',
    mobileLabel: 'Aulas',
    description: 'Pílulas práticas + Selo',
    icon: BookOpen,
  },
  {
    id: 'dashboard',
    label: 'Painel TI & DPO',
    mobileLabel: 'Painel TI',
    description: 'Métricas, ANPD e ROI',
    icon: BarChart3,
  },
];

export function Layout({
  activeSection,
  onNavigate,
  onOpenReportModal,
  onResetDemo,
  pendingIncidentsCount,
  evaluatedScenariosCount,
  totalScenariosCount,
  completedLessonsCount,
  totalLessonsCount,
  children,
}: LayoutProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleNavigate(section: NavSection) {
    setConfirmingReset(false);
    onNavigate(section);
  }

  function handleConfirmReset() {
    setConfirmingReset(false);
    onResetDemo();
  }

  function getBadge(id: NavSection): string | null {
    if (id === 'simulator') {
      return `${evaluatedScenariosCount}/${totalScenariosCount}`;
    }
    if (id === 'lessons') {
      return `${completedLessonsCount}/${totalLessonsCount}`;
    }
    if (id === 'dashboard' && pendingIncidentsCount > 0) {
      return `${pendingIncidentsCount}`;
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sticky Mobile Top Header + Desktop Sidebar */}
      <aside className="sticky top-0 z-30 lg:static lg:w-72 lg:min-h-screen bg-white/95 backdrop-blur-md lg:bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 print:hidden">
        <div className="px-4 py-3 sm:px-5 lg:py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleNavigate('overview')}
            aria-label="Ir para Visão Geral — Shield Health"
            className="flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer min-w-0"
          >
            <img
              src="./logo.png"
              alt="Logo Shield Health"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight tracking-tight truncate">
                Shield Health
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-teal-700 truncate">
                Defesa Humana Hospitalar
              </div>
            </div>
          </button>

          <div className="lg:hidden flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            {confirmingReset ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="min-h-10 px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Confirmar reset?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="min-h-10 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                title="Resetar estado da demonstração"
                aria-label="Resetar estado da demonstração"
                className="min-w-10 min-h-10 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenReportModal}
              className="min-h-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Reportar TI</span>
            </button>
          </div>
        </div>

        {/* Desktop Sidebar Navigation */}
        <nav
          aria-label="Navegação principal desktop"
          className="hidden lg:flex lg:flex-col gap-1.5 p-3 flex-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badge = getBadge(item.id);

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{item.label}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {item.description}
                  </div>
                </div>
                {badge && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      item.id === 'dashboard' && pendingIncidentsCount > 0
                        ? 'bg-amber-100 text-amber-800'
                        : isActive
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom quick actions (desktop) */}
        <div className="hidden lg:flex flex-col gap-3 p-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onOpenReportModal}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            Reportar Suspeita à TI
          </button>

          <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 mb-1">
              Ambiente 100% Seguro
            </div>
            Nenhum dado real de paciente circula neste simulador. Ideal para treino contínuo em plantão.
          </div>

          {confirmingReset ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-rose-900 text-center">
                Restaurar simulações, aulas e fila inicial?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="flex-1 min-h-9 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Confirmar reset?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="flex-1 min-h-9 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resetar estado da demonstração
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Subtle clinical topbar (desktop) */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Hospital Central (Ambiente de Demonstração)</span>
            <span className="text-slate-300">•</span>
            <span>Conformidade LGPD / Resolução ANPD nº 15/2024</span>
          </div>
          <div className="text-xs font-medium text-slate-500">
            Primeira linha de defesa: <strong className="text-slate-800">as pessoas</strong>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-28 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navegação principal mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] print:hidden"
      >
        <div className="grid grid-cols-4 gap-1 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badge = getBadge(item.id);

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  handleNavigate(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center min-h-12 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  {badge && (
                    <span
                      className={`absolute -top-1.5 -right-3.5 text-[10px] leading-none font-bold px-1.5 py-0.5 rounded-full ${
                        item.id === 'dashboard' && pendingIncidentsCount > 0
                          ? 'bg-amber-400 text-slate-950'
                          : isActive
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold mt-1 truncate max-w-full">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
