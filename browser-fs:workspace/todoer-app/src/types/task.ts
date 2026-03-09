/**
 * Recurrence frequency types supported by the todoer app.
 * - 'daily': repeats every N days
 * - 'weekly': repeats every N weeks
 * - 'monthly': repeats every N months (same day of month, clamped to last valid day)
 * - 'custom': repeats on specific days of the week
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Defines the recurrence rule for a recurring task.
 *
 * The `type` field determines the schedule; `daysOfWeek` is only
 * used when `type === 'custom'`.
 */
export interface RecurrenceRule {
  /** The recurrence frequency pattern. */
  type: RecurrenceFrequency;

  /**
   * Interval multiplier (default: 1).
   * E.g. interval=2 with type='weekly' means "every 2 weeks".
   */
  interval?: number;

  /**
   * For `type === 'custom'`: the weekday indices on which the task recurs.
   * 0 = Sunday, 1 = Monday, …, 6 = Saturday.
   * Must contain at least one value when provided.
   */
  daysOfWeek?: number[];
}

/**
 * Represents a single task (or recurring task instance) in the todoer app.
 * All data is persisted in localStorage under the key `todoer_tasks`.
 */
export interface Task {
  /** Unique identifier for this task instance (UUIDv4). */
  id: string;

  /** Human-readable title of the task. */
  title: string;

  /** Optional freeform notes or description. */
  notes: string;

  /** ID of the list this task belongs to, or null if uncategorised. */
  listId: string | null;

  /** ISO date string (YYYY-MM-DD) for when the task is due, or null if no due date. */
  dueDate: string | null;

  /** Whether the task has been completed. */
  completed: boolean;

  /** ISO datetime string of when the task was completed, or null if not completed. */
  completedAt: string | null;

  /** ISO datetime string of when the task was created. */
  createdAt: string;

  /** ISO datetime string of when the task was last updated. */
  updatedAt: string;

  // ── Recurrence fields ──────────────────────────────────────────────────────

  /**
   * Whether this task is part of a recurring series.
   * Defaults to false for all legacy/non-recurring tasks.
   */
  isRecurring: boolean;

  /**
   * The recurrence rule defining the schedule, or null for non-recurring tasks.
   * Defaults to null for all legacy/non-recurring tasks.
   */
  recurrenceRule: RecurrenceRule | null;

  /**
   * UUIDv4 shared by all instances in the same recurrence series.
   * null for non-recurring tasks (including tasks detached from a series via
   * "edit this occurrence only").
   */
  seriesId: string | null;

  /**
   * ISO date string of the original task that started the series.
   * Used as the anchor day-of-month for monthly recurrence calculations
   * (e.g. ensures a series that started on Jan 31 targets the last day of
   * each subsequent month rather than drifting to an earlier date).
   * null for non-recurring tasks.
   */
  seriesAnchorDate: string | null;
}

/**
 * Shape of the list entity (unchanged by this spec; included here for
 * cross-reference and to keep related types co-located).
 */
export interface List {
  /** Unique identifier (UUIDv4). */
  id: string;

  /** Display name of the list. */
  name: string;

  /** Optional hex colour used to visually distinguish the list. */
  color?: string;

  /** ISO datetime string of when the list was created. */
  createdAt: string;

  /** ISO datetime string of when the list was last updated. */
  updatedAt: string;
}

// ── Utility types ─────────────────────────────────────────────────────────────

/** Fields required when creating a new task (id and timestamps are generated). */
export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

/** Fields that can be supplied when updating a task. */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt'>>;

/** Scope of a bulk operation on a recurring series. */
export type RecurrenceEditScope = 'this' | 'future' | 'all';
