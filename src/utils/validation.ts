import {
  CHECKLIST_KEYS,
  HOSPITAL_SECTORS,
  INCIDENT_CHANNELS,
  INCIDENT_STATUSES,
  INDICATOR_FIELDS,
  USER_ACTIONS,
} from '../types';
import type {
  ChecklistKey,
  EmailScenario,
  HospitalSector,
  IncidentChannel,
  IncidentReport,
  IncidentStatus,
  RedFlagIndicatorField,
  ScenarioDecision,
  UserActionType,
} from '../types';

export const INPUT_LIMITS = {
  EMPLOYEE_NAME: 80,
  INCIDENT_SUMMARY: 400,
  CAMPAIGN_SUBJECT: 140,
  CAMPAIGN_SENDER_NAME: 80,
  CAMPAIGN_SENDER_EMAIL: 120,
  CAMPAIGN_MESSAGE: 400,
  MAX_URL_LENGTH: 200,
  MAX_CUSTOM_SCENARIOS: 20,
  MAX_INCIDENTS: 100,
} as const;

const VALID_SECTORS: ReadonlySet<HospitalSector> = new Set(HOSPITAL_SECTORS);
const VALID_ACTIONS: ReadonlySet<UserActionType> = new Set(USER_ACTIONS);
const VALID_CHANNELS: ReadonlySet<IncidentChannel> = new Set(INCIDENT_CHANNELS);
const VALID_STATUSES: ReadonlySet<IncidentStatus> = new Set(INCIDENT_STATUSES);
const VALID_CHECKLIST_KEYS: ReadonlySet<ChecklistKey> = new Set(CHECKLIST_KEYS);
const VALID_INDICATOR_FIELDS: ReadonlySet<RedFlagIndicatorField> = new Set(
  INDICATOR_FIELDS
);

const CONTROL_AND_BIDI_REGEX =
  /[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;

const FORBIDDEN_OBJECT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

export function isForbiddenObjectKey(key: string): boolean {
  return FORBIDDEN_OBJECT_KEYS.has(key);
}

/**
 * Valida identificadores internos contra caracteres especiais e chaves de Object.prototype.
 */
export function isSafeIdentifier(value: unknown, maxLength = 80): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9_-]+$/.test(value) &&
    !isForbiddenObjectKey(value)
  );
}

/**
 * Remove caracteres de controle ASCII (C0/C1), zero-width e Unicode bidirecionais (RTLO/Bidi)
 * sem inserir espaços, preservando o conteúdo legível antes de validações (ex.: CPF, nome).
 */
export function stripControlAndBidiChars(
  value: unknown,
  maxLength: number,
  trim = true
): string {
  if (typeof value !== 'string') return '';
  const stripped = value.replace(CONTROL_AND_BIDI_REGEX, '');
  const normalized = trim ? stripped.trim() : stripped;
  return normalized.slice(0, maxLength);
}

/**
 * Remove caracteres de controle ASCII (C0/C1) e caracteres Unicode bidirecionais (RTLO/Bidi)
 * usados para falsificação visual, normaliza espaços e aplica limite máximo.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(CONTROL_AND_BIDI_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Valida formato estrito de endereço de e-mail corporativo/simulado sem espaços, controle, Bidi ou labels inválidos.
 */
export function isValidEmailAddress(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (
    trimmed.length < 5 ||
    trimmed.length > INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL ||
    /[\u0000-\u0020\u007F-\u009F\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF<>'"]/.test(
      trimmed
    )
  ) {
    return false;
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;

  if (
    local.length < 1 ||
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
  ) {
    return false;
  }

  if (
    domain.length < 3 ||
    domain.length > 253 ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2) return false;

  const labelRegex = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
  for (const label of labels) {
    if (!labelRegex.test(label)) {
      return false;
    }
  }

  const tld = labels[labels.length - 1];
  return /^(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})$/.test(tld);
}

