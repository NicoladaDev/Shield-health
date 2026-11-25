import { HOSPITAL_SECTORS } from '../types';
import type { EmailScenario, HospitalSector, ScenarioDecision } from '../types';

/** Benchmarks oficiais citados no roteiro do projeto */
export const BENCHMARKS = {
  WEEKLY_ATTACKS_BR: 3000,
  ATTACK_GROWTH_PERCENT: 40,
  AVG_BREACH_COST_BRL: 7_000_000, // Brasscom 2024
  BASELINE_PHISHING_CLICK_RATE: 42, // KnowBe4 2025 (setor saúde antes de treinamento)
  TRAINED_REDUCTION_PERCENT: 90, // KnowBe4 2025 (redução após 1 ano contínuo)
  TARGET_TRAINED_CLICK_RATE: 4.2,
  ANPD_BUSINESS_DAYS_LIMIT: 3, // Resolução ANPD nº 15/2024
} as const;

export interface SimulationSummary {
  totalScenarios: number;
  evaluatedCount: number;
  correctCount: number;
  phishingClickedCount: number;
  phishingReportedCount: number;
  phishingEvaluatedCount: number;
  accuracyPercent: number;
  observedClickRatePercent: number | null;
  benchmarkClickRatePercent: number;
}

function didClickTrap(decision: ScenarioDecision): boolean {
  return (
    decision.hadTrapClick === true ||
    decision.action === 'clicked' ||
    decision.firstAction === 'clicked'
  );
}

export function computeSimulationSummary(
  scenarios: EmailScenario[],
  decisions: Record<string, ScenarioDecision>
): SimulationSummary {
  const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));
  const decisionList = Object.entries(decisions)
    .filter(([key]) => Object.hasOwn(decisions, key) && scenarioMap.has(key))
    .map(([, d]) => d);

  let correctCount = 0;
  let phishingClickedCount = 0;
  let phishingReportedCount = 0;
  let phishingEvaluatedCount = 0;

  for (const decision of decisionList) {
    const scenario = scenarioMap.get(decision.scenarioId);
    if (!scenario) continue;

    const clickedTrap = didClickTrap(decision);

    if (decision.isCorrect && !clickedTrap) {
      correctCount += 1;
    }

    if (scenario.isPhishing) {
      phishingEvaluatedCount += 1;
      if (clickedTrap) {
        phishingClickedCount += 1;
      } else if (decision.action === 'reported') {
        phishingReportedCount += 1;
      }
    }
  }

  const evaluatedCount = decisionList.length;
  const accuracyPercent =
    evaluatedCount > 0 ? Math.round((correctCount / evaluatedCount) * 100) : 0;

  const observedClickRatePercent =
    phishingEvaluatedCount > 0
      ? Math.round((phishingClickedCount / phishingEvaluatedCount) * 1000) / 10
      : null;

  return {
    totalScenarios: scenarios.length,
    evaluatedCount,
    correctCount,
    phishingClickedCount,
    phishingReportedCount,
    phishingEvaluatedCount,
    accuracyPercent,
    observedClickRatePercent,
    benchmarkClickRatePercent: BENCHMARKS.BASELINE_PHISHING_CLICK_RATE,
  };
}

export interface SectorMetric {
  sector: HospitalSector;
  baselineRiskPercent: number;
  evaluated: number;
  correct: number;
  trapClicks: number;
  falsePositives: number;
  currentRiskPercent: number;
}

const SECTOR_BASELINES: Record<HospitalSector, number> = {
  Laboratório: 46,
  Recepção: 44,
  Enfermagem: 41,
  Faturamento: 38,
};

