import type {
  EmailScenario,
  HospitalSector,
  IncidentChannel,
  IncidentReport,
  IncidentStatus,
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
  MAX_CUSTOM_SCENARIOS: 20,
  MAX_INCIDENTS: 100,
} as const;

const VALID_SECTORS = new Set<HospitalSector>([
  'Laboratório',
  'Recepção',
  'Enfermagem',
  'Faturamento',
]);

const VALID_ACTIONS = new Set<UserActionType>([
  'reported',
  'clicked',
  'marked_safe',
]);

const VALID_CHANNELS = new Set<IncidentChannel>([
  'E-mail de phishing',
  'Link ou tela de login falsa',
  'Mensagem WhatsApp / SMS',
  'Acesso indevido a prontuário',
]);

const VALID_STATUSES = new Set<IncidentStatus>([
  'Em triagem TI',
  'Acesso contido',
  'Comunicado à ANPD',
]);

const FORBIDDEN_OBJECT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export function isForbiddenObjectKey(key: string): boolean {
  return FORBIDDEN_OBJECT_KEYS.has(key);
}

/**
 * Remove caracteres de controle ASCII (C0/C1) e caracteres Unicode bidirecionais (RTLO/Bidi)
 * usados para falsificação visual, normaliza espaços e aplica limite máximo.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Valida formato básico de endereço de e-mail corporativo/simulado sem aceitar espaços ou scripts.
 */
export function isValidEmailAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL) {
    return false;
  }
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed);
}

/**
 * Detecta possível CPF (formatado ou 11 dígitos seguidos) para evitar inserção acidental
 * de dado pessoal sensível de paciente em textos livres (LGPD / Privacy by Design).
 */
export function containsPotentialCpf(text: string): boolean {
  return /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(text);
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function isHospitalSector(value: unknown): value is HospitalSector {
  return typeof value === 'string' && VALID_SECTORS.has(value as HospitalSector);
}

function isUserAction(value: unknown): value is UserActionType {
  return typeof value === 'string' && VALID_ACTIONS.has(value as UserActionType);
}

function isIncidentChannel(value: unknown): value is IncidentChannel {
  return typeof value === 'string' && VALID_CHANNELS.has(value as IncidentChannel);
}

function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as IncidentStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateScenarioDecisions(
  raw: unknown
): Record<string, ScenarioDecision> {
  if (!isRecord(raw)) return {};
  const result: Record<string, ScenarioDecision> = {};

  for (const [key, item] of Object.entries(raw)) {
    if (isForbiddenObjectKey(key)) continue;
    if (!isRecord(item)) continue;
    const scenarioId = sanitizeText(item.scenarioId, 80);
    if (!scenarioId || scenarioId !== key || isForbiddenObjectKey(scenarioId)) {
      continue;
    }
    if (!isUserAction(item.action)) continue;
    if (typeof item.isCorrect !== 'boolean') continue;
    if (!isValidIsoDate(item.decidedAt)) continue;

    Object.defineProperty(result, key, {
      value: {
        scenarioId,
        action: item.action,
        isCorrect: item.isCorrect,
        decidedAt: item.decidedAt,
      },
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
    const senderEmail = sanitizeText(
      item.senderEmail,
      INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL
    );
    if (
      !id ||
      !subject ||
      !senderName ||
      !isValidEmailAddress(senderEmail) ||
      !isHospitalSector(item.sector) ||
      typeof item.isPhishing !== 'boolean' ||
      !Array.isArray(item.bodyParagraphs) ||
      !Array.isArray(item.indicators)
    ) {
      continue;
    }

    const bodyParagraphs = item.bodyParagraphs
      .map((p) => sanitizeText(p, INPUT_LIMITS.CAMPAIGN_MESSAGE))
      .filter(Boolean)
      .slice(0, 6);

    if (bodyParagraphs.length === 0) continue;

    const indicators = item.indicators
      .filter((ind): ind is Record<string, unknown> => isRecord(ind))
      .map((ind, idx) => ({
        id: sanitizeText(ind.id, 60) || `ind-${idx}`,
        label: sanitizeText(ind.label, 120),
        field: (
          [
            'Remetente',
            'Assunto',
            'Link',
            'Anexo',
            'Urgência',
            'Autenticação',
            'Canal Oficial',
          ] as const
        ).includes(ind.field as never)
          ? (ind.field as EmailScenario['indicators'][number]['field'])
          : ('Remetente' as const),
        explanation: sanitizeText(ind.explanation, 300),
        severity: ind.severity === 'safe' ? ('safe' as const) : ('danger' as const),
      }))
      .filter((ind) => Boolean(ind.label && ind.explanation))
      .slice(0, 6);

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
      ctaLabel: sanitizeText(item.ctaLabel, 80) || undefined,
      ctaDisplayUrl: sanitizeText(item.ctaDisplayUrl, 120) || undefined,
      ctaActualUrl: sanitizeText(item.ctaActualUrl, 160) || undefined,
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

export function validateIncidents(raw: unknown): IncidentReport[] | null {
  if (!Array.isArray(raw)) return null;
  const valid: IncidentReport[] = [];

  for (const item of raw.slice(0, INPUT_LIMITS.MAX_INCIDENTS)) {
    if (!isRecord(item)) continue;
    const id = sanitizeText(item.id, 80);
    const protocol = sanitizeText(item.protocol, 40);
    const summary = sanitizeText(item.summary, INPUT_LIMITS.INCIDENT_SUMMARY);

    if (
      !id ||
      !protocol ||
      !summary ||
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

  return valid;
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