/**
 * Permite apenas URLs HTTP/HTTPS bem formadas, bloqueando esquemas executáveis (javascript:, data:, vbscript:, file:).
 */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (
    trimmed.length < 8 ||
    trimmed.length > INPUT_LIMITS.MAX_URL_LENGTH ||
    /[\u0000-\u0020<>'"]/.test(trimmed)
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function normalizeForIdentifierDetection(text: string): string {
  const stripped = stripControlAndBidiChars(text, text.length, false);
  return stripped
    .replace(/[\uFF10-\uFF19]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .replace(/\uFF0E/g, '.')
    .replace(/[\uFF0D\u2010-\u2015\u2212]/g, '-')
    .replace(/\uFF0F/g, '/')
    .replace(/[\u3000\u00A0]/g, ' ');
}

function isValidCpfDigits(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  const firstCheck = remainder === 10 ? 0 : remainder;
  if (firstCheck !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  const secondCheck = remainder === 10 ? 0 : remainder;
  return secondCheck === Number(digits[10]);
}

function isValidCnsDigits(digits: string): boolean {
  if (digits.length !== 15 || !/^[12789]/.test(digits) || /^(\d)\1{14}$/.test(digits)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 15; i += 1) {
    sum += Number(digits[i]) * (15 - i);
  }
  return sum % 11 === 0;
}

/**
 * Detecta CPF válido pelo algoritmo Módulo 11 (após remoção de controle/Bidi e normalização fullwidth),
 * evitando falsos positivos com telefones de 11 dígitos (ex.: 11987654321, 08001234567).
 */
export function containsPotentialCpf(text: string): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  const normalized = normalizeForIdentifierDetection(text);
  const candidates = normalized.match(
    /(?<!\d)\d{3}(?:[.\s/-]{0,3})\d{3}(?:[.\s/-]{0,3})\d{3}(?:[.\s/-]{0,3})\d{2}(?!\d)/g
  );
  if (!candidates) return false;

  return candidates.some((candidate) =>
    isValidCpfDigits(candidate.replace(/\D/g, ''))
  );
}

export interface SensitiveIdentifierDetection {
  hasCpf: boolean;
  hasCns: boolean;
  hasExplicitDocumentPattern: boolean;
  detected: boolean;
}

/**
 * Detecta identificadores sensíveis de saúde (CPF, CNS de 15 dígitos ou menção explícita a prontuário/CNS/RG)
 * sem gerar falso positivo em códigos genéricos como "Paciente #88412".
 */
export function containsSensitiveHealthIdentifier(
  text: string
): SensitiveIdentifierDetection {
  if (typeof text !== 'string' || text.length === 0) {
    return {
      hasCpf: false,
      hasCns: false,
      hasExplicitDocumentPattern: false,
      detected: false,
    };
  }

  const normalized = normalizeForIdentifierDetection(text);
  const hasCpf = containsPotentialCpf(normalized);

  const cnsCandidates = normalized.match(
    /(?<!\d)[12789]\d{2}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}(?!\d)/g
  );
  const hasCns = Boolean(
    cnsCandidates?.some((candidate) =>
      isValidCnsDigits(candidate.replace(/\D/g, ''))
    )
  );

  const hasExplicitDocumentPattern =
    /\b(?:prontu[aá]rio|cns|rg)(?:\s+(?:n[º°o.]*|n[uú]m(?:ero)?))?(?:\s*[:#=-])?\s*(?=[A-Za-z0-9.-]*\d)[A-Za-z0-9.-]{5,18}/i.test(
      normalized
    );

  return {
    hasCpf,
    hasCns,
    hasExplicitDocumentPattern,
    detected: hasCpf || hasCns || hasExplicitDocumentPattern,
  };
}

function hasCpfInText(value: unknown, maxLength: number): boolean {
  if (typeof value !== 'string') return false;
  return (
    containsPotentialCpf(stripControlAndBidiChars(value, maxLength, false)) ||
    containsPotentialCpf(sanitizeText(value, maxLength))
  );
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    )
  ) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function isHospitalSector(value: unknown): value is HospitalSector {
  return typeof value === 'string' && VALID_SECTORS.has(value as HospitalSector);
}

export function isUserAction(value: unknown): value is UserActionType {
  return typeof value === 'string' && VALID_ACTIONS.has(value as UserActionType);
}

export function isIncidentChannel(value: unknown): value is IncidentChannel {
  return typeof value === 'string' && VALID_CHANNELS.has(value as IncidentChannel);
}

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as IncidentStatus);
}

