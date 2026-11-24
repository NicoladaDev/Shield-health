import { describe, expect, it } from 'vitest';
import { addBusinessDays, generateProtocolNumber } from './anpd';

describe('addBusinessDays (Resolução ANPD nº 15/2024)', () => {
  it('adds 3 business days within the same workweek', () => {
    // Monday, 2026-11-16 10:00 -> Thursday, 2026-11-19 10:00
    const start = new Date('2026-11-16T10:00:00-03:00');
    const deadline = addBusinessDays(start, 3);
    expect(deadline.getDate()).toBe(19);
    expect(deadline.getDay()).toBe(4);
  });

  it('skips Saturday and Sunday when crossing a weekend', () => {
    // Friday, 2026-11-20 14:00 -> Wednesday, 2026-11-25 14:00
    const start = new Date('2026-11-20T14:00:00-03:00');
    const deadline = addBusinessDays(start, 3);
    expect(deadline.getDate()).toBe(25);
    expect(deadline.getDay()).toBe(3);
  });

  it('formats protocol numbers consistently', () => {
    const protocol = generateProtocolNumber(7, new Date('2026-11-21T03:00:00-03:00'));
    expect(protocol).toBe('SHH-2026-0007');
  });
});
