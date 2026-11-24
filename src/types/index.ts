export type HospitalSector =
  | 'Laboratório'
  | 'Recepção'
  | 'Enfermagem'
  | 'Faturamento';

export type NavSection = 'overview' | 'simulator' | 'lessons' | 'dashboard';

export type UserActionType = 'reported' | 'clicked' | 'marked_safe';

export interface RedFlagIndicator {
  id: string;
  label: string;
  field: 'Remetente' | 'Assunto' | 'Link' | 'Anexo' | 'Urgência' | 'Autenticação' | 'Canal Oficial';
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

export type IncidentStatus = 'Em triagem TI' | 'Acesso contido' | 'Comunicado à ANPD';

export type IncidentChannel =
  | 'E-mail de phishing'
  | 'Link ou tela de login falsa'
  | 'Mensagem WhatsApp / SMS'
  | 'Acesso indevido a prontuário';

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
  checklist: {
    containedAccess: boolean;
    assessedPatientData: boolean;
    notifiedDpo: boolean;
    preparedAnpdNotice: boolean;
  };
}

export interface RealCaseBenchmark {
  id: string;
  organization: string;
  location: string;
  date: string;
  vector: string;
  impact: string;
  lesson: string;
}
