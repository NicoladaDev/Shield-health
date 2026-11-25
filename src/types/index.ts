export const HOSPITAL_SECTORS = [
  'Laboratório',
  'Recepção',
  'Enfermagem',
  'Faturamento',
] as const;
export type HospitalSector = (typeof HOSPITAL_SECTORS)[number];

export type NavSection = 'overview' | 'simulator' | 'lessons' | 'dashboard';

export const USER_ACTIONS = ['reported', 'clicked', 'marked_safe'] as const;
export type UserActionType = (typeof USER_ACTIONS)[number];

export const INDICATOR_FIELDS = [
  'Remetente',
  'Assunto',
  'Link',
  'Anexo',
  'Urgência',
  'Autenticação',
  'Canal Oficial',
] as const;
export type RedFlagIndicatorField = (typeof INDICATOR_FIELDS)[number];

export interface RedFlagIndicator {
  id: string;
  label: string;
  field: RedFlagIndicatorField;
  explanation: string;
  severity: 'danger' | 'safe';
}

export interface EmailScenario {
  id: string;
  sector: HospitalSector;
  isPhishing: boolean;
  isFeaturedPitch?: boolean;
  isCustomCampaign?: boolean;
  receivedAt: string;
  senderName: string;
  senderEmail: string;
  recipientRole: string;
  subject: string;
  bodyParagraphs: string[];
  ctaLabel?: string;
  ctaDisplayUrl?: string;
  ctaActualUrl?: string;
  attachmentName?: string;
  urgencyTag?: string;
  relatedCaseTitle: string;
  relatedCaseSummary: string;
  indicators: RedFlagIndicator[];
  learningTakeaway: string;
}

export interface ScenarioDecision {
  scenarioId: string;
  action: UserActionType;
  isCorrect: boolean;
  decidedAt: string;
  firstAction?: UserActionType;
  hadTrapClick?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MicroLesson {
  id: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  tag: string;
  targetSectors: string;
  keyPoints: string[];
  shiftRuleTitle: string;
  shiftRuleSteps: string[];
  realCase: {
    title: string;
    year: string;
    impact: string;
  };
  quiz: QuizQuestion[];
}

export const INCIDENT_STATUSES = [
  'Em triagem TI',
  'Acesso contido',
  'Comunicado à ANPD',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_CHANNELS = [
  'E-mail de phishing',
  'Link ou tela de login falsa',
  'Mensagem WhatsApp / SMS',
  'Acesso indevido a prontuário',
] as const;
export type IncidentChannel = (typeof INCIDENT_CHANNELS)[number];

export const CHECKLIST_KEYS = [
  'containedAccess',
  'assessedPatientData',
  'notifiedDpo',
  'preparedAnpdNotice',
] as const;
export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  containedAccess: '1. Bloquear conta / link',
  assessedPatientData: '2. Auditar dados expostos',
  notifiedDpo: '3. Acionar DPO / Jurídico',
  preparedAnpdNotice: '4. Dossiê ANPD pronto',
};

export interface IncidentReport {
  id: string;
  protocol: string;
  reportedAt: string;
  sector: HospitalSector;
  channel: IncidentChannel;
  summary: string;
  involvesSensitiveHealthData: boolean;
  status: IncidentStatus;
  source: 'manual' | 'simulator';
  checklist: Record<ChecklistKey, boolean>;
}

export interface PersistedState {
  version: 1;
  employeeName: string;
  customScenarios: EmailScenario[];
  decisions: Record<string, ScenarioDecision>;
  completedLessons: string[];
  lessonAnswers: Record<string, number>;
  incidents: IncidentReport[];
  protocolSequence: number;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ReportIncidentResult =
  | { ok: true; incident: IncidentReport }
  | { ok: false; error: string };

export type CampaignLaunchResult =
  | { ok: true; scenario: EmailScenario }
  | { ok: false; error: string };

export interface RealCaseBenchmark {
  id: string;
  organization: string;
  location: string;
  date: string;
  vector: string;
  impact: string;
  lesson: string;
}
