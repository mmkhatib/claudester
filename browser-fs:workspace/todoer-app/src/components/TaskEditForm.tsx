import React, { useState } from 'react';
import { RecurrenceSelector } from './RecurrenceSelector';
import { RecurrenceConflictDialog } from './RecurrenceConflictDialog';
import {
  updateTask,
  bulkUpdateTasks,
  getTasksBySeries,
  getFutureTasksInSeries,
} from '../store/taskStore';
import type { RecurrenceRule, RecurrenceEditScope, Task, UpdateTaskInput } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TaskEditFormProps {
  /** The task being edited. All form fields are initialised from this record. */
  task: Task;
  /** Called with the updated task record after a successful save. */
  onTaskUpdated?: (task: Task) => void;
  /** Called when the user dismisses the form without saving. */
  onCancel?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Shallow comparison of two RecurrenceRule values (treats null as equal to null). */
function recurrenceRulesEqual(
  a: RecurrenceRule | null,
  b: RecurrenceRule | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.type !== b.type) return false;
  if ((a.interval ?? 1) !== (b.interval ?? 1)) return false;
  const aDays = (a.daysOfWeek ?? []).slice().sort().join(',');
  const bDays = (b.daysOfWeek ?? []).slice().sort().join(',');
  return aDays === bDays;
}

/**
 * Determines whether any of the form fields differ from the original task
 * record. We only show the scope dialog when there are actual changes to apply.
 */
