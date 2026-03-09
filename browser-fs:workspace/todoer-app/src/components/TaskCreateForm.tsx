import React, { useState } from 'react';
import { RecurrenceSelector } from './RecurrenceSelector';
import { createTask } from '../store/taskStore';
import type { RecurrenceRule, Task } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TaskCreateFormProps {
  /** ID of the currently selected list; propagated to all generated instances. */
  listId?: string | null;
  /** Called with the newly created task after a successful submit. */
  onTaskCreated?: (task: Task) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generates a UUIDv4 string. Uses crypto.randomUUID when available. */
function generateSeriesId(): string {
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

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Form for creating a new task. Includes title, optional notes, an optional
 * due-date picker, and the RecurrenceSelector.
 *
 * Validation rules:
 *  - Title is required.
 *  - A due date is required when recurrence is enabled.
 *
 * On successful submit the task is persisted via `taskStore.createTask` and
 * `onTaskCreated` is called with the resulting record.
 */
export function TaskCreateForm({ listId = null, onTaskCreated }: TaskCreateFormProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);

  // ── Validation errors ──────────────────────────────────────────────────────
  const [titleError, setTitleError] = useState('');
  const [dueDateError, setDueDateError] = useState('');

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Reset previous errors
    setTitleError('');
    setDueDateError('');

    let isValid = true;

    if (!title.trim()) {
      setTitleError('Title is required.');
      isValid = false;
    }

    if (recurrenceRule !== null && !dueDate) {
      setDueDateError('Please set a due date for recurring tasks.');
      isValid = false;
    }

    if (!isValid) return;

    const isRecurring = recurrenceRule !== null;
    const seriesId = isRecurring ? generateSeriesId() : null;
    // The task's own due date is the anchor for monthly recurrence day-of-month.
    const seriesAnchorDate = isRecurring ? dueDate : null;

    const task = createTask({
      title: title.trim(),
      notes,
      listId: listId ?? null,
      dueDate: dueDate || null,
      completed: false,
      completedAt: null,
      isRecurring,
      recurrenceRule: recurrenceRule ?? null,
      seriesId,
      seriesAnchorDate,
    });

    onTaskCreated?.(task);

    // Reset form
    setTitle('');
    setNotes('');
    setDueDate('');
    setRecurrenceRule(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form className="task-create-form" onSubmit={handleSubmit} noValidate>
      {/* Title */}
      <div className="task-create-form__field">
        <label className="task-create-form__label" htmlFor="tcf-title">
          Title
          <span aria-hidden="true" className="task-create-form__required">
            {' '}
            *
          </span>
        </label>
        <input
          id="tcf-title"
          type="text"
          className={`task-create-form__input${titleError ? ' task-create-form__input--error' : ''}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          aria-required="true"
          aria-describedby={titleError ? 'tcf-title-error' : undefined}
        />
        {titleError && (
          <span id="tcf-title-error" className="task-create-form__error" role="alert">
            {titleError}
          </span>
        )}
      </div>

      {/* Notes */}
      <div className="task-create-form__field">
        <label className="task-create-form__label" htmlFor="tcf-notes">
          Notes
        </label>
        <textarea
          id="tcf-notes"
          className="task-create-form__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          rows={3}
        />
      </div>

      {/* Due date */}
      <div className="task-create-form__field">
        <label className="task-create-form__label" htmlFor="tcf-due-date">
          Due date
          {recurrenceRule !== null && (
            <span aria-hidden="true" className="task-create-form__required">
              {' '}
              *
            </span>
          )}
        </label>
        <input
          id="tcf-due-date"
          type="date"
          className={`task-create-form__input${dueDateError ? ' task-create-form__input--error' : ''}`}
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            if (e.target.value) setDueDateError('');
          }}
          aria-required={recurrenceRule !== null ? 'true' : 'false'}
          aria-describedby={dueDateError ? 'tcf-due-date-error' : undefined}
        />
        {dueDateError && (
          <span id="tcf-due-date-error" className="task-create-form__error" role="alert">
            {dueDateError}
          </span>
        )}
      </div>

      {/* Recurrence selector */}
      <div className="task-create-form__field">
        <RecurrenceSelector value={recurrenceRule} onChange={setRecurrenceRule} />
      </div>

      <button type="submit" className="task-create-form__submit">
        Add task
      </button>
    </form>
  );
}
