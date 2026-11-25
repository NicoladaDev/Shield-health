import { useEffect, useMemo, useRef, useState } from 'react';
import { MICRO_LESSONS } from '../data/lessons';
import { INITIAL_SCENARIOS } from '../data/scenarios';
import type {
  ActionResult,
  CampaignLaunchResult,
  ChecklistKey,
  EmailScenario,
  HospitalSector,
  IncidentChannel,
  IncidentReport,
  IncidentStatus,
  PersistedState,
  ReportIncidentResult,
  ScenarioDecision,
  UserActionType,
} from '../types';
import { generateProtocolNumber } from '../utils/anpd';
import {
  containsPotentialCpf,
  INPUT_LIMITS,
  isChecklistKey,
  isHospitalSector,
  isIncidentChannel,
  isIncidentStatus,
  isSafeIdentifier,
  isUserAction,
  isValidEmailAddress,
  sanitizeText,
  stripControlAndBidiChars,
  trimIncidentsWithActiveProtection,
  validateCompletedLessons,
  validateCustomScenarios,
  validateIncidents,
  validateLessonAnswers,
  validateScenarioDecisions,
} from '../utils/validation';

const STORAGE_KEY = 'shield_health_state_v1';
const ALLOWED_LESSON_IDS = new Set(MICRO_LESSONS.map((l) => l.id));
const ALLOWED_LESSON_QUESTIONS: ReadonlyMap<string, number> = new Map(
  MICRO_LESSONS.flatMap((lesson) =>
    lesson.quiz.map((q) => [`${lesson.id}:${q.id}`, q.options.length] as const)
  )
);

function generateSafeId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function createInitialIncidents(): IncidentReport[] {
  const twoHoursAgoDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return [
    {
      id: 'inc-seed-1',
      protocol: generateProtocolNumber(1, twoHoursAgoDate),
      reportedAt: twoHoursAgoDate.toISOString(),
      sector: 'Recepção',
      channel: 'E-mail de phishing',
      summary:
        'Colaboradora reportou e-mail falso de convênio solicitando planilha de pacientes internados antes de abrir o link.',
      involvesSensitiveHealthData: true,
      status: 'Acesso contido',
      source: 'manual',
      checklist: {
        containedAccess: true,
        assessedPatientData: true,
        notifiedDpo: true,
        preparedAnpdNotice: false,
      },
    },
  ];
}

function createDefaultState(): PersistedState {
  return {
    version: 1,
    employeeName: 'Dra. Camila Nogueira',
    customScenarios: [],
    decisions: {},
    completedLessons: [],
    lessonAnswers: {},
    incidents: createInitialIncidents(),
    protocolSequence: 2,
  };
}

function loadState(): { state: PersistedState; warning: string | null } {
  const defaults = createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: defaults, warning: null };

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        state: defaults,
        warning:
          'Os dados salvos localmente estavam inválidos e a demonstração foi restaurada.',
      };
    }

    const obj = parsed as Record<string, unknown>;
    if (obj.version !== undefined && obj.version !== 1) {
      return {
        state: defaults,
        warning:
          'Versão incompatível de dados locais; o estado padrão foi restaurado.',
      };
    }

    const strippedName = stripControlAndBidiChars(
      obj.employeeName,
      INPUT_LIMITS.EMPLOYEE_NAME,
      false
    );
    let safeName = defaults.employeeName;
    if (typeof obj.employeeName === 'string') {
      if (strippedName.trim() === '') {
        safeName = '';
      } else if (!containsPotentialCpf(strippedName)) {
        safeName = strippedName;
      }
    }

    const customScenarios = validateCustomScenarios(obj.customScenarios);
    const scenariosById = new Map(
      [...customScenarios, ...INITIAL_SCENARIOS].map((s) => [s.id, s])
    );
    const decisions = validateScenarioDecisions(obj.decisions, scenariosById);
    const completedLessons = validateCompletedLessons(
      obj.completedLessons,
      ALLOWED_LESSON_IDS
    );
    const lessonAnswers = validateLessonAnswers(
      obj.lessonAnswers,
      ALLOWED_LESSON_QUESTIONS
    );
    const validatedIncidents = validateIncidents(obj.incidents);
    const incidents = validatedIncidents ?? defaults.incidents;

    let seq = defaults.protocolSequence;
    if (
      typeof obj.protocolSequence === 'number' &&
      Number.isInteger(obj.protocolSequence) &&
      obj.protocolSequence >= 1
    ) {
      seq = ((obj.protocolSequence - 1) % 999999) + 1;
    }

    return {
      state: {
        version: 1,
        employeeName: safeName,
        customScenarios,
        decisions,
        completedLessons,
        lessonAnswers,
        incidents,
        protocolSequence: seq,
      },
      warning: null,
    };
  } catch {
    return {
      state: defaults,
      warning:
        'Não foi possível ler os dados salvos localmente; o estado padrão foi restaurado.',
    };
  }
}

