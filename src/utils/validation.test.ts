import { describe, expect, it } from 'vitest';
import {
  containsPotentialCpf,
  isValidEmailAddress,
  sanitizeText,
  validateCompletedLessons,
  validateIncidents,
  validateScenarioDecisions,
} from './validation';

describe('validation utilities (security hardening)', () => {
  it('strips ASCII control characters and enforces maxLength', () => {
    const dirty = '  Alerta\u0000\u0007\n  crítico   de   segurança  ';
    expect(sanitizeText(dirty, 14)).toBe('Alerta crítico');
  });

  it('validates email format and rejects invalid payloads', () => {
    expect(isValidEmailAddress('ti@hospitalcentral.org.br')).toBe(true);
    expect(isValidEmailAddress('javascript:alert(1)')).toBe(false);
    expect(isValidEmailAddress('sem-arroba.com')).toBe(false);
  });

  it('detects potential CPF strings for LGPD protection', () => {
    expect(containsPotentialCpf('Paciente CPF 123.456.789-01')).toBe(true);
    expect(containsPotentialCpf('Paciente 12345678901 internado')).toBe(true);
    expect(containsPotentialCpf('E-mail suspeito no laboratório')).toBe(false);
  });

  it('rejects malformed or tampered localStorage decisions', () => {
    const validated = validateScenarioDecisions({
      'lab-critical-result': {
        scenarioId: 'lab-critical-result',
        action: 'reported',
        isCorrect: true,
        decidedAt: '2026-11-21T03:00:00.000Z',
      },
      tampered: {
        scenarioId: 'tampered',
        action: 'exec_shell',
        isCorrect: 'yes',
        decidedAt: 'not-a-date',
      },
    });

    expect(Object.keys(validated)).toEqual(['lab-critical-result']);
  });

  it('filters unknown lesson IDs and malformed incidents', () => {
    const allowed = new Set(['lesson-why-health']);
    expect(
      validateCompletedLessons(['lesson-why-health', 'injected-id', 123], allowed)
    ).toEqual(['lesson-why-health']);

    expect(
      validateIncidents([
        { id: 'bad', protocol: 'SHH-1', sector: 'UnknownSector' },
      ])
    ).toEqual([]);
  });
});
