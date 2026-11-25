import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  calculateAnpdDeadline,
  formatPtBrDateTime,
  generateProtocolNumber,
  getAnpdDeadlineStatus,
  getHoursRemaining,
  isAnpdOverdue,
  isBrazilianNationalHoliday,
} from './anpd';

describe('addBusinessDays & Brazilian holidays (Resolução ANPD nº 15/2024)', () => {
  it('adds 3 business days within the same workweek', () => {
    // Monday, 2026-11-16 10:00 -> Thursday, 2026-11-19 10:00
    const start = new Date('2026-11-16T10:00:00-03:00');
    const deadline = addBusinessDays(start, 3);
    expect(deadline.getDate()).toBe(19);
    expect(deadline.getDay()).toBe(4);
  });

  it('skips fixed national holiday (20/11 Consciência Negra) and weekend', () => {
    // Tuesday, 2026-11-17 10:00 -> +1 Wed 18, +2 Thu 19, (Fri 20 holiday, Sat 21, Sun 22) -> +3 Mon 2026-11-23
    const start = new Date('2026-11-17T10:00:00-03:00');
    const deadline = addBusinessDays(start, 3);
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(10); // November
    expect(deadline.getDate()).toBe(23);
    expect(deadline.getDay()).toBe(1);
  });

  it('skips Christmas fixed holiday and movable holidays (Good Friday 2026)', () => {
    expect(isBrazilianNationalHoliday(new Date('2026-11-20T12:00:00-03:00'))).toBe(true);
    expect(isBrazilianNationalHoliday(new Date('2026-04-03T12:00:00-03:00'))).toBe(true);
    expect(isBrazilianNationalHoliday(new Date('2026-11-19T12:00:00-03:00'))).toBe(false);

    // 2026-12-23 (Wed) + 3 -> Thu 24, (Fri 25 Natal, Sat 26, Sun 27), Mon 28, Tue 29
    const decDeadline = addBusinessDays(new Date('2026-12-23T10:00:00-03:00'), 3);
    expect(decDeadline.getDate()).toBe(29);

    // 2026-04-01 (Wed) + 3 -> Thu 02, (Fri 03 Sexta-feira Santa, Sat 04, Sun 05), Mon 06, Tue 07
    const easterDeadline = addBusinessDays(new Date('2026-04-01T10:00:00-03:00'), 3);
    expect(easterDeadline.getMonth()).toBe(3); // April
    expect(easterDeadline.getDate()).toBe(7);
  });

  it('skips Saturday and Sunday when crossing a weekend', () => {
    // Friday, 2026-11-20 14:00 -> Monday 23, Tuesday 24, Wednesday 2026-11-25 14:00
    const start = new Date('2026-11-20T14:00:00-03:00');
    const deadline = addBusinessDays(start, 3);
    expect(deadline.getDate()).toBe(25);
    expect(deadline.getDay()).toBe(3);
  });

  it('calculates ANPD deadline status including overdue and communicated incidents without hiding 0h', () => {
    const reportedAt = '2026-11-16T10:00:00-03:00';
    const deadline = calculateAnpdDeadline(reportedAt, 3);
    expect(deadline.getDate()).toBe(19);

    // Pending (> 24h)
    const pendingStatus = getAnpdDeadlineStatus(
      reportedAt,
      'Em triagem TI',
      new Date('2026-11-17T10:00:00-03:00')
    );
    expect(pendingStatus.isOverdue).toBe(false);
    expect(pendingStatus.isUrgent).toBe(false);
    expect(pendingStatus.hoursRemaining).toBe(48);
    expect(pendingStatus.label).toBe('48h restantes');

    // Urgent (<= 24h)
    const urgentStatus = getAnpdDeadlineStatus(
      reportedAt,
      'Acesso contido',
      new Date('2026-11-19T00:00:00-03:00')
    );
    expect(urgentStatus.isUrgent).toBe(true);
    expect(urgentStatus.label).toBe('10h restantes');

    // Under 30 minutes
    const imminentStatus = getAnpdDeadlineStatus(
      reportedAt,
      'Em triagem TI',
      new Date('2026-11-19T09:45:00-03:00')
    );
    expect(imminentStatus.label).toBe('Menos de 1h restante');

    // Overdue by 10 minutes: getHoursRemaining normalizes -0 to 0
    const tenMinPast = new Date(deadline.getTime() + 10 * 60 * 1000);
    expect(Object.is(getHoursRemaining(deadline, tenMinPast), 0)).toBe(true);

    // Overdue by 1 second
    expect(isAnpdOverdue(deadline, new Date('2026-11-19T10:00:01-03:00'))).toBe(true);
    expect(getHoursRemaining(deadline, new Date('2026-11-21T10:00:00-03:00'))).toBe(-48);

    const overdueStatus = getAnpdDeadlineStatus(
      reportedAt,
      'Em triagem TI',
      new Date('2026-11-21T10:00:00-03:00')
    );
    expect(overdueStatus.isOverdue).toBe(true);
    expect(overdueStatus.hoursOverdue).toBe(48);
    expect(overdueStatus.label).toBe('Prazo vencido (48h)');

    // Completed status ignores overdue
    const completedStatus = getAnpdDeadlineStatus(
      reportedAt,
      'Comunicado à ANPD',
      new Date('2026-11-25T10:00:00-03:00')
    );
    expect(completedStatus.isCompleted).toBe(true);
    expect(completedStatus.isOverdue).toBe(false);
    expect(completedStatus.label).toBe('Comunicado à ANPD');
  });

  it('formats protocol numbers and handles invalid dates consistently', () => {
    expect(generateProtocolNumber(7, new Date('2026-11-21T03:00:00-03:00'))).toBe(
      'SHH-2026-0007'
    );
    expect(generateProtocolNumber(0, new Date('2026-11-21T03:00:00-03:00'))).toBe(
      'SHH-2026-0001'
    );
    expect(
      generateProtocolNumber(1_200_000, new Date('2026-11-21T03:00:00-03:00'))
    ).toBe('SHH-2026-999999');
    expect(formatPtBrDateTime('invalid-date')).toBe('Data inválida');
  });
});