export interface CreateIncidentInput {
  sector: HospitalSector;
  channel: IncidentChannel;
  summary: string;
  involvesSensitiveHealthData: boolean;
}

export interface CreateCampaignInput {
  sector: HospitalSector;
  subject: string;
  senderName: string;
  senderEmail: string;
  urgencyMessage: string;
}

export function usePlatformStore() {
  const [initialLoad] = useState(() => loadState());
  const [state, setState] = useState<PersistedState>(initialLoad.state);
  const [storageWarning, setStorageWarning] = useState<string | null>(
    initialLoad.warning
  );
  const [resetVersion, setResetVersion] = useState(0);
  const stateRef = useRef<PersistedState>(state);
  const protocolSeqRef = useRef<number>(state.protocolSequence);

  useEffect(() => {
    stateRef.current = state;
    protocolSeqRef.current = state.protocolSequence;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageWarning(
        'Armazenamento local cheio ou indisponível: alterações recentes podem não persistir após recarregar.'
      );
    }
  }, [state]);

  const scenarios: EmailScenario[] = useMemo(
    () => [...state.customScenarios, ...INITIAL_SCENARIOS],
    [state.customScenarios]
  );

  function dismissStorageWarning() {
    setStorageWarning(null);
  }

  function nextProtocol(): { protocol: string; nextSeq: number } {
    const current =
      protocolSeqRef.current >= 1 && protocolSeqRef.current <= 999999
        ? protocolSeqRef.current
        : 1;
    const nextSeq = current >= 999999 ? 1 : current + 1;
    protocolSeqRef.current = nextSeq;
    return {
      protocol: generateProtocolNumber(current),
      nextSeq,
    };
  }

  function recordDecision(scenarioId: string, action: UserActionType) {
    if (!isSafeIdentifier(scenarioId) || !isUserAction(action)) return;
    const current = stateRef.current;
    const scenario = [...current.customScenarios, ...INITIAL_SCENARIOS].find(
      (item) => item.id === scenarioId
    );
    if (!scenario) return;

    const existing = Object.hasOwn(current.decisions, scenarioId)
      ? current.decisions[scenarioId]
      : undefined;

    if (existing) {
      const allowPostClickReport =
        scenario.isPhishing &&
        existing.action === 'clicked' &&
        action === 'reported';
      if (!allowPostClickReport) {
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const firstAction: UserActionType =
      existing?.firstAction ?? existing?.action ?? action;
    const hadTrapClick =
      Boolean(existing?.hadTrapClick) ||
      existing?.action === 'clicked' ||
      firstAction === 'clicked' ||
      action === 'clicked';
    const isCorrect =
      !hadTrapClick &&
      (scenario.isPhishing ? action === 'reported' : action === 'marked_safe');

    const nextDecisions: Record<string, ScenarioDecision> = {
      ...current.decisions,
    };
    Object.defineProperty(nextDecisions, scenarioId, {
      value: {
        scenarioId,
        action,
        isCorrect,
        decidedAt: nowIso,
        firstAction,
        hadTrapClick,
      } satisfies ScenarioDecision,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    let nextIncidents = current.incidents;
    let nextSeq = current.protocolSequence;
    let droppedActiveWarning = false;

    const shouldCreateIncident =
      scenario.isPhishing &&
      action === 'reported' &&
      !current.incidents.some((inc) => inc.id === `inc-sim-${scenarioId}`);

    if (shouldCreateIncident) {
      const allocated = nextProtocol();
      const rawSimSummary = sanitizeText(
        `Alerta precoce via simulador: "${scenario.subject}" (${scenario.senderEmail}).`,
        INPUT_LIMITS.INCIDENT_SUMMARY
      );
      const safeSimSummary = containsPotentialCpf(
        stripControlAndBidiChars(rawSimSummary, INPUT_LIMITS.INCIDENT_SUMMARY, false)
      )
        ? `Alerta precoce via simulador (${scenario.sector}).`
        : rawSimSummary;

      const simIncident: IncidentReport = {
        id: `inc-sim-${scenarioId}`,
        protocol: allocated.protocol,
        reportedAt: nowIso,
        sector: scenario.sector,
        channel: 'E-mail de phishing',
        summary: safeSimSummary,
        involvesSensitiveHealthData: true,
        status: 'Em triagem TI',
        source: 'simulator',
        checklist: {
          containedAccess: true,
          assessedPatientData: false,
          notifiedDpo: false,
          preparedAnpdNotice: false,
        },
      };

      const trimmed = trimIncidentsWithActiveProtection(
        [simIncident, ...current.incidents],
        INPUT_LIMITS.MAX_INCIDENTS
      );
      nextIncidents = trimmed.incidents;
      droppedActiveWarning = trimmed.droppedActive;
      nextSeq = allocated.nextSeq;
    }

    const nextState: PersistedState = {
      ...current,
      decisions: nextDecisions,
      incidents: nextIncidents,
      protocolSequence: nextSeq,
    };
    stateRef.current = nextState;
    setState(nextState);

    if (droppedActiveWarning) {
      setStorageWarning(
        'Fila de incidentes ativos atingiu o limite máximo; o registro mais antigo em triagem foi arquivado.'
      );
    }
  }

  function completeLesson(lessonId: string) {
    if (!ALLOWED_LESSON_IDS.has(lessonId)) return;
    const current = stateRef.current;
    if (current.completedLessons.includes(lessonId)) return;
    const nextState: PersistedState = {
      ...current,
      completedLessons: [...current.completedLessons, lessonId],
    };
    stateRef.current = nextState;
    setState(nextState);
  }

  function saveLessonAnswer(
    lessonId: string,
    questionId: string,
    optionIndex: number
  ) {
    if (!isSafeIdentifier(lessonId) || !isSafeIdentifier(questionId)) return;
    const key = `${lessonId}:${questionId}`;
    const optionsCount = ALLOWED_LESSON_QUESTIONS.get(key);
    if (
      optionsCount === undefined ||
      !Number.isInteger(optionIndex) ||
      optionIndex < 0 ||
      optionIndex >= optionsCount
    ) {
      return;
    }

    const current = stateRef.current;
    const nextLessonAnswers = { ...current.lessonAnswers };
    Object.defineProperty(nextLessonAnswers, key, {
      value: optionIndex,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    const nextState: PersistedState = {
      ...current,
      lessonAnswers: nextLessonAnswers,
    };
    stateRef.current = nextState;
    setState(nextState);
  }

  function reportIncident(input: CreateIncidentInput): ReportIncidentResult {
    if (!isHospitalSector(input.sector) || !isIncidentChannel(input.channel)) {
      return {
        ok: false,
        error: 'Selecione um setor e um canal válidos para o incidente.',
      };
    }

    const strippedSummary = stripControlAndBidiChars(
      input.summary,
      INPUT_LIMITS.INCIDENT_SUMMARY,
      true
    );
    const cleanSummary = sanitizeText(
      input.summary,
      INPUT_LIMITS.INCIDENT_SUMMARY
    );

    if (!cleanSummary || !strippedSummary) {
      return {
        ok: false,
        error: 'Descreva brevemente o ocorrido antes de enviar o alerta à TI.',
      };
    }

    if (
      containsPotentialCpf(cleanSummary) ||
      containsPotentialCpf(strippedSummary)
    ) {
      return {
        ok: false,
        error:
          'Proteção LGPD: padrão semelhante a CPF detectado. Remova dados pessoais reais de pacientes antes de enviar.',
      };
    }

    const current = stateRef.current;
    const nowIso = new Date().toISOString();
    const allocated = nextProtocol();

    const newIncident: IncidentReport = {
      id: generateSafeId('inc'),
      protocol: allocated.protocol,
      reportedAt: nowIso,
      sector: input.sector,
      channel: input.channel,
      summary: cleanSummary,
      involvesSensitiveHealthData: Boolean(input.involvesSensitiveHealthData),
      status: 'Em triagem TI',
      source: 'manual',
      checklist: {
        containedAccess: false,
        assessedPatientData: false,
        notifiedDpo: false,
        preparedAnpdNotice: false,
      },
    };

    const trimmed = trimIncidentsWithActiveProtection(
      [newIncident, ...current.incidents],
      INPUT_LIMITS.MAX_INCIDENTS
    );

    const nextState: PersistedState = {
      ...current,
      incidents: trimmed.incidents,
      protocolSequence: allocated.nextSeq,
    };
    stateRef.current = nextState;
    setState(nextState);

    if (trimmed.droppedActive) {
      setStorageWarning(
        'Fila de incidentes ativos atingiu o limite máximo; o registro mais antigo em triagem foi arquivado.'
      );
    }

    return { ok: true, incident: newIncident };
  }

  function updateIncidentStatus(incidentId: string, status: IncidentStatus) {
    if (!isSafeIdentifier(incidentId) || !isIncidentStatus(status)) return;
    const current = stateRef.current;
    const nextState: PersistedState = {
      ...current,
      incidents: current.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, status } : inc
      ),
    };
    stateRef.current = nextState;
    setState(nextState);
  }

  function toggleIncidentChecklist(incidentId: string, key: ChecklistKey) {
    if (!isSafeIdentifier(incidentId) || !isChecklistKey(key)) return;
    const current = stateRef.current;
    const nextState: PersistedState = {
      ...current,
      incidents: current.incidents.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              checklist: {
                ...inc.checklist,
                [key]: !inc.checklist[key],
              },
            }
          : inc
      ),
    };
    stateRef.current = nextState;
    setState(nextState);
  }

  function launchCustomCampaign(
    input: CreateCampaignInput
  ): CampaignLaunchResult {
    if (!isHospitalSector(input.sector)) {
      return { ok: false, error: 'Selecione um setor hospitalar válido.' };
    }

    const strippedSubject = stripControlAndBidiChars(
      input.subject,
      INPUT_LIMITS.CAMPAIGN_SUBJECT,
      true
    );
    const strippedSenderName = stripControlAndBidiChars(
      input.senderName,
      INPUT_LIMITS.CAMPAIGN_SENDER_NAME,
      true
    );
    const senderEmail = stripControlAndBidiChars(
      input.senderEmail,
      INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL,
      true
    );
    const strippedUrgencyMessage = stripControlAndBidiChars(
      input.urgencyMessage,
      INPUT_LIMITS.CAMPAIGN_MESSAGE,
      true
    );

    const subject = sanitizeText(input.subject, INPUT_LIMITS.CAMPAIGN_SUBJECT);
    const senderName = sanitizeText(
      input.senderName,
      INPUT_LIMITS.CAMPAIGN_SENDER_NAME
    );
    const urgencyMessage = sanitizeText(
      input.urgencyMessage,
      INPUT_LIMITS.CAMPAIGN_MESSAGE
    );

    if (!subject || !senderName || !urgencyMessage) {
      return {
        ok: false,
        error: 'Preencha remetente, assunto e texto da isca educativa.',
      };
    }

    if (!isValidEmailAddress(senderEmail)) {
      return {
        ok: false,
        error: 'Informe um endereço de e-mail válido para a simulação.',
      };
    }

    if (
      containsPotentialCpf(subject) ||
      containsPotentialCpf(strippedSubject) ||
      containsPotentialCpf(senderName) ||
      containsPotentialCpf(strippedSenderName) ||
      containsPotentialCpf(senderEmail) ||
      containsPotentialCpf(urgencyMessage) ||
      containsPotentialCpf(strippedUrgencyMessage)
    ) {
      return {
        ok: false,
        error:
          'Proteção LGPD: padrão semelhante a CPF detectado. Remova dados pessoais antes de criar a campanha.',
      };
    }

    const usesInternalDomain = senderEmail
      .toLowerCase()
      .endsWith('@hospitalcentral.org.br');

    const scenario: EmailScenario = {
      id: generateSafeId('custom'),
      sector: input.sector,
      isPhishing: true,
      isCustomCampaign: true,
      receivedAt: 'Agora mesmo (Campanha TI)',
      senderName,
      senderEmail,
      recipientRole: `Colaborador(a) — ${input.sector}`,
      subject,
      urgencyTag: 'CAMPANHA SIMULADA',
      bodyParagraphs: [
        `Olá equipe do setor de ${input.sector},`,
        urgencyMessage,
        'Clique no botão abaixo e informe seu usuário e senha corporativos para concluir imediatamente.',
      ],
      ctaLabel: 'Acessar validação imediata',
      ctaDisplayUrl: 'portal.hospitalcentral.org.br/acesso',
      ctaActualUrl: 'http://validacao-segura.invalid/login',
      relatedCaseTitle: 'Campanha Interna Ativa — Shield Health',
      relatedCaseSummary:
        'Simulações periódicas e personalizadas por setor reduzem cliques em até 90% em 12 meses (KnowBe4).',
      indicators: [
        usesInternalDomain
          ? {
              id: 'custom-ind-1',
              label: 'Pedido de credenciais simulando remetente interno',
              field: 'Remetente',
              explanation: `Mesmo usando "${senderEmail}" (@hospitalcentral.org.br), a equipe de TI legítima nunca solicita senha por link externo.`,
              severity: 'danger',
            }
          : {
              id: 'custom-ind-1',
              label: 'Remetente externo fora do domínio oficial',
              field: 'Remetente',
              explanation: `O endereço "${senderEmail}" não pertence ao domínio oficial "@hospitalcentral.org.br".`,
              severity: 'danger',
            },
        {
          id: 'custom-ind-2',
          label: 'Solicitação de credenciais por link externo',
          field: 'Link',
          explanation:
            'O link direciona para "http://validacao-segura.invalid/login" fora da intranet hospitalar.',
          severity: 'danger',
        },
      ],
      learningTakeaway:
        'Valide sempre demandas urgentes no sistema oficial do hospital e reporte e-mails suspeitos à TI.',
    };

    const current = stateRef.current;
    const combined = [scenario, ...current.customScenarios];
    const kept = combined.slice(0, INPUT_LIMITS.MAX_CUSTOM_SCENARIOS);
    const removedIds = new Set(
      combined.slice(INPUT_LIMITS.MAX_CUSTOM_SCENARIOS).map((s) => s.id)
    );

    let nextDecisions = current.decisions;
    if (removedIds.size > 0) {
      nextDecisions = {};
      for (const [key, val] of Object.entries(current.decisions)) {
        if (Object.hasOwn(current.decisions, key) && !removedIds.has(key)) {
          Object.defineProperty(nextDecisions, key, {
            value: val,
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
      }
    }

    const nextState: PersistedState = {
      ...current,
      customScenarios: kept,
      decisions: nextDecisions,
    };
    stateRef.current = nextState;
    setState(nextState);

    return { ok: true, scenario };
  }

  function deleteCustomCampaign(scenarioId: string) {
    if (!isSafeIdentifier(scenarioId)) return;
    const current = stateRef.current;
    const existsInCustom = current.customScenarios.some(
      (s) => s.id === scenarioId
    );
    if (!existsInCustom) return;

    const nextCustomScenarios = current.customScenarios.filter(
      (s) => s.id !== scenarioId
    );
    const nextDecisions: Record<string, ScenarioDecision> = {};
    for (const [key, val] of Object.entries(current.decisions)) {
      if (Object.hasOwn(current.decisions, key) && key !== scenarioId) {
        Object.defineProperty(nextDecisions, key, {
          value: val,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }

    const nextState: PersistedState = {
      ...current,
      customScenarios: nextCustomScenarios,
      decisions: nextDecisions,
    };
    stateRef.current = nextState;
    setState(nextState);
  }

  function setEmployeeName(name: string): ActionResult {
    const clean = stripControlAndBidiChars(
      name,
      INPUT_LIMITS.EMPLOYEE_NAME,
      false
    );
    if (containsPotentialCpf(clean)) {
      return {
        ok: false,
        error: 'Proteção LGPD: não insira número de CPF neste campo.',
      };
    }
    const current = stateRef.current;
    const nextState: PersistedState = { ...current, employeeName: clean };
    stateRef.current = nextState;
    setState(nextState);
    return { ok: true };
  }

  function resetDemo() {
    const defaults = createDefaultState();
    stateRef.current = defaults;
    protocolSeqRef.current = defaults.protocolSequence;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors in restricted environments
    }
    setStorageWarning(null);
    setState(defaults);
    setResetVersion((prev) => prev + 1);
  }

  return {
    employeeName: state.employeeName,
    scenarios,
    decisions: state.decisions,
    completedLessons: state.completedLessons,
    lessonAnswers: state.lessonAnswers,
    incidents: state.incidents,
    storageWarning,
    resetVersion,
    dismissStorageWarning,
    recordDecision,
    completeLesson,
    saveLessonAnswer,
    reportIncident,
    updateIncidentStatus,
    toggleIncidentChecklist,
    launchCustomCampaign,
    deleteCustomCampaign,
    setEmployeeName,
    resetDemo,
  };
}
