import type { RecurrenceRule } from '../types/task';

/**
 * Computes the next due date for a recurring task given a recurrence rule and
 * the current (reference) due date.
 *
 * This is a pure, side-effect-free function with no I/O.  It is the single
 * source of truth for all next-date calculations across the app.
 *
 * @param rule      - The recurrence rule describing the schedule.
 * @param fromDate  - The current due date from which the next occurrence is computed.
 * @param anchorDate - (optional) The original series start date.  Used as the
 *                     canonical day-of-month reference for monthly recurrence so
 *                     that a series started on Jan 31 consistently targets the
 *                     last valid day of each subsequent month rather than drifting.
 *                     When omitted, `fromDate` is used as the anchor.
 * @returns A new `Date` object representing the next due date.  The time
 *          component is preserved from `fromDate`.
 */
export function getNextDueDate(
  rule: RecurrenceRule,
  fromDate: Date,
  anchorDate?: Date,
): Date {
  const interval = rule.interval != null && rule.interval > 0 ? rule.interval : 1;

  switch (rule.type) {
    case 'daily':
      return addDays(fromDate, interval);

    case 'weekly':
      return addDays(fromDate, 7 * interval);

    case 'monthly': {
      const anchor = anchorDate ?? fromDate;
      return addMonths(fromDate, interval, anchor.getDate());
    }

    case 'custom': {
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        // Fallback: behave like daily when no weekdays are configured.
        return addDays(fromDate, 1);
      }
      return nextWeekday(fromDate, rule.daysOfWeek);
    }

    default:
      // Exhaustive guard — TypeScript should prevent this path, but we handle
      // it gracefully at runtime by advancing one day.
      return addDays(fromDate, 1);
  }
}

// ── Private helpers ────────────────────────────────────────────────────────────

/**
 * Returns a new Date that is `days` days after `date`.
 * The original `date` is not mutated.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns a new Date that is `months` calendar months after `date`, with the
 * day-of-month clamped to the last valid day of the target month.
 *
 * @param date         - Reference date.
 * @param months       - Number of calendar months to advance.
 * @param targetDayOfMonth - The desired day-of-month in the resulting month
 *                           (typically the anchor day).  Clamped to the last
 *                           valid day when the target month is shorter.
 *                           Must be in the range 1–31.
 */
function addMonths(date: Date, months: number, targetDayOfMonth: number): Date {
  const result = new Date(date.getTime());

  const targetYear = result.getFullYear();
  const targetMonth = result.getMonth() + months; // may overflow — Date handles it

  // Setting day=0 of month M gives the last day of month M-1.
  // We use this to clamp targetDayOfMonth to the actual last day of the target month.
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(targetDayOfMonth, lastDayOfTargetMonth);

  result.setFullYear(targetYear, targetMonth, clampedDay);
  return result;
}

/**
 * Returns the first date strictly after `fromDate` whose day-of-week appears
 * in `weekdays`.
 *
 * The search scans forward up to 7 days, which is guaranteed to find a match
 * for any non-empty `weekdays` array (since there are only 7 distinct weekdays).
 *
 * @param fromDate - The reference date; the returned date is always > fromDate.
 * @param weekdays - Sorted or unsorted array of weekday indices (0=Sun…6=Sat).
 *                   Must contain at least one element.
 */
function nextWeekday(fromDate: Date, weekdays: number[]): Date {
  const daySet = new Set(weekdays);
  let candidate = addDays(fromDate, 1); // start strictly after fromDate

  for (let i = 0; i < 7; i++) {
    if (daySet.has(candidate.getDay())) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
  }

  // Should never be reached with a non-empty weekdays array.
  return candidate;
}
