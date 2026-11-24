import { useMemo, useState } from 'react';
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

  const summary = useMemo(
    () => computeSimulationSummary(store.scenarios, store.decisions),
    [store.scenarios, store.decisions]
  );

  const pendingIncidentsCount = store.incidents.filter(
    (inc) => inc.status === 'Em triagem TI'
  ).length;

  function handleStartFeaturedScenario() {
    setFeaturedScenarioId('lab-critical-result');
    setActiveSection('simulator');
  }

  return (
    <>
      <Layout
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onResetDemo={() => {
          store.resetDemo();
          setActiveSection('overview');
        }}
        pendingIncidentsCount={pendingIncidentsCount}
        evaluatedScenariosCount={summary.evaluatedCount}
        totalScenariosCount={summary.totalScenarios}
        completedLessonsCount={store.completedLessons.length}
        totalLessonsCount={MICRO_LESSONS.length}
      >
        {activeSection === 'overview' && (
          <OverviewPage
            onNavigate={setActiveSection}
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
            onGoToDashboard={() => setActiveSection('dashboard')}
          />
        )}

        {activeSection === 'lessons' && (
          <LessonsPage
            completedLessons={store.completedLessons}
            employeeName={store.employeeName}
            onCompleteLesson={store.completeLesson}
            onChangeEmployeeName={store.setEmployeeName}
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
              const created = store.launchCustomCampaign(input);
              if (created) {
                setFeaturedScenarioId(created.id);
              }
            }}
            onGoToSimulator={() => setActiveSection('simulator')}
          />
        )}
      </Layout>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={store.reportIncident}
        onGoToDashboard={() => setActiveSection('dashboard')}
      />
    </>
  );
}

export default App;
