import { describe, expect, it } from 'vitest';
import { INITIAL_SCENARIOS } from '../data/scenarios';
import {
  containsPotentialCpf,
  containsSensitiveHealthIdentifier,
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeText,
  stripControlAndBidiChars,
  validateCompletedLessons,
  validateCustomScenarios,
  validateIncidents,
  validateLessonAnswers,
  validateScenarioDecisions,
} from './validation';

describe('validation utilities (security hardening)', () => {
  it('strips ASCII control characters and enforces maxLength', () => {
    const dirty = '  Alerta\u0000\u0007\n  crítico   de   segurança  ';
    expect(sanitizeText(dirty, 14)).toBe('Alerta crítico');

    expect(stripControlAndBidiChars('Ana\u200B \u202EMaria ', 20, false)).toBe(
      'Ana Maria '
    );
    expect(stripControlAndBidiChars('  Ana\uFEFF Maria  ', 20, true)).toBe(
      'Ana Maria'
    );
  });

  it('validates email format strictly and rejects invalid labels or dots (B17)', () => {
    expect(isValidEmailAddress('ti@hospitalcentral.org.br')).toBe(true);
    expect(isValidEmailAddress('alerta@teste.invalid')).toBe(true);
    expect(isValidEmailAddress('javascript:alert(1)')).toBe(false);
    expect(isValidEmailAddress('sem-arroba.com')).toBe(false);
    expect(isValidEmailAddress('user@.com')).toBe(false);
    expect(isValidEmailAddress('user@hosp..com')).toBe(false);
    expect(isValidEmailAddress('user@hosp.com.')).toBe(false);
    expect(isValidEmailAddress('.user@hosp.com')).toBe(false);
    expect(isValidEmailAddress('user@hosp.-br')).toBe(false);
  });

  it('detects valid mod-11 CPFs while avoiding false positives on phone numbers (B9)', () => {
    expect(containsPotentialCpf('Paciente CPF 123.456.789-09')).toBe(true);
    expect(containsPotentialCpf('Paciente 12345678909 internado')).toBe(true);
    expect(containsPotentialCpf('CPF 123. 456. 789-09')).toBe(true);
    expect(containsPotentialCpf('CPF 123.  456.  789-09')).toBe(true);
    expect(containsPotentialCpf('CPF 123\u200E45678909')).toBe(true);
    expect(containsPotentialCpf('CPF 123\u00AD456\u00AD789\u00AD09')).toBe(true);
    expect(containsPotentialCpf('CPF 123\u034F456\u180E78909')).toBe(true);
    expect(containsPotentialCpf('CPF 123.456.789\u201309')).toBe(true);
    expect(containsPotentialCpf('CPF 123.456.789\u201409')).toBe(true);
    expect(containsPotentialCpf('CPF １２３．４５６．７８９－０９')).toBe(true);

    // Rejects invalid check digits, repeated digits, and 11-digit phone numbers
    expect(containsPotentialCpf('Paciente CPF 123.456.789-01')).toBe(false);
    expect(containsPotentialCpf('11111111111')).toBe(false);
    expect(containsPotentialCpf('Contato (11) 11987654321')).toBe(false);
    expect(containsPotentialCpf('SAC 08001234567')).toBe(false);
    expect(containsPotentialCpf('E-mail suspeito no laboratório')).toBe(false);
  });

  it('detects CNS and explicit health document patterns without flagging Patient #88412 or plain words', () => {
    expect(
      containsSensitiveHealthIdentifier('Paciente #88412 — UTI Adulto').detected
    ).toBe(false);
    expect(
      containsSensitiveHealthIdentifier('Paciente #88412').detected
    ).toBe(false);
    expect(
      containsSensitiveHealthIdentifier('Prontuário eletrônico do hospital').detected
    ).toBe(false);
    expect(
      containsSensitiveHealthIdentifier('Acesso ao prontuário digital').detected
    ).toBe(false);
    expect(
      containsSensitiveHealthIdentifier('RG corporativo inválido').detected
    ).toBe(false);
    expect(
      containsSensitiveHealthIdentifier('CNS 700000000000005 confirmado').hasCns
    ).toBe(true);
    expect(
      containsSensitiveHealthIdentifier('Prontuário nº 998123 em anexo')
        .hasExplicitDocumentPattern
    ).toBe(true);
    expect(
      containsSensitiveHealthIdentifier('Prontuário nº: 998123')
        .hasExplicitDocumentPattern
    ).toBe(true);
    expect(
      containsSensitiveHealthIdentifier('Prontuário n.º: 998123')
        .hasExplicitDocumentPattern
    ).toBe(true);
    expect(
      containsSensitiveHealthIdentifier('Prontuário número: 998123')
        .hasExplicitDocumentPattern
    ).toBe(true);
    expect(
      containsSensitiveHealthIdentifier('Prontuário 123456').detected
    ).toBe(true);
    expect(
      containsSensitiveHealthIdentifier('RG 12.345.678-9').detected
    ).toBe(true);
  });

  it('rejects CPF across senderEmail and all custom scenario fields (B1, B16)', () => {
    const baseScenario = {
      id: 'custom-cpf-check',
      sector: 'Recepção',
      isPhishing: true,
      senderName: 'Suporte TI',
      senderEmail: 'suporte@teste.invalid',
      subject: 'Aviso de segurança',
      bodyParagraphs: ['Mensagem normal sem dados pessoais.'],
      indicators: [
        {
          id: 'ind-1',
          label: 'Indicador normal',
          field: 'Remetente',
          explanation: 'Explicação normal',
          severity: 'danger',
        },
      ],
    };

    expect(
      validateCustomScenarios([
        { ...baseScenario, senderEmail: '12345678909@teste.invalid' },
      ])
    ).toHaveLength(0);

    const fieldsToTest = [
      { recipientRole: 'Recepção 123.456.789-09' },
      { urgencyTag: 'CPF 12345678909' },
      { ctaLabel: 'Validar 12345678909' },
      { ctaDisplayUrl: 'portal.invalid/12345678909' },
      { relatedCaseTitle: 'Caso 123.456.789-09' },
      { relatedCaseSummary: 'Resumo 123.456.789-09' },
      { learningTakeaway: 'Dica 123.456.789-09' },
      {
        indicators: [
          {
            id: 'i1',
            label: 'CPF 123.456.789-09',
            field: 'Remetente',
            explanation: 'Normal',
            severity: 'danger',
          },
        ],
      },
      {
        indicators: [
          {
            id: 'i1',
            label: 'Normal',
            field: 'Remetente',
            explanation: 'CPF 123.456.789-09',
            severity: 'danger',
          },
        ],
      },
    ];

    for (const override of fieldsToTest) {
      expect(
        validateCustomScenarios([{ ...baseScenario, ...override }])
      ).toHaveLength(0);
    }
  });

  it('validates scenario decisions consistency, scenariosById, and legacy hydration (B18)', () => {
    const scenariosById = new Map(INITIAL_SCENARIOS.map((s) => [s.id, s]));

    const validated = validateScenarioDecisions(
      {
        'lab-critical-result': {
          scenarioId: 'lab-critical-result',
          action: 'reported',
          isCorrect: true,
          decidedAt: '2026-11-21T03:00:00.000Z',
        },
        'enf-pep-mfa': {
          scenarioId: 'enf-pep-mfa',
          action: 'clicked',
          isCorrect: true, // tampered: clicked cannot be correct
          decidedAt: '2026-11-21T03:00:00.000Z',
        },
        tampered: {
          scenarioId: 'tampered',
          action: 'exec_shell',
          isCorrect: 'yes',
          decidedAt: 'not-a-date',
        },
      },
      scenariosById
    );

    expect(Object.keys(validated)).toEqual(['lab-critical-result']);
    expect(validated['lab-critical-result'].firstAction).toBe('reported');
    expect(validated['lab-critical-result'].hadTrapClick).toBe(false);

    const impossibleTransitions = validateScenarioDecisions(
      {
        'lab-critical-result': {
          scenarioId: 'lab-critical-result',
          action: 'reported',
          firstAction: 'marked_safe',
          hadTrapClick: false,
          isCorrect: true,
          decidedAt: '2026-11-21T03:00:00.000Z',
        },
        'enf-pep-mfa': {
          scenarioId: 'enf-pep-mfa',
          action: 'marked_safe',
          firstAction: 'reported',
          hadTrapClick: false,
          isCorrect: false,
          decidedAt: '2026-11-21T03:00:00.000Z',
        },
      },
      scenariosById
    );
    expect(impossibleTransitions).toEqual({});
  });

  it('validates lessonAnswers safely and rejects prototype keys or out-of-bounds options (B18)', () => {
    const allowedQuestions = new Map<string, number>([
      ['lesson-why-health:q1-1', 3],
    ]);

    const malicious = JSON.parse(
      '{"__proto__:q1":0,"lesson-why-health:q1-1":1,"lesson-why-health:q1-2":0,"lesson-why-health:q1-1-bad":9}'
    );
    const validated = validateLessonAnswers(malicious, allowedQuestions);
    expect(validated).toEqual({ 'lesson-why-health:q1-1': 1 });

    expect(
      validateLessonAnswers({ 'lesson-why-health:q1-1': 5 }, allowedQuestions)
    ).toEqual({});
  });

  it('filters unknown lesson IDs, malformed incidents, and preserves active incidents on overflow (B8)', () => {
    const allowed = new Set(['lesson-why-health']);
    expect(
      validateCompletedLessons(['lesson-why-health', 'injected-id', 123], allowed)
    ).toEqual(['lesson-why-health']);

    expect(
      validateIncidents([
        { id: 'bad', protocol: 'SHH-1', sector: 'UnknownSector' },
      ])
    ).toEqual([]);

    const resolvedBatch = Array.from(
      { length: INPUT_LIMITS.MAX_INCIDENTS },
      (_, i) => ({
        id: `inc-resolved-${i}`,
        protocol: `SHH-2026-${String(i + 1).padStart(4, '0')}`,
        reportedAt: '2026-11-24T00:00:00.000Z',
        sector: 'Recepção',
        channel: 'E-mail de phishing',
        summary: 'Incidente já comunicado',
        involvesSensitiveHealthData: true,
        status: 'Comunicado à ANPD',
        source: 'manual',
        checklist: {
          containedAccess: true,
          assessedPatientData: true,
          notifiedDpo: true,
          preparedAnpdNotice: true,
        },
      })
    );
    const activeTrailing = Array.from({ length: 3 }, (_, i) => ({
      id: `inc-active-${i}`,
      protocol: `SHH-2026-${String(200 + i).padStart(4, '0')}`,
      reportedAt: '2026-11-25T00:00:00.000Z',
      sector: 'Laboratório',
      channel: 'E-mail de phishing',
      summary: 'Incidente ativo em triagem',
      involvesSensitiveHealthData: true,
      status: 'Em triagem TI',
      source: 'manual',
      checklist: {
        containedAccess: false,
        assessedPatientData: false,
        notifiedDpo: false,
        preparedAnpdNotice: false,
      },
    }));

    const hydrated = validateIncidents([...resolvedBatch, ...activeTrailing]);
    expect(hydrated).toHaveLength(INPUT_LIMITS.MAX_INCIDENTS);
    expect(hydrated?.filter((i) => i.status === 'Em triagem TI')).toHaveLength(3);
  });
});
