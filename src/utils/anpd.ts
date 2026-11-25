import type { IncidentStatus } from '../types';

/**
 * Utilitários para cálculo do prazo de comunicação de incidente à ANPD.
 * Referência: Resolução CD/ANPD nº 15/2024 — prazo geral de 3 dias úteis
 * a partir da ciência do incidente relevante envolvendo dados sensíveis de saúde.
 * Considera fins de semana e feriados nacionais brasileiros (fixos + móveis 2025–2027).
 */

const MAX_BUSINESS_DAYS = 365;

/** Feriados nacionais fixos (MM-DD), incluindo 20/11 (Lei nº 14.759/2023). */
const FIXED_NATIONAL_HOLIDAYS: ReadonlySet<string> = new Set([
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia Nacional de Zumbi e da Consciência Negra
  '12-25', // Natal
]);

/** Feriados nacionais móveis 2025–2027 (YYYY-MM-DD). */
const MOVABLE_NATIONAL_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2025
  '2025-03-03', // Carnaval (segunda)
  '2025-03-04', // Carnaval (terça)
  '2025-04-18', // Sexta-feira Santa
  '2025-06-19', // Corpus Christi
  // 2026
  '2026-02-16', // Carnaval (segunda)
  '2026-02-17', // Carnaval (terça)
  '2026-04-03', // Sexta-feira Santa
  '2026-06-04', // Corpus Christi
  // 2027
  '2027-02-08', // Carnaval (segunda)
  '2027-02-09', // Carnaval (terça)
  '2027-03-26', // Sexta-feira Santa
  '2027-05-27', // Corpus Christi
]);

function toSafeDate(input: Date | string): Date {
  const parsed = typeof input === 'string' ? new Date(input) : new Date(input.getTime());
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

export function isBrazilianNationalHoliday(date: Date): boolean {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    return false;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthDay = `${month}-${day}`;
  const fullDate = `${year}-${monthDay}`;
  return (
    FIXED_NATIONAL_HOLIDAYS.has(monthDay) ||
    MOVABLE_NATIONAL_HOLIDAYS.has(fullDate)
  );
}

export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = toSafeDate(startDate);
  const safeDays = Number.isFinite(businessDays)
    ? Math.min(MAX_BUSINESS_DAYS, Math.max(0, Math.trunc(businessDays)))
    : 3;
  let added = 0;

  while (added < safeDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend && !isBrazilianNationalHoliday(result)) {
      added += 1;
    }
  }

  return result;
}

export function calculateAnpdDeadline(reportedAtIso: string, businessDays = 3): Date {
  const start = toSafeDate(reportedAtIso);
  return addBusinessDays(start, businessDays);
}

export function getHoursRemaining(
  deadline: Date | string,
  now: Date = new Date()
): number {
  const safeDeadline = toSafeDate(deadline);
  const safeNow = toSafeDate(now);
  const diffMs = safeDeadline.getTime() - safeNow.getTime();
  const rounded = Math.round(diffMs / (1000 * 60 * 60));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function isAnpdOverdue(
  deadline: Date | string,
  now: Date = new Date()
): boolean {
  const safeDeadline = toSafeDate(deadline);
  const safeNow = toSafeDate(now);
  return safeDeadline.getTime() < safeNow.getTime();
}

export interface AnpdDeadlineStatus {
  deadline: Date;
  isCompleted: boolean;
  isOverdue: boolean;
  isUrgent: boolean;
  hoursRemaining: number;
  hoursOverdue: number;
  label: string;
}

export function getAnpdDeadlineStatus(
  reportedAtIso: string,
  status: IncidentStatus,
  now: Date = new Date(),
  businessDays = 3
): AnpdDeadlineStatus {
  const deadline = calculateAnpdDeadline(reportedAtIso, businessDays);
  const safeNow = toSafeDate(now);

  if (status === 'Comunicado à ANPD') {
    return {
      deadline,
      isCompleted: true,
      isOverdue: false,
      isUrgent: false,
      hoursRemaining: 0,
      hoursOverdue: 0,
      label: 'Comunicado à ANPD',
    };
  }

  const diffMs = deadline.getTime() - safeNow.getTime();
  if (diffMs < 0) {
    const hoursOverdue = Math.max(1, Math.ceil(Math.abs(diffMs) / 3_600_000));
    return {
      deadline,
      isCompleted: false,
      isOverdue: true,
      isUrgent: true,
      hoursRemaining: 0,
      hoursOverdue,
      label: `Prazo vencido (${hoursOverdue}h)`,
    };
  }

  if (diffMs < 1_800_000) {
    return {
      deadline,
      isCompleted: false,
      isOverdue: false,
      isUrgent: true,
      hoursRemaining: 0,
      hoursOverdue: 0,
      label: 'Menos de 1h restante',
    };
  }

  const hoursRemaining = Math.max(1, Math.round(diffMs / 3_600_000));
  return {
    deadline,
    isCompleted: false,
    isOverdue: false,
    isUrgent: hoursRemaining <= 24,
    hoursRemaining,
    hoursOverdue: 0,
    label: `${hoursRemaining}h restantes`,
  };
}

export function formatPtBrDateTime(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (!Number.isFinite(parsed.getTime())) {
    return 'Data inválida';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function generateProtocolNumber(sequence: number, date: Date = new Date()): string {
  const safeDate = toSafeDate(date);
  const safeSeq = Number.isFinite(sequence)
    ? Math.max(1, Math.min(999999, Math.trunc(sequence)))
    : 1;
  const year = safeDate.getFullYear();
  const padded = String(safeSeq).padStart(4, '0');
  return `SHH-${year}-${padded}`;
}