export function isChecklistKey(value: unknown): value is ChecklistKey {
  return typeof value === 'string' && VALID_CHECKLIST_KEYS.has(value as ChecklistKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateScenarioDecisions(
  raw: unknown,
  scenariosById?: ReadonlyMap<string, EmailScenario>
): Record<string, ScenarioDecision> {
  if (!isRecord(raw)) return {};
  const result: Record<string, ScenarioDecision> = {};

  for (const [key, item] of Object.entries(raw)) {
    if (!isSafeIdentifier(key)) continue;
    if (!isRecord(item)) continue;
    const scenarioId = sanitizeText(item.scenarioId, 80);
    if (!isSafeIdentifier(scenarioId) || scenarioId !== key) {
      continue;
    }
    if (!isUserAction(item.action)) continue;
    if (typeof item.isCorrect !== 'boolean') continue;
    if (!isValidIsoDate(item.decidedAt)) continue;

    const firstAction: UserActionType = isUserAction(item.firstAction)
      ? item.firstAction
      : item.action;
    const hadTrapClick =
      typeof item.hadTrapClick === 'boolean'
        ? item.hadTrapClick
        : item.action === 'clicked' || firstAction === 'clicked';

    // Coerência básica independente do cenário
    if (item.action === 'clicked' && item.isCorrect) continue;
    if (hadTrapClick && item.isCorrect) continue;
    if (firstAction === 'clicked' && !hadTrapClick) continue;
    if (firstAction === 'marked_safe' && item.action !== 'marked_safe') continue;
    if (firstAction === 'reported' && item.action !== 'reported') continue;

    if (scenariosById) {
      const scenario = scenariosById.get(scenarioId);
      if (!scenario) continue;
      const expectedIsCorrect =
        !hadTrapClick &&
        (scenario.isPhishing
          ? item.action === 'reported'
          : item.action === 'marked_safe');
      if (item.isCorrect !== expectedIsCorrect) continue;
    }

    Object.defineProperty(result, key, {
      value: {
        scenarioId,
        action: item.action,
        isCorrect: item.isCorrect,
        decidedAt: item.decidedAt,
        firstAction,
        hadTrapClick,
      } satisfies ScenarioDecision,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }

  return result;
}

export function validateCustomScenarios(raw: unknown): EmailScenario[] {
  if (!Array.isArray(raw)) return [];
  const valid: EmailScenario[] = [];

  for (const item of raw.slice(0, INPUT_LIMITS.MAX_CUSTOM_SCENARIOS)) {
    if (!isRecord(item)) continue;
    const id = sanitizeText(item.id, 80);
    const subject = sanitizeText(item.subject, INPUT_LIMITS.CAMPAIGN_SUBJECT);
    const senderName = sanitizeText(
      item.senderName,
      INPUT_LIMITS.CAMPAIGN_SENDER_NAME
    );
    const senderEmail = stripControlAndBidiChars(
      item.senderEmail,
      INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL,
      true
    );

    if (
      !isSafeIdentifier(id) ||
      !subject ||
      !senderName ||
      hasCpfInText(item.subject, INPUT_LIMITS.CAMPAIGN_SUBJECT) ||
      hasCpfInText(item.senderName, INPUT_LIMITS.CAMPAIGN_SENDER_NAME) ||
      hasCpfInText(item.senderEmail, INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL) ||
      !isValidEmailAddress(senderEmail) ||
      !isHospitalSector(item.sector) ||
      typeof item.isPhishing !== 'boolean' ||
      !Array.isArray(item.bodyParagraphs) ||
      !Array.isArray(item.indicators)
    ) {
      continue;
    }

    // Rejeita o cenário se qualquer parágrafo bruto contiver CPF
    const rawParagraphs = item.bodyParagraphs.slice(0, 6);
    if (
      rawParagraphs.some((p) => hasCpfInText(p, INPUT_LIMITS.CAMPAIGN_MESSAGE))
    ) {
      continue;
    }

    const bodyParagraphs = rawParagraphs
      .map((p) => sanitizeText(p, INPUT_LIMITS.CAMPAIGN_MESSAGE))
      .filter(Boolean);

    if (bodyParagraphs.length === 0) continue;

    // Verifica CPF nos demais 9 campos de texto e metadados (B16)
    const optionalStringFields: Array<[unknown, number]> = [
      [item.receivedAt, 60],
      [item.recipientRole, 100],
      [item.urgencyTag, 40],
      [item.ctaLabel, 80],
      [item.ctaDisplayUrl, 120],
      [item.ctaActualUrl, INPUT_LIMITS.MAX_URL_LENGTH],
      [item.relatedCaseTitle, 120],
      [item.relatedCaseSummary, 300],
      [item.learningTakeaway, 300],
    ];
    if (optionalStringFields.some(([val, limit]) => hasCpfInText(val, limit))) {
      continue;
    }

    const rawIndicatorRecords = item.indicators
      .filter((ind): ind is Record<string, unknown> => isRecord(ind))
      .slice(0, 6);

    if (
      rawIndicatorRecords.some(
        (ind) =>
          hasCpfInText(ind.label, 120) || hasCpfInText(ind.explanation, 300)
      )
    ) {
      continue;
    }

    const rawActualUrl = sanitizeText(
      item.ctaActualUrl,
      INPUT_LIMITS.MAX_URL_LENGTH
    );
    const ctaActualUrl = isSafeHttpUrl(rawActualUrl) ? rawActualUrl : undefined;

    const indicators = rawIndicatorRecords
      .map((ind, idx) => {
        const candidateId = sanitizeText(ind.id, 60);
        const field: RedFlagIndicatorField = VALID_INDICATOR_FIELDS.has(
          ind.field as RedFlagIndicatorField
        )
          ? (ind.field as RedFlagIndicatorField)
          : 'Remetente';
        return {
          id: isSafeIdentifier(candidateId, 60) ? candidateId : `ind-${idx}`,
          label: sanitizeText(ind.label, 120),
          field,
          explanation: sanitizeText(ind.explanation, 300),
          severity: ind.severity === 'safe' ? ('safe' as const) : ('danger' as const),
        };
      })
      .filter((ind) => Boolean(ind.label && ind.explanation));

    valid.push({
      id,
      sector: item.sector,
      isPhishing: item.isPhishing,
      isCustomCampaign: true,
      receivedAt: sanitizeText(item.receivedAt, 60) || 'Campanha TI',
      senderName,
      senderEmail,
      recipientRole:
        sanitizeText(item.recipientRole, 100) || `Colaborador(a) — ${item.sector}`,
      subject,
      urgencyTag: sanitizeText(item.urgencyTag, 40) || 'CAMPANHA SIMULADA',
      bodyParagraphs,
      ctaLabel: ctaActualUrl
        ? sanitizeText(item.ctaLabel, 80) || undefined
        : undefined,
      ctaDisplayUrl: ctaActualUrl
        ? sanitizeText(item.ctaDisplayUrl, 120) || undefined
        : undefined,
      ctaActualUrl,
      relatedCaseTitle:
        sanitizeText(item.relatedCaseTitle, 120) || 'Campanha Interna Ativa',
      relatedCaseSummary:
        sanitizeText(item.relatedCaseSummary, 300) ||
        'Simulação educativa interna.',
      indicators,
      learningTakeaway:
        sanitizeText(item.learningTakeaway, 300) ||
        'Valide sempre demandas urgentes no canal oficial do hospital.',
    });
  }

  return valid;
}

export function trimIncidentsWithActiveProtection(
  incidents: IncidentReport[],
  maxIncidents: number
): { incidents: IncidentReport[]; droppedActive: boolean } {
  if (incidents.length <= maxIncidents) {
    return { incidents, droppedActive: false };
  }

  const next = [...incidents];
  const evictionOrder: IncidentStatus[] = ['Comunicado à ANPD', 'Acesso contido'];

  for (const statusToEvict of evictionOrder) {
    for (let i = next.length - 1; i >= 0 && next.length > maxIncidents; i -= 1) {
      if (next[i].status === statusToEvict) {
        next.splice(i, 1);
      }
    }
  }

  if (next.length > maxIncidents) {
    return {
      incidents: next.slice(0, maxIncidents),
      droppedActive: true,
    };
  }

  return { incidents: next, droppedActive: false };
}

export function validateIncidents(raw: unknown): IncidentReport[] | null {
  if (!Array.isArray(raw)) return null;
  const valid: IncidentReport[] = [];

  for (const item of raw.slice(0, INPUT_LIMITS.MAX_INCIDENTS * 5)) {
    if (!isRecord(item)) continue;
    const id = sanitizeText(item.id, 80);
    const protocol = sanitizeText(item.protocol, 40);
    const summary = sanitizeText(item.summary, INPUT_LIMITS.INCIDENT_SUMMARY);

    if (
      !isSafeIdentifier(id) ||
      !protocol ||
      !summary ||
      hasCpfInText(item.summary, INPUT_LIMITS.INCIDENT_SUMMARY) ||
      !isValidIsoDate(item.reportedAt) ||
      !isHospitalSector(item.sector) ||
      !isIncidentChannel(item.channel) ||
      !isIncidentStatus(item.status) ||
      typeof item.involvesSensitiveHealthData !== 'boolean' ||
      !isRecord(item.checklist)
    ) {
      continue;
    }

    valid.push({
      id,
      protocol,
      reportedAt: item.reportedAt,
      sector: item.sector,
      channel: item.channel,
      summary,
      involvesSensitiveHealthData: item.involvesSensitiveHealthData,
      status: item.status,
      source: item.source === 'simulator' ? 'simulator' : 'manual',
      checklist: {
        containedAccess: Boolean(item.checklist.containedAccess),
        assessedPatientData: Boolean(item.checklist.assessedPatientData),
        notifiedDpo: Boolean(item.checklist.notifiedDpo),
        preparedAnpdNotice: Boolean(item.checklist.preparedAnpdNotice),
      },
    });
  }

  return trimIncidentsWithActiveProtection(valid, INPUT_LIMITS.MAX_INCIDENTS)
    .incidents;
}

export function validateCompletedLessons(
  raw: unknown,
  allowedIds: ReadonlySet<string>
): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();

  for (const item of raw) {
    if (typeof item === 'string' && allowedIds.has(item)) {
      unique.add(item);
    }
  }

  return Array.from(unique);
}

export function validateLessonAnswers(
  raw: unknown,
  allowedQuestions: ReadonlyMap<string, number>
): Record<string, number> {
  if (!isRecord(raw)) return {};
  const result: Record<string, number> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (isForbiddenObjectKey(key)) continue;
    const parts = key.split(':');
    if (parts.length !== 2) continue;
    const [lessonId, questionId] = parts;
    if (!isSafeIdentifier(lessonId) || !isSafeIdentifier(questionId)) continue;

    const optionsCount = allowedQuestions.get(key);
    if (optionsCount === undefined) continue;
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 0 ||
      value >= optionsCount
    ) {
      continue;
    }

    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }

  return result;
}
