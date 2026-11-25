import { describe, expect, it } from 'vitest';
import {
  BENCHMARKS,
  calculateTrainingRoi,
  computeSectorMetrics,
  computeSimulationSummary,
  formatPercentPtBr,
} from './metrics';
import { INITIAL_SCENARIOS } from '../data/scenarios';

describe('calculateTrainingRoi', () => {
  it('shows annual training cost is vastly lower than one R$ 7M breach', () => {
    const roi = calculateTrainingRoi(400, 12);
    expect(roi.annualTrainingCostBrl).toBe(57600);
    expect(roi.costRatioTimesCheaper).toBe(122);
    expect(roi.netSavingsIfOneIncidentPreventedBrl).toBe(6942400);
    expect(roi.isCostEffective).toBe(true);
  });

  it('handles zero/negative/fractional inputs and training costs exceeding breach cost cleanly', () => {
    const zeroRoi = calculateTrainingRoi(0, 12);
    expect(zeroRoi.annualTrainingCostBrl).toBe(0);
    expect(zeroRoi.costRatioTimesCheaper).toBe(0);
    expect(zeroRoi.isCostEffective).toBe(false);

    const fractionalRoi = calculateTrainingRoi(0.5, 12);
    expect(fractionalRoi.annualTrainingCostBrl).toBe(0);
    expect(fractionalRoi.costRatioTimesCheaper).toBe(0);
    expect(fractionalRoi.netSavingsIfOneIncidentPreventedBrl).toBe(0);
    expect(fractionalRoi.isCostEffective).toBe(false);

    const expensiveRoi = calculateTrainingRoi(100_000, 20, 7_000_000);
    expect(expensiveRoi.annualTrainingCostBrl).toBe(24_000_000);
    expect(expensiveRoi.costRatioTimesCheaper).toBeCloseTo(0.29, 2);
    expect(expensiveRoi.isCostEffective).toBe(false);
    expect(expensiveRoi.netSavingsIfOneIncidentPreventedBrl).toBe(-17_000_000);
  });
});

describe('computeSimulationSummary', () => {
  it('returns observedClickRatePercent as null when no phishing scenarios were evaluated', () => {
    const emptySummary = computeSimulationSummary(INITIAL_SCENARIOS, {});
    expect(emptySummary.observedClickRatePercent).toBeNull();
    expect(emptySummary.benchmarkClickRatePercent).toBe(
      BENCHMARKS.BASELINE_PHISHING_CLICK_RATE
    );
    expect(emptySummary.phishingEvaluatedCount).toBe(0);

    const safeId = INITIAL_SCENARIOS.find((s) => !s.isPhishing)!.id;
    const safeOnlySummary = computeSimulationSummary(INITIAL_SCENARIOS, {
      [safeId]: {
        scenarioId: safeId,
        action: 'marked_safe',
        isCorrect: true,
        decidedAt: '2026-11-21T03:01:00-03:00',
      },
    });
    expect(safeOnlySummary.observedClickRatePercent).toBeNull();
    expect(safeOnlySummary.phishingEvaluatedCount).toBe(0);
    expect(safeOnlySummary.accuracyPercent).toBe(100);
  });

  it('computes accuracy and click rate from recorded decisions', () => {
    const phishingId = INITIAL_SCENARIOS.find((s) => s.isPhishing)!.id;
    const safeId = INITIAL_SCENARIOS.find((s) => !s.isPhishing)!.id;

    const summary = computeSimulationSummary(INITIAL_SCENARIOS, {
      [phishingId]: {
        scenarioId: phishingId,
        action: 'reported',
        isCorrect: true,
        decidedAt: '2026-11-21T03:00:00-03:00',
      },
      [safeId]: {
        scenarioId: safeId,
        action: 'marked_safe',
        isCorrect: true,
        decidedAt: '2026-11-21T03:01:00-03:00',
      },
    });

    expect(summary.evaluatedCount).toBe(2);
    expect(summary.correctCount).toBe(2);
    expect(summary.accuracyPercent).toBe(100);
    expect(summary.observedClickRatePercent).toBe(0);
    expect(summary.phishingReportedCount).toBe(1);
    expect(summary.phishingEvaluatedCount).toBe(1);
  });

  it('preserves trap click in click-rate KPIs even after post-click educational reporting (B2)', () => {
    const phishingId = INITIAL_SCENARIOS.find((s) => s.isPhishing)!.id;

    const summary = computeSimulationSummary(INITIAL_SCENARIOS, {
      [phishingId]: {
        scenarioId: phishingId,
        action: 'reported',
        firstAction: 'clicked',
        hadTrapClick: true,
        isCorrect: false,
        decidedAt: '2026-11-21T03:05:00-03:00',
      },
    });

    expect(summary.correctCount).toBe(0);
    expect(summary.phishingClickedCount).toBe(1);
    expect(summary.phishingReportedCount).toBe(0);
    expect(summary.observedClickRatePercent).toBe(100);
  });
});

describe('computeSectorMetrics', () => {
  it('computes 0% risk with zero errors (no artificial 4% floor) and separates trapClicks from falsePositives', () => {
    const labPhishing = INITIAL_SCENARIOS.find(
      (s) => s.sector === 'Laboratório' && s.isPhishing
    )!;
    const labSafe = INITIAL_SCENARIOS.find(
      (s) => s.sector === 'Laboratório' && !s.isPhishing
    )!;
    const enfPhishing = INITIAL_SCENARIOS.find(
      (s) => s.sector === 'Enfermagem' && s.isPhishing
    )!;
    const enfSafe = INITIAL_SCENARIOS.find(
      (s) => s.sector === 'Enfermagem' && !s.isPhishing
    )!;

    const metrics = computeSectorMetrics(INITIAL_SCENARIOS, {
      [labPhishing.id]: {
        scenarioId: labPhishing.id,
        action: 'reported',
        isCorrect: true,
        decidedAt: '2026-11-21T03:00:00-03:00',
      },
      [labSafe.id]: {
        scenarioId: labSafe.id,
        action: 'marked_safe',
        isCorrect: true,
        decidedAt: '2026-11-21T03:01:00-03:00',
      },
      [enfPhishing.id]: {
        scenarioId: enfPhishing.id,
        action: 'clicked',
        firstAction: 'clicked',
        hadTrapClick: true,
        isCorrect: false,
        decidedAt: '2026-11-21T03:02:00-03:00',
      },
      [enfSafe.id]: {
        scenarioId: enfSafe.id,
        action: 'reported',
        isCorrect: false,
        decidedAt: '2026-11-21T03:03:00-03:00',
      },
    });

    const lab = metrics.find((m) => m.sector === 'Laboratório')!;
    expect(lab.currentRiskPercent).toBe(0);
    expect(lab.trapClicks).toBe(0);
    expect(lab.falsePositives).toBe(0);

    const enf = metrics.find((m) => m.sector === 'Enfermagem')!;
    expect(enf.trapClicks).toBe(1);
    expect(enf.falsePositives).toBe(1);
    expect(enf.currentRiskPercent).toBe(100);
  });
});

describe('formatPercentPtBr', () => {
  it('formats integer and decimal percentages in pt-BR locale', () => {
    expect(formatPercentPtBr(0)).toBe('0%');
    expect(formatPercentPtBr(-0)).toBe('0%');
    expect(formatPercentPtBr(42)).toBe('42%');
    expect(formatPercentPtBr(4.2)).toBe('4,2%');
    expect(formatPercentPtBr(33.33)).toBe('33,3%');
    expect(formatPercentPtBr(Number.NaN)).toBe('0%');
  });
});
