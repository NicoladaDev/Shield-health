import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Layout } from './components/Layout';
import { ReportModal } from './components/ReportModal';
import { MICRO_LESSONS } from './data/lessons';
import { DashboardPage } from './pages/DashboardPage';
import { LessonsPage } from './pages/LessonsPage';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { usePlatformStore } from './store/usePlatformStore';
import type { NavSection } from './types';
import { computeSimulationSummary } from './utils/metrics';

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [featuredScenarioId, setFeaturedScenarioId] = useState<
    string | undefined
  >(undefined);

  const store = usePlatformStore();
  const suppressLessonFlushRef = useRef(false);

  useEffect(() => {
    if (activeSection === 'lessons') {
      suppressLessonFlushRef.current = false;
    }
  }, [activeSection]);

  const summary = useMemo(
    () => computeSimulationSummary(store.scenarios, store.decisions),
    [store.scenarios, store.decisions]
  );

  const pendingIncidentsCount = store.incidents.filter(
    (inc) => inc.status === 'Em triagem TI'
  ).length;

  function handleNavigate(section: NavSection) {
    if (section !== 'simulator') {
      setFeaturedScenarioId(undefined);
    }
    setActiveSection(section);
  }

  function handleStartFeaturedScenario() {
    setFeaturedScenarioId('lab-critical-result');
    setActiveSection('simulator');
  }

  function handleDeleteCustomCampaign(scenarioId: string) {
    store.deleteCustomCampaign(scenarioId);
    setFeaturedScenarioId((prev) => (prev === scenarioId ? undefined : prev));
  }

  return (
    <>
      <Layout
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onResetDemo={() => {
          suppressLessonFlushRef.current = true;
          store.resetDemo();
          setFeaturedScenarioId(undefined);
          setActiveSection('overview');
        }}
        pendingIncidentsCount={pendingIncidentsCount}
        evaluatedScenariosCount={summary.evaluatedCount}
        totalScenariosCount={summary.totalScenarios}
        completedLessonsCount={store.completedLessons.length}
        totalLessonsCount={MICRO_LESSONS.length}
      >
        {store.storageWarning && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 shadow-xs print:hidden"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">
                {store.storageWarning}
              </span>
            </div>
            <button
              type="button"
              onClick={store.dismissStorageWarning}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dispensar</span>
            </button>
          </div>
        )}

        {activeSection === 'overview' && (
          <OverviewPage
            onNavigate={handleNavigate}
            onStartFeaturedScenario={handleStartFeaturedScenario}
            accuracyPercent={summary.accuracyPercent}
            evaluatedCount={summary.evaluatedCount}
            totalScenarios={summary.totalScenarios}
            completedLessonsCount={store.completedLessons.length}
            totalLessons={MICRO_LESSONS.length}
          />
        )}

        {activeSection === 'simulator' && (
          <SimulatorPage
            scenarios={store.scenarios}
            decisions={store.decisions}
            initialSelectedId={featuredScenarioId}
            onRecordDecision={store.recordDecision}
            onDeleteCustomCampaign={handleDeleteCustomCampaign}
            onGoToDashboard={() => handleNavigate('dashboard')}
          />
        )}

        {activeSection === 'lessons' && (
          <LessonsPage
            completedLessons={store.completedLessons}
            lessonAnswers={store.lessonAnswers}
            employeeName={store.employeeName}
            resetVersion={store.resetVersion}
            onCompleteLesson={store.completeLesson}
            onSaveLessonAnswer={store.saveLessonAnswer}
            onChangeEmployeeName={(name) => {
              if (suppressLessonFlushRef.current) {
                return { ok: true };
              }
              return store.setEmployeeName(name);
            }}
            correctSimulationsCount={summary.correctCount}
          />
        )}

        {activeSection === 'dashboard' && (
          <DashboardPage
            scenarios={store.scenarios}
            decisions={store.decisions}
            incidents={store.incidents}
            completedLessonsCount={store.completedLessons.length}
            totalLessonsCount={MICRO_LESSONS.length}
            onUpdateIncidentStatus={store.updateIncidentStatus}
            onToggleIncidentChecklist={store.toggleIncidentChecklist}
            onLaunchCampaign={(input) => {
              const result = store.launchCustomCampaign(input);
              if (result.ok) {
                setFeaturedScenarioId(result.scenario.id);
              }
              return result;
            }}
            onDeleteCustomCampaign={handleDeleteCustomCampaign}
            onGoToSimulator={() => setActiveSection('simulator')}
          />
        )}
      </Layout>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={store.reportIncident}
        onGoToDashboard={() => handleNavigate('dashboard')}
      />
    </>
  );
}

export default App;
