import { useEffect, useState } from 'react';
import { MICRO_LESSONS } from '../data/lessons';
import { INITIAL_SCENARIOS } from '../data/scenarios';
import type {
  EmailScenario,
  HospitalSector,
  IncidentChannel,
  IncidentReport,
  IncidentStatus,
  ScenarioDecision,
  UserActionType,
} from '../types';
import { generateProtocolNumber } from '../utils/anpd';
import {
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeText,
  validateCompletedLessons,
  validateCustomScenarios,
  validateIncidents,
  validateScenarioDecisions,
} from '../utils/validation';

const STORAGE_KEY = 'shield_health_state_v1';
const ALLOWED_LESSON_IDS = new Set(MICRO_LESSONS.map((l) => l.id));

interface PersistedState {
  employeeName: string;
  customScenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  completedLessons: string[];
  incidents: IncidentReport[];
  protocolSequence: number;
}

function createInitialIncidents(): IncidentReport[] {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: 'inc-seed-1',
      protocol: 'SHH-2026-0001',
      reportedAt: twoHoursAgo,
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
    employeeName: 'Dra. Camila Nogueira',
    customScenarios: [],
    decisions: {},
    completedLessons: [],
    incidents: createInitialIncidents(),
    protocolSequence: 2,
  };
}

function loadState(): PersistedState {
  const defaults = createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return defaults;
    }

    const obj = parsed as Record<string, unknown>;
    const sanitizedName = sanitizeText(obj.employeeName, INPUT_LIMITS.EMPLOYEE_NAME);
    const validatedIncidents = validateIncidents(obj.incidents);
    const seq =
      typeof obj.protocolSequence === 'number' &&
      Number.isInteger(obj.protocolSequence) &&
      obj.protocolSequence >= 1 &&
      obj.protocolSequence <= 999999
        ? obj.protocolSequence
        : defaults.protocolSequence;

    return {
      employeeName: sanitizedName || defaults.employeeName,
      customScenarios: validateCustomScenarios(obj.customScenarios),
      decisions: validateScenarioDecisions(obj.decisions),
      completedLessons: validateCompletedLessons(
        obj.completedLessons,
        ALLOWED_LESSON_IDS
      ),
      incidents: validatedIncidents ?? defaults.incidents,
      protocolSequence: seq,
    };
  } catch {
    return defaults;
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
  const [state, setState] = useState<PersistedState>(() => loadState());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [state]);

  const scenarios: EmailScenario[] = [
    ...state.customScenarios,
    ...INITIAL_SCENARIOS,
  ];

  function recordDecision(scenarioId: string, action: UserActionType) {
    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return;

    const isCorrect = scenario.isPhishing
      ? action === 'reported'
      : action === 'marked_safe';

    const nowIso = new Date().toISOString();

    setState((prev) => {
      const nextDecisions: Record<string, ScenarioDecision> = {
        ...prev.decisions,
        [scenarioId]: {
          scenarioId,
          action,
          isCorrect,
          decidedAt: nowIso,
        },
      };

      const alreadyLogged = prev.incidents.some(
        (inc) => inc.id === `inc-sim-${scenarioId}`
      );
      let nextIncidents = prev.incidents;
      let nextSeq = prev.protocolSequence;

      if (scenario.isPhishing && action === 'reported' && !alreadyLogged) {
        const protocol = generateProtocolNumber(nextSeq);
        nextSeq += 1;
        const simIncident: IncidentReport = {
          id: `inc-sim-${scenarioId}`,
          protocol,
          reportedAt: nowIso,
          sector: scenario.sector,
          channel: 'E-mail de phishing',
          summary: sanitizeText(
            `Alerta precoce via simulador: "${scenario.subject}" (${scenario.senderEmail}).`,
            INPUT_LIMITS.INCIDENT_SUMMARY
          ),
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
        nextIncidents = [simIncident, ...prev.incidents].slice(
          0,
          INPUT_LIMITS.MAX_INCIDENTS
        );
      }

      return {
        ...prev,
        decisions: nextDecisions,
        incidents: nextIncidents,
        protocolSequence: nextSeq,
      };
    });
  }

  function completeLesson(lessonId: string) {
    if (!ALLOWED_LESSON_IDS.has(lessonId)) return;
    setState((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      return {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
      };
    });
  }

  function reportIncident(input: CreateIncidentInput): IncidentReport {
    const nowIso = new Date().toISOString();
    const protocol = generateProtocolNumber(state.protocolSequence);
    const cleanSummary = sanitizeText(input.summary, INPUT_LIMITS.INCIDENT_SUMMARY);

    const newIncident: IncidentReport = {
      id: `inc-${Date.now()}`,
      protocol,
      reportedAt: nowIso,
      sector: input.sector,
      channel: input.channel,
      summary:
        cleanSummary ||
        `Suspeita de ${input.channel.toLowerCase()} reportada pelo setor de ${input.sector}.`,
      involvesSensitiveHealthData: input.involvesSensitiveHealthData,
      status: 'Em triagem TI',
      source: 'manual',
      checklist: {
        containedAccess: false,
        assessedPatientData: false,
        notifiedDpo: false,
        preparedAnpdNotice: false,
      },
    };

    setState((prev) => ({
      ...prev,
      incidents: [newIncident, ...prev.incidents].slice(0, INPUT_LIMITS.MAX_INCIDENTS),
      protocolSequence: prev.protocolSequence + 1,
    }));

    return newIncident;
  }

  function updateIncidentStatus(incidentId: string, status: IncidentStatus) {
    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, status } : inc
      ),
    }));
  }

  function toggleIncidentChecklist(
    incidentId: string,
    key: keyof IncidentReport['checklist']
  ) {
    setState((prev) => ({
      ...prev,
      incidents: prev.incidents.map((inc) =>
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
    }));
  }

  function launchCustomCampaign(input: CreateCampaignInput): EmailScenario | null {
    const subject = sanitizeText(input.subject, INPUT_LIMITS.CAMPAIGN_SUBJECT);
    const senderName = sanitizeText(
      input.senderName,
      INPUT_LIMITS.CAMPAIGN_SENDER_NAME
    );
    const senderEmail = sanitizeText(
      input.senderEmail,
      INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL
    );
    const urgencyMessage = sanitizeText(
      input.urgencyMessage,
      INPUT_LIMITS.CAMPAIGN_MESSAGE
    );

    if (!subject || !senderName || !isValidEmailAddress(senderEmail) || !urgencyMessage) {
      return null;
    }

    const scenario: EmailScenario = {
      id: `custom-${Date.now()}`,
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
      ctaActualUrl: 'http://validacao-segura-externa.net/login',
      relatedCaseTitle: 'Campanha Interna Ativa — Shield Health',
      relatedCaseSummary:
        'Simulações periódicas e personalizadas por setor reduzem cliques em até 90% em 12 meses (KnowBe4).',
      indicators: [
        {
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
            'O link direciona para "http://validacao-segura-externa.net/login" fora da intranet hospitalar.',
          severity: 'danger',
        },
      ],
      learningTakeaway:
        'Valide sempre demandas urgentes no sistema oficial do hospital e reporte e-mails suspeitos à TI.',
    };

    setState((prev) => ({
      ...prev,
      customScenarios: [scenario, ...prev.customScenarios].slice(
        0,
        INPUT_LIMITS.MAX_CUSTOM_SCENARIOS
      ),
    }));

    return scenario;
  }

  function setEmployeeName(name: string) {
    const clean = name
      .replace(/[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .slice(0, INPUT_LIMITS.EMPLOYEE_NAME);
    setState((prev) => ({ ...prev, employeeName: clean }));
  }

  function resetDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(createDefaultState());
  }

  return {
    employeeName: state.employeeName,
    scenarios,
    decisions: state.decisions,
    completedLessons: state.completedLessons,
    incidents: state.incidents,
    recordDecision,
    completeLesson,
    reportIncident,
    updateIncidentStatus,
    toggleIncidentChecklist,
    launchCustomCampaign,
    setEmployeeName,
    resetDemo,
  };
}
