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
  currentClickRatePercent: number;
}

export function computeSimulationSummary(
  scenarios: EmailScenario[],
  decisions: Record<string, ScenarioDecision>
): SimulationSummary {
  const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));
  const decisionList = Object.values(decisions).filter((d) => scenarioMap.has(d.scenarioId));

  let correctCount = 0;
  let phishingClickedCount = 0;
  let phishingReportedCount = 0;
  let phishingEvaluatedCount = 0;

  for (const decision of decisionList) {
    const scenario = scenarioMap.get(decision.scenarioId);
    if (!scenario) continue;

    if (decision.isCorrect) {
      correctCount += 1;
    }

    if (scenario.isPhishing) {
      phishingEvaluatedCount += 1;
      if (decision.action === 'clicked') {
        phishingClickedCount += 1;
      } else if (decision.action === 'reported') {
        phishingReportedCount += 1;
      }
    }
  }

  const evaluatedCount = decisionList.length;
  const accuracyPercent =
    evaluatedCount > 0 ? Math.round((correctCount / evaluatedCount) * 100) : 0;

  const currentClickRatePercent =
    phishingEvaluatedCount > 0
      ? Math.round((phishingClickedCount / phishingEvaluatedCount) * 1000) / 10
      : BENCHMARKS.BASELINE_PHISHING_CLICK_RATE;

  return {
    totalScenarios: scenarios.length,
    evaluatedCount,
    correctCount,
    phishingClickedCount,
    phishingReportedCount,
    phishingEvaluatedCount,
    accuracyPercent,
    currentClickRatePercent,
  };
}

export interface SectorMetric {
  sector: HospitalSector;
  baselineRiskPercent: number;
  evaluated: number;
  correct: number;
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
  const sectors: HospitalSector[] = [
    'Laboratório',
    'Recepção',
    'Enfermagem',
    'Faturamento',
  ];

  return sectors.map((sector) => {
    const sectorScenarios = scenarios.filter((s) => s.sector === sector);
    const sectorDecisions = sectorScenarios
      .map((s) => decisions[s.id])
      .filter((d): d is ScenarioDecision => Boolean(d));

    const evaluated = sectorDecisions.length;
    const correct = sectorDecisions.filter((d) => d.isCorrect).length;
    const baselineRiskPercent = SECTOR_BASELINES[sector];

    // Quando o setor ainda não foi avaliado, mantém a linha de base de referência.
    // Quando avaliado, reflete o risco observado na simulação.
    const currentRiskPercent =
      evaluated === 0
        ? baselineRiskPercent
        : Math.max(4, Math.round(((evaluated - correct) / evaluated) * 100));

    return {
      sector,
      baselineRiskPercent,
      evaluated,
      correct,
      currentRiskPercent,
    };
  });
}

export interface RoiEstimate {
  annualTrainingCostBrl: number;
  avgBreachCostBrl: number;
  costRatioTimesCheaper: number;
  netSavingsIfOneIncidentPreventedBrl: number;
}

export function calculateTrainingRoi(
  staffCount: number,
  monthlyCostPerEmployeeBrl: number,
  avgBreachCostBrl: number = BENCHMARKS.AVG_BREACH_COST_BRL
): RoiEstimate {
  const safeStaff = Math.max(1, staffCount);
  const safeMonthlyCost = Math.max(1, monthlyCostPerEmployeeBrl);
  const annualTrainingCostBrl = safeStaff * safeMonthlyCost * 12;
  const costRatioTimesCheaper = Math.max(
    1,
    Math.round(avgBreachCostBrl / annualTrainingCostBrl)
  );
  const netSavingsIfOneIncidentPreventedBrl = Math.max(
    0,
    avgBreachCostBrl - annualTrainingCostBrl
  );

  return {
    annualTrainingCostBrl,
    avgBreachCostBrl,
    costRatioTimesCheaper,
    netSavingsIfOneIncidentPreventedBrl,
  };
}

export function formatCurrencyBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}