export function computeSectorMetrics(
  scenarios: EmailScenario[],
  decisions: Record<string, ScenarioDecision>
): SectorMetric[] {
  return HOSPITAL_SECTORS.map((sector) => {
    const sectorScenarios = scenarios.filter((s) => s.sector === sector);
    const scenarioById = new Map(sectorScenarios.map((s) => [s.id, s]));
    const sectorDecisions = sectorScenarios
      .map((s) => (Object.hasOwn(decisions, s.id) ? decisions[s.id] : undefined))
      .filter((d): d is ScenarioDecision => Boolean(d));

    const evaluated = sectorDecisions.length;
    let correct = 0;
    let trapClicks = 0;
    let falsePositives = 0;

    for (const d of sectorDecisions) {
      const scenario = scenarioById.get(d.scenarioId);
      if (!scenario) continue;
      const clickedTrap = didClickTrap(d);

      if (d.isCorrect && !clickedTrap) {
        correct += 1;
      }
      if (scenario.isPhishing && clickedTrap) {
        trapClicks += 1;
      } else if (!scenario.isPhishing && (clickedTrap || d.action !== 'marked_safe')) {
        falsePositives += 1;
      }
    }

    const baselineRiskPercent = SECTOR_BASELINES[sector];

    // Quando o setor ainda não foi avaliado, mantém a linha de base de referência.
    // Quando avaliado, reflete o risco observado real na simulação (0% se sem erros).
    const currentRiskPercent =
      evaluated === 0
        ? baselineRiskPercent
        : Math.round(((evaluated - correct) / evaluated) * 100);

    return {
      sector,
      baselineRiskPercent,
      evaluated,
      correct,
      trapClicks,
      falsePositives,
      currentRiskPercent,
    };
  });
}

export interface RoiEstimate {
  annualTrainingCostBrl: number;
  avgBreachCostBrl: number;
  costRatioTimesCheaper: number;
  netSavingsIfOneIncidentPreventedBrl: number;
  isCostEffective: boolean;
}

export function calculateTrainingRoi(
  staffCount: number,
  monthlyCostPerEmployeeBrl: number,
  avgBreachCostBrl: number = BENCHMARKS.AVG_BREACH_COST_BRL
): RoiEstimate {
  const safeBreachCost =
    Number.isFinite(avgBreachCostBrl) && avgBreachCostBrl > 0
      ? Math.min(1_000_000_000, avgBreachCostBrl)
      : BENCHMARKS.AVG_BREACH_COST_BRL;

  if (
    !Number.isFinite(staffCount) ||
    !Number.isFinite(monthlyCostPerEmployeeBrl) ||
    staffCount <= 0 ||
    Math.trunc(staffCount) <= 0 ||
    monthlyCostPerEmployeeBrl <= 0
  ) {
    return {
      annualTrainingCostBrl: 0,
      avgBreachCostBrl: safeBreachCost,
      costRatioTimesCheaper: 0,
      netSavingsIfOneIncidentPreventedBrl: 0,
      isCostEffective: false,
    };
  }

  const safeStaff = Math.min(100_000, Math.max(1, Math.trunc(staffCount)));
  const safeMonthlyCost = Math.min(100_000, monthlyCostPerEmployeeBrl);
  const annualTrainingCostBrl = Math.round(safeStaff * safeMonthlyCost * 12);
  const rawRatio = safeBreachCost / annualTrainingCostBrl;
  const costRatioTimesCheaper =
    rawRatio >= 1 ? Math.round(rawRatio) : Math.round(rawRatio * 100) / 100;
  const netSavingsIfOneIncidentPreventedBrl =
    safeBreachCost - annualTrainingCostBrl;

  return {
    annualTrainingCostBrl,
    avgBreachCostBrl: safeBreachCost,
    costRatioTimesCheaper,
    netSavingsIfOneIncidentPreventedBrl,
    isCostEffective: annualTrainingCostBrl < safeBreachCost,
  };
}

export function formatCurrencyBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentPtBr(
  value: number,
  maximumFractionDigits = 1
): string {
  const safeValue = Number.isFinite(value)
    ? Object.is(value, -0)
      ? 0
      : value
    : 0;
  const formatted = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits,
  }).format(safeValue);
  return `${formatted}%`;
}
