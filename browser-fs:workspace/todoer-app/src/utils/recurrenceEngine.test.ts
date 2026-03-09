import { getNextDueDate } from './recurrenceEngine';
import type { RecurrenceRule } from '../types/task';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parses a YYYY-MM-DD string into a local Date at midnight. */
function d(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a Date to YYYY-MM-DD for easy assertion. */
function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Daily recurrence ───────────────────────────────────────────────────────────

describe('getNextDueDate — daily', () => {
  const rule: RecurrenceRule = { type: 'daily' };

  test('advances by 1 day (default interval)', () => {
    expect(fmt(getNextDueDate(rule, d('2025-06-15')))).toBe('2025-06-16');
  });

  test('advances by 1 day at month boundary', () => {
    expect(fmt(getNextDueDate(rule, d('2025-06-30')))).toBe('2025-07-01');
  });

  test('advances by 1 day at year boundary', () => {
    expect(fmt(getNextDueDate(rule, d('2025-12-31')))).toBe('2026-01-01');
  });

  test('interval=3 advances by 3 days', () => {
    const r: RecurrenceRule = { type: 'daily', interval: 3 };
    expect(fmt(getNextDueDate(r, d('2025-06-15')))).toBe('2025-06-18');
  });

  test('interval=0 falls back to 1 day', () => {
    const r: RecurrenceRule = { type: 'daily', interval: 0 };
    expect(fmt(getNextDueDate(r, d('2025-06-15')))).toBe('2025-06-16');
  });

  test('negative interval falls back to 1 day', () => {
    const r: RecurrenceRule = { type: 'daily', interval: -5 };
    expect(fmt(getNextDueDate(r, d('2025-06-15')))).toBe('2025-06-16');
  });

  test('result is strictly after fromDate (same-day exclusion)', () => {
    const next = getNextDueDate(rule, d('2025-06-15'));
    expect(next.getTime()).toBeGreaterThan(d('2025-06-15').getTime());
  });
});

// ── Weekly recurrence ──────────────────────────────────────────────────────────

describe('getNextDueDate — weekly', () => {
  const rule: RecurrenceRule = { type: 'weekly' };

  test('advances by 7 days (default interval)', () => {
    expect(fmt(getNextDueDate(rule, d('2025-06-15')))).toBe('2025-06-22');
  });

  test('advances by 7 days across month boundary', () => {
    expect(fmt(getNextDueDate(rule, d('2025-06-25')))).toBe('2025-07-02');
  });

  test('advances by 7 days across year boundary', () => {
    expect(fmt(getNextDueDate(rule, d('2025-12-29')))).toBe('2026-01-05');
  });

  test('interval=2 advances by 14 days', () => {
    const r: RecurrenceRule = { type: 'weekly', interval: 2 };
    expect(fmt(getNextDueDate(r, d('2025-06-15')))).toBe('2025-06-29');
  });

  test('result is strictly after fromDate (same-day exclusion)', () => {
    const next = getNextDueDate(rule, d('2025-06-15'));
    expect(next.getTime()).toBeGreaterThan(d('2025-06-15').getTime());
  });
});

// ── Monthly recurrence ─────────────────────────────────────────────────────────

describe('getNextDueDate — monthly (standard)', () => {
  const rule: RecurrenceRule = { type: 'monthly' };

  test('same day next month (mid-month)', () => {
    expect(fmt(getNextDueDate(rule, d('2025-06-15')))).toBe('2025-07-15');
  });

  test('advances across year boundary', () => {
    expect(fmt(getNextDueDate(rule, d('2025-11-10')))).toBe('2025-12-10');
  });

  test('December → January of next year', () => {
    expect(fmt(getNextDueDate(rule, d('2025-12-10')))).toBe('2026-01-10');
  });

  test('result is strictly after fromDate (same-day exclusion)', () => {
    const next = getNextDueDate(rule, d('2025-06-15'));
    expect(next.getTime()).toBeGreaterThan(d('2025-06-15').getTime());
  });
});

describe('getNextDueDate — monthly month-end clamping', () => {
  const rule: RecurrenceRule = { type: 'monthly' };

  // Jan 31 → Feb 28 (non-leap year)
  test('Jan 31 → Feb 28 in a non-leap year', () => {
    // 2025 is not a leap year
    expect(fmt(getNextDueDate(rule, d('2025-01-31'), d('2025-01-31')))).toBe('2025-02-28');
  });

  // Jan 31 → Feb 29 (leap year)
  test('Jan 31 → Feb 29 in a leap year', () => {
    // 2024 is a leap year
    expect(fmt(getNextDueDate(rule, d('2024-01-31'), d('2024-01-31')))).toBe('2024-02-29');
  });

  // Mar 31 → Apr 30
  test('Mar 31 → Apr 30', () => {
    expect(fmt(getNextDueDate(rule, d('2025-03-31'), d('2025-03-31')))).toBe('2025-04-30');
  });

  // May 31 → Jun 30
  test('May 31 → Jun 30', () => {
    expect(fmt(getNextDueDate(rule, d('2025-05-31'), d('2025-05-31')))).toBe('2025-06-30');
  });

  // Jul 31 → Aug 31 (no clamping needed)
  test('Jul 31 → Aug 31 (both have 31 days)', () => {
    expect(fmt(getNextDueDate(rule, d('2025-07-31'), d('2025-07-31')))).toBe('2025-08-31');
  });

  // Aug 31 → Sep 30
  test('Aug 31 → Sep 30', () => {
    expect(fmt(getNextDueDate(rule, d('2025-08-31'), d('2025-08-31')))).toBe('2025-09-30');
  });

  // Oct 31 → Nov 30 (from acceptance criteria)
  test('Oct 31 → Nov 30', () => {
    expect(fmt(getNextDueDate(rule, d('2025-10-31'), d('2025-10-31')))).toBe('2025-11-30');
  });

  // Dec 31 → Jan 31 (no clamping needed)
  test('Dec 31 → Jan 31 of next year', () => {
    expect(fmt(getNextDueDate(rule, d('2025-12-31'), d('2025-12-31')))).toBe('2026-01-31');
  });

  // Anchor date is used, not fromDate day-of-month, when they differ
  test('anchor day-of-month is used over fromDate day when clamped', () => {
    // Series started on the 31st. After clamping to Apr 30 last month,
    // the next month (May) should target day 31 from the anchor, not 30.
    const anchor = d('2025-01-31');
    // fromDate is Apr 30 (clamped from Mar 31 → Apr 30)
    const result = getNextDueDate(rule, d('2025-04-30'), anchor);
    // May has 31 days, anchor targets 31 → May 31
    expect(fmt(result)).toBe('2025-05-31');
  });
});

// ── Leap year February edge cases ──────────────────────────────────────────────

describe('getNextDueDate — leap year February', () => {
  const rule: RecurrenceRule = { type: 'monthly' };

  // Leap year: Feb 29 exists in 2024
  test('Feb 29 (leap) → Mar 29 (not Mar 28)', () => {
    // 2024 is a leap year; March has 31 days so no clamping needed
    expect(fmt(getNextDueDate(rule, d('2024-02-29'), d('2024-02-29')))).toBe('2024-03-29');
  });

  // Non-leap: Feb 28 → Mar 28
  test('Feb 28 (non-leap) → Mar 28', () => {
    expect(fmt(getNextDueDate(rule, d('2025-02-28'), d('2025-02-28')))).toBe('2025-03-28');
  });

  // Jan 31 → Feb 29 in leap year (acceptance criteria)
  test('Jan 31 → Feb 29 in leap year 2024', () => {
    expect(fmt(getNextDueDate(rule, d('2024-01-31'), d('2024-01-31')))).toBe('2024-02-29');
  });

  // Daily: crossing Feb 29 in a leap year
  test('daily: Feb 28 → Feb 29 in leap year', () => {
    const daily: RecurrenceRule = { type: 'daily' };
    expect(fmt(getNextDueDate(daily, d('2024-02-28')))).toBe('2024-02-29');
  });

  // Daily: Feb 29 → Mar 1 in leap year
  test('daily: Feb 29 → Mar 1 in leap year', () => {
    const daily: RecurrenceRule = { type: 'daily' };
    expect(fmt(getNextDueDate(daily, d('2024-02-29')))).toBe('2024-03-01');
  });
});

// ── Custom weekday recurrence ──────────────────────────────────────────────────

describe('getNextDueDate — custom weekday', () => {
  // Monday=1, Wednesday=3, Friday=5, Saturday=6, Sunday=0

  test('[Mon, Wed] from Thursday returns next Monday', () => {
    // 2025-06-12 is a Thursday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 3] };
    const result = getNextDueDate(rule, d('2025-06-12')); // Thu → Mon Jun 16
    expect(fmt(result)).toBe('2025-06-16');
    expect(result.getDay()).toBe(1); // Monday
  });

  test('[Mon, Wed] from Monday returns next Wednesday (same-day exclusion)', () => {
    // 2025-06-09 is a Monday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 3] };
    const result = getNextDueDate(rule, d('2025-06-09')); // Mon → Wed Jun 11
    expect(fmt(result)).toBe('2025-06-11');
    expect(result.getDay()).toBe(3); // Wednesday
  });

  test('[Mon] from Monday returns next Monday (+7, same-day exclusion)', () => {
    // 2025-06-09 is a Monday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1] };
    const result = getNextDueDate(rule, d('2025-06-09')); // Mon → Mon Jun 16
    expect(fmt(result)).toBe('2025-06-16');
    expect(result.getDay()).toBe(1);
  });

  test('[Mon] from Tuesday returns next Monday', () => {
    // 2025-06-10 is a Tuesday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1] };
    const result = getNextDueDate(rule, d('2025-06-10')); // Tue → Mon Jun 16
    expect(fmt(result)).toBe('2025-06-16');
  });

  test('[Mon, Fri] from Monday returns next Friday (same-day exclusion)', () => {
    // 2025-06-09 is a Monday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 5] };
    const result = getNextDueDate(rule, d('2025-06-09')); // Mon → Fri Jun 13
    expect(fmt(result)).toBe('2025-06-13');
    expect(result.getDay()).toBe(5);
  });

  test('[Mon, Fri] from Friday returns next Monday (wrap-around, same-day exclusion)', () => {
    // 2025-06-13 is a Friday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 5] };
    const result = getNextDueDate(rule, d('2025-06-13')); // Fri → Mon Jun 16
    expect(fmt(result)).toBe('2025-06-16');
    expect(result.getDay()).toBe(1);
  });

  test('[Sun] from Saturday returns next Sunday (wrap-around across week boundary)', () => {
    // 2025-06-14 is a Saturday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [0] };
    const result = getNextDueDate(rule, d('2025-06-14')); // Sat → Sun Jun 15
    expect(fmt(result)).toBe('2025-06-15');
    expect(result.getDay()).toBe(0);
  });

  test('[Sun] from Sunday returns next Sunday (+7, same-day exclusion)', () => {
    // 2025-06-15 is a Sunday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [0] };
    const result = getNextDueDate(rule, d('2025-06-15')); // Sun → Sun Jun 22
    expect(fmt(result)).toBe('2025-06-22');
    expect(result.getDay()).toBe(0);
  });

  test('[Sat, Sun] from Saturday returns Sunday (next day)', () => {
    // 2025-06-14 is a Saturday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [6, 0] };
    const result = getNextDueDate(rule, d('2025-06-14')); // Sat → Sun Jun 15
    expect(fmt(result)).toBe('2025-06-15');
    expect(result.getDay()).toBe(0);
  });

  test('wrap-around: [Mon, Wed] from Wednesday returns next Monday', () => {
    // 2025-06-11 is a Wednesday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 3] };
    const result = getNextDueDate(rule, d('2025-06-11')); // Wed → Mon Jun 16
    expect(fmt(result)).toBe('2025-06-16');
    expect(result.getDay()).toBe(1);
  });

  test('empty daysOfWeek falls back to +1 day', () => {
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [] };
    expect(fmt(getNextDueDate(rule, d('2025-06-15')))).toBe('2025-06-16');
  });

  test('result is always strictly after fromDate for all weekday configs', () => {
    const weekdays = [0, 1, 2, 3, 4, 5, 6];
    weekdays.forEach(wd => {
      const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [wd] };
      // Find a fromDate whose day-of-week equals wd to test same-day exclusion
      // 2025-06-15 (Sun=0), 2025-06-16 (Mon=1), …
      const base = new Date(2025, 5, 15 + wd); // offset within the week
      const next = getNextDueDate(rule, base);
      expect(next.getTime()).toBeGreaterThan(base.getTime());
    });
  });
});

