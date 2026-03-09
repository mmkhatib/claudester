/**
 * taskStore.ts
 *
 * localStorage persistence layer for tasks. Handles serialization,
 * deserialization, and backward compatibility for legacy records that
 * predate the recurrence fields.
 *
 * Storage keys:
 *   todoer_tasks — JSON array of Task[]
 *   todoer_lists — JSON array of List[] (managed separately)
 */

import type { Task, List, CreateTaskInput, UpdateTaskInput } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const TASKS_KEY = 'todoer_tasks';
const LISTS_KEY = 'todoer_lists';

// ── UUID helper ────────────────────────────────────────────────────────────────

/**
 * Generates a UUIDv4-compatible string.
 * Uses crypto.randomUUID when available, falls back to a Math.random
 * implementation for environments that don't support it.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122-compliant v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Normalization (backward compatibility) ─────────────────────────────────────

/**
 * Normalizes a raw object read from localStorage into a fully-typed Task.
 *
 * Legacy records (written before the recurrence feature) will be missing
 * `isRecurring`, `recurrenceRule`, `seriesId`, and `seriesAnchorDate`.
 * This function supplies safe defaults so downstream code never has to
 * handle undefined values for these fields.
 */
function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    // ── Core fields (always present in any stored record) ──────────────────
    id: raw.id as string,
    title: (raw.title as string) ?? '',
    notes: (raw.notes as string) ?? '',
    listId: (raw.listId as string | null) ?? null,
    dueDate: (raw.dueDate as string | null) ?? null,
    completed: (raw.completed as boolean) ?? false,
    completedAt: (raw.completedAt as string | null) ?? null,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,

    // ── Recurrence fields — default to "not recurring" for legacy records ──
    isRecurring: (raw.isRecurring as boolean) ?? false,
    recurrenceRule: (raw.recurrenceRule as Task['recurrenceRule']) ?? null,
    seriesId: (raw.seriesId as string | null) ?? null,
    seriesAnchorDate: (raw.seriesAnchorDate as string | null) ?? null,
  };
}

// ── Low-level read / write helpers ─────────────────────────────────────────────

/**
 * Reads and normalizes all tasks from localStorage.
 * Returns an empty array if the key is absent or the stored value is corrupt.
 */
function readTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeTask(item as Record<string, unknown>));
  } catch {
    // Corrupt data — return empty rather than crashing.
    return [];
  }
}

/**
 * Serializes and writes the full task array to localStorage in a single call.
 *
 * Using a single write keeps the store consistent: on task completion the
 * completed record and the new recurring instance are both captured in this
 * one call, preventing any intermediate state from being visible in the UI.
 */
function writeTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns all tasks, normalized for backward compatibility.
 */
export function getAllTasks(): Task[] {
  return readTasks();
}

/**
 * Creates a new task, generates its id and timestamps, persists it, and
 * returns the created record.
 */
export function createTask(input: CreateTaskInput): Task {
  const now = new Date().toISOString();
  const task: Task = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    // Ensure recurrence defaults are present even if caller omitted them
    isRecurring: input.isRecurring ?? false,
    recurrenceRule: input.recurrenceRule ?? null,
    seriesId: input.seriesId ?? null,
    seriesAnchorDate: input.seriesAnchorDate ?? null,
  };

  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  return task;
}

/**
 * Applies a partial patch to an existing task identified by `id`.
 * Updates `updatedAt` automatically. Returns the updated task.
 * Throws if the task is not found.
 */
