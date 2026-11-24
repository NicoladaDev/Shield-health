/**
 * Utilitários para cálculo do prazo de comunicação de incidente à ANPD.
 * Referência: Resolução CD/ANPD nº 15/2024 — prazo geral de 3 dias úteis
 * a partir da ciência do incidente relevante envolvendo dados sensíveis de saúde.
 */

export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate.getTime());
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      added += 1;
    }
  }

  return result;
}

export function calculateAnpdDeadline(reportedAtIso: string, businessDays = 3): Date {
  const start = new Date(reportedAtIso);
  return addBusinessDays(start, businessDays);
}

export function getHoursRemaining(deadline: Date, now: Date = new Date()): number {
  const diffMs = deadline.getTime() - now.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
}

export function formatPtBrDateTime(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function generateProtocolNumber(sequence: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const padded = String(sequence).padStart(4, '0');
  return `SHH-${year}-${padded}`;
}
