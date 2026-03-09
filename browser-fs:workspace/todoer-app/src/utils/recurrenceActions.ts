/**
 * recurrenceActions.ts
 *
 * High-level actions for recurring task lifecycle management.
 *
 * The key operation here is `onRecurringTaskComplete`: when a recurring task is
 * marked done, this module synchronously computes the next due date, builds the
 * next task instance, and flushes both the completed task and the new instance
 * to localStorage in a single atomic write (via taskStore.completeRecurringTaskAtomic).
 *
 * All functions that touch localStorage are thin orchestrators; the pure date
 * logic lives in recurrenceEngine.ts and the persistence logic lives in
 * taskStore.ts.
 */

import type { Task } from '../types';
import { getNextDueDate } from './recurrenceEngine';
import { completeRecurringTaskAtomic } from '../store/taskStore';

// ── UUID helper ─────────────────────────────────────────────────────────────────

/**
 * Generates a UUIDv4 string. Uses crypto.randomUUID when available, falls back
 * to a Math.random-based implementation for environments that don't support it.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Date parsing helpers ────────────────────────────────────────────────────────

/**
 * Parses a YYYY-MM-DD ISO date string into a local-time Date at midnight.
 * Using local-time parsing prevents UTC-offset shifts from changing the calendar date.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date to a YYYY-MM-DD ISO date string in local time.
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Core helpers ───────────────────────────────────────────────────────────────

/**
 * Builds the next task instance for a recurring series.
 *
 * The new instance:
 *  - Gets a fresh UUIDv4 `id` (unique per occurrence).
 *  - Inherits the same `seriesId`, `recurrenceRule`, `seriesAnchorDate`,
 *    `title`, `notes`, `listId`, and `isRecurring` from the completed task.
 *  - Has `dueDate` set to the next computed due date.
 *  - Is created in an incomplete state (`completed: false`, `completedAt: null`).
 *  - Gets fresh `createdAt` and `updatedAt` timestamps.
 *
 * @param completedTask - The task that was just marked complete. Must have
 *   `isRecurring === true`, a non-null `recurrenceRule`, and a non-null `dueDate`.
 * @returns A fully-constructed Task record ready for persistence.
 * @throws {Error} If `completedTask` is missing a `dueDate` or `recurrenceRule`.
 */
export function generateNextInstance(completedTask: Task): Task {
  if (!completedTask.dueDate) {
    throw new Error(
      `Cannot generate next instance for task "${completedTask.id}": dueDate is null.`,
    );
  }
  if (!completedTask.recurrenceRule) {
    throw new Error(
      `Cannot generate next instance for task "${completedTask.id}": recurrenceRule is null.`,
    );
  }

  const fromDate = parseLocalDate(completedTask.dueDate);
  const anchorDate = completedTask.seriesAnchorDate
    ? parseLocalDate(completedTask.seriesAnchorDate)
    : fromDate;

  const nextDueDate = getNextDueDate(completedTask.recurrenceRule, fromDate, anchorDate);
  const now = new Date().toISOString();

  return {
    id: generateId(),
    title: completedTask.title,
    notes: completedTask.notes,
    listId: completedTask.listId,
    dueDate: formatLocalDate(nextDueDate),
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    isRecurring: true,
    recurrenceRule: completedTask.recurrenceRule,
    seriesId: completedTask.seriesId,
    seriesAnchorDate: completedTask.seriesAnchorDate,
  };
}

/**
 * Completion hook for recurring tasks.
 *
 * When called:
 *  1. Computes the next due date via the recurrence engine.
 *  2. Builds the next task instance (new UUID, same series metadata).
 *  3. Atomically marks the completed task as done AND inserts the next instance
 *     in a **single** localStorage write, preventing any transient intermediate
 *     state from being visible or persisted.
 *
 * This function is intentionally synchronous and completes within a single event
 * loop tick to avoid UI flicker.
 *
 * If `task.isRecurring` is false this function is a no-op — call the regular
 * task-completion path instead.
 *
 * @param task - The recurring task being marked complete.
 * @returns An object with the persisted `completed` task and `next` instance,
 *   or `null` if the task is not recurring (no-op case).
 */
export function onRecurringTaskComplete(
  task: Task,
): { completed: Task; next: Task } | null {
  // Guard: non-recurring tasks must not trigger the recurrence hook.
  if (!task.isRecurring || !task.recurrenceRule || !task.dueDate) {
    return null;
  }

  const completedAt = new Date().toISOString();
  const nextInstance = generateNextInstance(task);

  return completeRecurringTaskAtomic(task.id, completedAt, nextInstance);
}