export function updateTask(id: string, patch: UpdateTaskInput): Task {
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Task not found: ${id}`);

  const updated: Task = {
    ...tasks[index],
    ...patch,
    id, // id is immutable
    createdAt: tasks[index].createdAt, // createdAt is immutable
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updated;
  writeTasks(tasks);
  return updated;
}

/**
 * Deletes a single task by id. No-op if the task doesn't exist.
 */
export function deleteTask(id: string): void {
  const tasks = readTasks();
  writeTasks(tasks.filter((t) => t.id !== id));
}

/**
 * Returns all tasks that belong to a given recurrence series,
 * sorted by dueDate ascending (nulls last).
 */
export function getTasksBySeries(seriesId: string): Task[] {
  return readTasks()
    .filter((t) => t.seriesId === seriesId)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

/**
 * Returns uncompleted tasks in a series whose dueDate is on or after `fromDate`
 * (ISO date string, inclusive). Used for "edit/delete all future" operations.
 */
export function getFutureTasksInSeries(seriesId: string, fromDate: string): Task[] {
  return getTasksBySeries(seriesId).filter(
    (t) => !t.completed && t.dueDate != null && t.dueDate >= fromDate,
  );
}

/**
 * Atomically completes a recurring task and inserts the next instance.
 *
 * Both the update to the completed task and the insertion of the new instance
 * are flushed in a SINGLE localStorage.setItem call, preventing any transient
 * state from being persisted or rendered.
 *
 * @param completedTaskId  id of the task being marked complete
 * @param completedAt      ISO datetime string for the completion timestamp
 * @param nextInstance     fully-constructed next Task record (id already set)
 */
export function completeRecurringTaskAtomic(
  completedTaskId: string,
  completedAt: string,
  nextInstance: Task,
): { completed: Task; next: Task } {
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === completedTaskId);
  if (index === -1) throw new Error(`Task not found: ${completedTaskId}`);

  const now = new Date().toISOString();
  const completedTask: Task = {
    ...tasks[index],
    completed: true,
    completedAt,
    updatedAt: now,
  };

  tasks[index] = completedTask;
  tasks.push(nextInstance);

  // Single write — atomic from the localStorage perspective
  writeTasks(tasks);

  return { completed: completedTask, next: nextInstance };
}

/**
 * Applies the same partial patch to multiple tasks in a single localStorage
 * write. Tasks not found in the store are silently skipped.
 *
 * Designed for bulk recurrence operations (edit future / edit all) where we
 * need to update many records atomically without multiple I/O round-trips.
 *
 * @param updates - Array of { id, patch } pairs to apply.
 */
export function bulkUpdateTasks(
  updates: Array<{ id: string; patch: UpdateTaskInput }>,
): void {
  if (updates.length === 0) return;
  const tasks = readTasks();
  const now = new Date().toISOString();
  const patchMap = new Map(updates.map(({ id, patch }) => [id, patch]));

  const next = tasks.map((t) => {
    const patch = patchMap.get(t.id);
    if (!patch) return t;
    return {
      ...t,
      ...patch,
      id: t.id,           // immutable
      createdAt: t.createdAt, // immutable
      updatedAt: now,
    };
  });

  writeTasks(next);
}

/**
 * Applies a patch to all uncompleted tasks in a series with dueDate >= fromDate.
 * Single localStorage write. Returns the patched task records.
 */
export function updateFutureTasksInSeries(
  seriesId: string,
  fromDate: string,
  patch: UpdateTaskInput,
): Task[] {
  const tasks = readTasks();
  const now = new Date().toISOString();
  const patched: Task[] = [];

  const next = tasks.map((t) => {
    if (t.seriesId === seriesId && !t.completed && t.dueDate != null && t.dueDate >= fromDate) {
      const updated: Task = { ...t, ...patch, id: t.id, createdAt: t.createdAt, updatedAt: now };
      patched.push(updated);
      return updated;
    }
    return t;
  });

  writeTasks(next);
  return patched;
}

/**
 * Applies a patch to every task sharing the given seriesId (completed and
 * uncompleted alike). Single localStorage write. Returns the patched records.
 */
export function updateAllTasksInSeries(seriesId: string, patch: UpdateTaskInput): Task[] {
  const tasks = readTasks();
  const now = new Date().toISOString();
  const patched: Task[] = [];

  const next = tasks.map((t) => {
    if (t.seriesId === seriesId) {
      const updated: Task = { ...t, ...patch, id: t.id, createdAt: t.createdAt, updatedAt: now };
      patched.push(updated);
      return updated;
    }
    return t;
  });

  writeTasks(next);
  return patched;
}

/**
 * Removes all uncompleted tasks in a series with dueDate >= fromDate.
 * Completed past instances are preserved.
 */
export function deleteFutureTasksInSeries(seriesId: string, fromDate: string): void {
  const tasks = readTasks();
  writeTasks(
    tasks.filter(
      (t) =>
        !(t.seriesId === seriesId && !t.completed && t.dueDate != null && t.dueDate >= fromDate),
    ),
  );
}

// ── List helpers (pass-through; lists are managed separately) ─────────────────

/**
 * Returns all lists from localStorage.
 */
export function getAllLists(): List[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as List[]) : [];
  } catch {
    return [];
  }
}
