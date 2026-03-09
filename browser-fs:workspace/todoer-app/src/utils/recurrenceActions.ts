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

import type { Task, RecurrenceRule } from '../types';
import { getNextDueDate } from './recurrenceEngine';
import {
  completeRecurringTaskAtomic,
  updateTask,
  updateFutureTasksInSeries,
  updateAllTasksInSeries,
  deleteFutureTasksInSeries,
} from '../store/taskStore';

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
// ── Edit / remove actions ────────────────────────────────────────────────────

/**
 * Patch type for task edits: all fields except id and timestamps are mutable.
 */
export type TaskEditPatch = Partial<
  Pick<Task, 'title' | 'notes' | 'dueDate' | 'listId' | 'isRecurring' | 'recurrenceRule' | 'seriesId' | 'seriesAnchorDate'>
>;

/**
 * Edits only this occurrence, detaching it from the recurrence series.
 *
 * The task is severed from the series (seriesId=null, isRecurring=false,
 * recurrenceRule=null) and the supplied patch is applied. Future instances
 * in the original series are unaffected.
 *
 * @param task - The task instance to detach and edit.
 * @param patch - Field changes to apply to this occurrence.
 * @returns The updated (detached) task.
 */
export function editOccurrence(task: Task, patch: TaskEditPatch): Task {
  return updateTask(task.id, {
    ...patch,
    seriesId: null,
    isRecurring: false,
    recurrenceRule: null,
    seriesAnchorDate: null,
  });
}

/**
 * Edits this occurrence and all future uncompleted occurrences in the series.
 *
 * Only tasks with dueDate >= task.dueDate and completed=false are affected.
 * Completed past instances are immutable and are not touched.
 *
 * @param task - The pivot task (the one the user is editing).
 * @param patch - Field changes to propagate forward through the series.
 * @returns Array of updated tasks (including the pivot).
 */
export function editFutureOccurrences(task: Task, patch: TaskEditPatch): Task[] {
  if (!task.seriesId || !task.dueDate) {
    // Fallback: treat as single-occurrence edit if series info is missing.
    return [editOccurrence(task, patch)];
  }
  return updateFutureTasksInSeries(task.seriesId, task.dueDate, patch);
}

/**
 * Edits every task in the series, including completed past instances.
 *
 * Use with care — this mutates historical records. Appropriate for title/notes
 * changes where the user wants consistency across the entire series.
 *
 * @param task - Any task in the series (used to look up seriesId).
 * @param patch - Field changes to apply to all occurrences.
 * @returns Array of all updated tasks in the series.
 */
export function editAllOccurrences(task: Task, patch: TaskEditPatch): Task[] {
  if (!task.seriesId) {
    return [editOccurrence(task, patch)];
  }
  return updateAllTasksInSeries(task.seriesId, patch);
}

/**
 * Removes recurrence from a task, converting it to a one-time task.
 *
 * The current instance is updated to isRecurring=false with recurrenceRule=null
 * and is detached from the series. All future uncompleted instances in the
 * series are deleted. Completed past instances are preserved.
 *
 * @param task - Any task instance in the series to remove recurrence from.
 * @returns The updated (now non-recurring) task.
 */
export function removeRecurrence(task: Task): Task {
  if (task.seriesId && task.dueDate) {
    // Delete all future uncompleted instances (excluding this one temporarily
    // so we can update it last without a double-write).
    const futureDueDate = task.dueDate;
    // Remove future instances that are NOT this task itself.
    deleteFutureTasksInSeries(task.seriesId, futureDueDate);
  }

  return updateTask(task.id, {
    isRecurring: false,
    recurrenceRule: null,
    seriesId: null,
    seriesAnchorDate: null,
  });
}

/**
 * Converts a non-recurring task into the first instance of a new series, or
 * updates the recurrence rule of an existing series based on the given scope.
 *
 * This is a helper used by the edit form when the user changes recurrence
 * settings on an already-persisted task.
 *
 * @param task       - The task being edited.
 * @param rule       - The new recurrence rule (null to remove recurrence).
 * @param scope      - 'this' | 'future' | 'all'
 * @param seriesId   - New seriesId to use (caller-generated if needed).
 */
export function applyRecurrenceRuleChange(
  task: Task,
  rule: RecurrenceRule | null,
  scope: 'this' | 'future' | 'all',
  seriesId: string,
): Task | Task[] {
  if (rule === null) {
    // Removing recurrence
    if (scope === 'this') {
      return editOccurrence(task, { isRecurring: false, recurrenceRule: null });
    }
    // 'future' or 'all' — remove recurrence from applicable instances
    if (scope === 'all' && task.seriesId) {
      return updateAllTasksInSeries(task.seriesId, {
        isRecurring: false,
        recurrenceRule: null,
        seriesId: null,
        seriesAnchorDate: null,
      });
    }
    // 'future'
    return removeRecurrence(task);
  }

  // Setting or changing a recurrence rule
  const patch: TaskEditPatch = {
    isRecurring: true,
    recurrenceRule: rule,
    seriesId,
    seriesAnchorDate: task.dueDate ?? task.seriesAnchorDate,
  };

  if (scope === 'this') {
    return updateTask(task.id, patch);
  }
  if (scope === 'future' && task.seriesId && task.dueDate) {
    return updateFutureTasksInSeries(task.seriesId, task.dueDate, patch);
  }
  if (scope === 'all' && task.seriesId) {
    return updateAllTasksInSeries(task.seriesId, patch);
  }

  // Fallback: no series yet — just update this task
  return updateTask(task.id, patch);
}

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
