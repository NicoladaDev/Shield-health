import { describe, expect, it } from 'vitest';
import { calculateTrainingRoi, computeSimulationSummary } from './metrics';
import { INITIAL_SCENARIOS } from '../data/scenarios';

describe('calculateTrainingRoi', () => {
  it('shows annual training cost is vastly lower than one R$ 7M breach', () => {
    const roi = calculateTrainingRoi(400, 12);
    expect(roi.annualTrainingCostBrl).toBe(57600);
    expect(roi.costRatioTimesCheaper).toBe(122);
    expect(roi.netSavingsIfOneIncidentPreventedBrl).toBe(6942400);
  });
});

describe('computeSimulationSummary', () => {
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
    expect(summary.currentClickRatePercent).toBe(0);
    expect(summary.phishingReportedCount).toBe(1);
  });
});