function hasChanges(
  task: Task,
  title: string,
  notes: string,
  dueDate: string,
  recurrenceRule: RecurrenceRule | null,
): boolean {
  if (title.trim() !== task.title) return true;
  if (notes !== task.notes) return true;
  if ((dueDate || null) !== task.dueDate) return true;
  if (!recurrenceRulesEqual(recurrenceRule, task.recurrenceRule)) return true;
  return false;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Form for editing an existing task.
 *
 * Recurrence-aware behaviour:
 *  - If the task is part of a recurring series (seriesId !== null) and the user
 *    saves any changes, a RecurrenceConflictDialog is shown to determine the
 *    scope of the edit: 'this', 'future', or 'all'.
 *  - If the task has no seriesId (standalone or already detached), changes are
 *    applied directly without a scope prompt.
 *
 * Scope semantics:
 *  - 'this'   — Update only this task instance; sever it from the series by
 *               clearing seriesId (and isRecurring/recurrenceRule if rule removed).
 *  - 'future' — Update this task and all upcoming uncompleted instances in the
 *               series (dueDate >= task.dueDate).
 *  - 'all'    — Update every uncompleted instance in the series regardless of
 *               due date. Completed past instances are not modified.
 *
 * Validation:
 *  - Title is required.
 *  - A due date is required when recurrence is enabled.
 */
export function TaskEditForm({ task, onTaskUpdated, onCancel }: TaskEditFormProps) {
  // ── Form field state (initialised from the task prop) ──────────────────────
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    task.recurrenceRule,
  );

  // ── Validation error state ─────────────────────────────────────────────────
  const [titleError, setTitleError] = useState('');
  const [dueDateError, setDueDateError] = useState('');

  // ── Scope dialog state ─────────────────────────────────────────────────────
  /**
   * When non-null, the RecurrenceConflictDialog is shown. The stored value is
   * the validated patch ready to be applied once the user picks a scope.
   */
  const [pendingPatch, setPendingPatch] = useState<UpdateTaskInput | null>(null);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    setTitleError('');
    setDueDateError('');
    let valid = true;

    if (!title.trim()) {
      setTitleError('Title is required.');
      valid = false;
    }

    if (recurrenceRule !== null && !dueDate) {
      setDueDateError('Please set a due date for recurring tasks.');
      valid = false;
    }

    return valid;
  }

  // ── Save logic ─────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!hasChanges(task, title, notes, dueDate, recurrenceRule)) {
      // Nothing changed — treat as cancel to avoid a no-op dialog.
      onCancel?.();
      return;
    }

    const isRecurring = recurrenceRule !== null;

    // Build the base patch for the current task instance.
    const patch: UpdateTaskInput = {
      title: title.trim(),
      notes,
      dueDate: dueDate || null,
      isRecurring,
      recurrenceRule: recurrenceRule ?? null,
    };

    if (task.seriesId !== null) {
      // Task is part of a series — show the scope dialog before applying.
      setPendingPatch(patch);
    } else {
      // Standalone task (or already detached) — apply directly.
      applyPatch('this', patch);
    }
  }

  /**
   * Applies a validated patch to the store according to the chosen scope.
   *
   * @param scope - Which instances to update.
   * @param patch - The changes to apply (already validated).
   */
  function applyPatch(scope: RecurrenceEditScope, patch: UpdateTaskInput) {
    const isRecurring = patch.isRecurring ?? false;

    // For 'this' scope the task is severed from its series.
    const thisPatch: UpdateTaskInput = {
      ...patch,
      seriesId: scope === 'this' ? null : (task.seriesId ?? null),
      seriesAnchorDate:
        scope === 'this' || !isRecurring ? null : (task.seriesAnchorDate ?? null),
      isRecurring: scope === 'this' ? isRecurring : isRecurring,
    };

    if (scope === 'this') {
      // Only this instance — detach from series when needed.
      const updated = updateTask(task.id, {
        ...thisPatch,
        // If we're keeping recurrence on 'this only', treat it as a new
        // standalone series (keep isRecurring/recurrenceRule, but sever from
        // the shared seriesId). Simpler: just null out seriesId.
        seriesId: null,
        seriesAnchorDate: isRecurring ? (dueDate || task.seriesAnchorDate || null) : null,
      });
      onTaskUpdated?.(updated);
      return;
    }

    // For 'future' and 'all' the rule/meta is propagated across the series.
    // Completed past instances are never modified (immutable invariant).
    const seriesPatch: UpdateTaskInput = {
      title: title.trim(),
      notes,
      isRecurring,
      recurrenceRule: recurrenceRule ?? null,
      seriesId: isRecurring ? (task.seriesId ?? null) : null,
      seriesAnchorDate: isRecurring ? (task.seriesAnchorDate ?? null) : null,
    };

    if (scope === 'future') {
      const futureTasks = getFutureTasksInSeries(
        task.seriesId!,
        task.dueDate ?? '',
      );
      bulkUpdateTasks(
        futureTasks.map((t) => ({
          id: t.id,
          // Apply dueDate only to the current task, not to other future instances.
          patch: t.id === task.id ? { ...seriesPatch, dueDate: dueDate || null } : seriesPatch,
        })),
      );
    } else {
      // 'all' — every uncompleted task in the series, regardless of due date.
      const allTasks = getTasksBySeries(task.seriesId!).filter((t) => !t.completed);
      bulkUpdateTasks(
        allTasks.map((t) => ({
          id: t.id,
          patch: t.id === task.id ? { ...seriesPatch, dueDate: dueDate || null } : seriesPatch,
        })),
      );
    }

    // Return the updated version of the current task.
    const updatedCurrentTask: Task = {
      ...task,
      ...seriesPatch,
      dueDate: dueDate || null,
      updatedAt: new Date().toISOString(),
    };
    onTaskUpdated?.(updatedCurrentTask);
  }

  // ── Scope dialog handlers ──────────────────────────────────────────────────

  function handleScopeSelected(scope: RecurrenceEditScope) {
    if (!pendingPatch) return;
    setPendingPatch(null);
    applyPatch(scope, pendingPatch);
  }

  function handleScopeCancel() {
    setPendingPatch(null);
    // Leave the form open so the user can make further changes.
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <form className="task-edit-form" onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="task-edit-form__field">
          <label className="task-edit-form__label" htmlFor="tef-title">
            Title
            <span aria-hidden="true" className="task-edit-form__required">
              {' '}
              *
            </span>
          </label>
          <input
            id="tef-title"
            type="text"
            className={`task-edit-form__input${titleError ? ' task-edit-form__input--error' : ''}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            aria-required="true"
            aria-describedby={titleError ? 'tef-title-error' : undefined}
          />
          {titleError && (
            <span id="tef-title-error" className="task-edit-form__error" role="alert">
              {titleError}
            </span>
          )}
        </div>

        {/* Notes */}
        <div className="task-edit-form__field">
          <label className="task-edit-form__label" htmlFor="tef-notes">
            Notes
          </label>
          <textarea
            id="tef-notes"
            className="task-edit-form__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={3}
          />
        </div>

        {/* Due date */}
        <div className="task-edit-form__field">
          <label className="task-edit-form__label" htmlFor="tef-due-date">
            Due date
            {recurrenceRule !== null && (
              <span aria-hidden="true" className="task-edit-form__required">
                {' '}
                *
              </span>
            )}
          </label>
          <input
            id="tef-due-date"
            type="date"
            className={`task-edit-form__input${dueDateError ? ' task-edit-form__input--error' : ''}`}
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (e.target.value) setDueDateError('');
            }}
            aria-required={recurrenceRule !== null ? 'true' : 'false'}
            aria-describedby={dueDateError ? 'tef-due-date-error' : undefined}
          />
          {dueDateError && (
            <span id="tef-due-date-error" className="task-edit-form__error" role="alert">
              {dueDateError}
            </span>
          )}
        </div>

        {/* Recurrence selector */}
        <div className="task-edit-form__field">
          <RecurrenceSelector value={recurrenceRule} onChange={setRecurrenceRule} />
        </div>

        {/* Actions */}
        <div className="task-edit-form__actions">
          <button type="submit" className="task-edit-form__submit">
            Save
          </button>
          {onCancel && (
            <button
              type="button"
              className="task-edit-form__cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Scope prompt — rendered outside the form to avoid nesting issues */}
      {pendingPatch !== null && (
        <RecurrenceConflictDialog
          mode="edit"
          onSelectScope={handleScopeSelected}
          onCancel={handleScopeCancel}
        />
      )}
    </>
  );
}