// ── Same-day exclusion (general) ───────────────────────────────────────────────

describe('same-day exclusion — all recurrence types', () => {
  test('daily: result > fromDate', () => {
    const rule: RecurrenceRule = { type: 'daily' };
    const from = d('2025-06-15');
    expect(getNextDueDate(rule, from).getTime()).toBeGreaterThan(from.getTime());
  });

  test('weekly: result > fromDate', () => {
    const rule: RecurrenceRule = { type: 'weekly' };
    const from = d('2025-06-15');
    expect(getNextDueDate(rule, from).getTime()).toBeGreaterThan(from.getTime());
  });

  test('monthly: result > fromDate', () => {
    const rule: RecurrenceRule = { type: 'monthly' };
    const from = d('2025-06-15');
    expect(getNextDueDate(rule, from).getTime()).toBeGreaterThan(from.getTime());
  });

  test('custom: result > fromDate even when fromDate is in daysOfWeek', () => {
    // Monday → must return next Monday, not the same Monday
    const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1] };
    const from = d('2025-06-09'); // Monday
    expect(getNextDueDate(rule, from).getTime()).toBeGreaterThan(from.getTime());
  });
});

// ── Interval variations ────────────────────────────────────────────────────────

describe('getNextDueDate — interval edge cases', () => {
  test('monthly interval=2 advances 2 months', () => {
    const rule: RecurrenceRule = { type: 'monthly', interval: 2 };
    expect(fmt(getNextDueDate(rule, d('2025-01-15')))).toBe('2025-03-15');
  });

  test('monthly interval=12 advances 12 months (same day next year)', () => {
    const rule: RecurrenceRule = { type: 'monthly', interval: 12 };
    expect(fmt(getNextDueDate(rule, d('2025-06-15')))).toBe('2026-06-15');
  });

  test('weekly interval=4 advances 28 days', () => {
    const rule: RecurrenceRule = { type: 'weekly', interval: 4 };
    expect(fmt(getNextDueDate(rule, d('2025-06-01')))).toBe('2025-06-29');
  });

  test('interval=null is treated as 1', () => {
    // interval omitted — defaults to 1
    const rule: RecurrenceRule = { type: 'daily' };
    expect(fmt(getNextDueDate(rule, d('2025-06-15')))).toBe('2025-06-16');
  });
});
