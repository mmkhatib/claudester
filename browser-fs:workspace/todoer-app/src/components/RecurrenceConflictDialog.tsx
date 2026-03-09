import React, { useEffect, useRef } from 'react';
import type { RecurrenceEditScope } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RecurrenceConflictDialogProps {
  /** Whether this dialog was opened from an edit or delete action. */
  mode: 'edit' | 'delete';
  /** Called when the user picks a scope option. */
  onSelectScope: (scope: RecurrenceEditScope) => void;
  /** Called when the user dismisses the dialog without making a selection. */
  onCancel: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SCOPE_OPTIONS: {
  scope: RecurrenceEditScope;
  label: string;
  description: string;
}[] = [
  {
    scope: 'this',
    label: 'This occurrence',
    description: 'Only this task will be affected.',
  },
  {
    scope: 'future',
    label: 'This and all future occurrences',
    description: 'This task and all upcoming instances in the series will be affected.',
  },
  {
    scope: 'all',
    label: 'All occurrences',
    description: 'Every task in this recurring series will be affected.',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Modal confirmation dialog shown when the user edits or deletes a task that
 * belongs to a recurring series.
 *
 * Presents three scope options (this, future, all) and a cancel action.
 * Uses a native <dialog> element for accessibility — it traps focus and
 * responds to the Escape key out of the box.
 */
export function RecurrenceConflictDialog({
  mode,
  onSelectScope,
  onCancel,
}: RecurrenceConflictDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open the native dialog when the component mounts.
  useEffect(() => {
    dialogRef.current?.showModal();
    return () => {
      // Close imperatively on unmount to ensure the browser removes the
      // modal state even if the host component is torn down without clicking
      // Cancel.
      dialogRef.current?.close();
    };
  }, []);

  const verb = mode === 'edit' ? 'edit' : 'delete';
  const heading = `${mode === 'edit' ? 'Edit' : 'Delete'} recurring task`;

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // The native dialog element fires click events on the backdrop area.
    // Clicking outside the dialog content should cancel.
    if (e.target === dialogRef.current) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="recurrence-conflict-dialog"
      aria-labelledby="rcd-heading"
      aria-describedby="rcd-description"
      onCancel={onCancel} // fires when Escape is pressed
      onClick={handleBackdropClick}
    >
      <div className="recurrence-conflict-dialog__content">
        <h2 id="rcd-heading" className="recurrence-conflict-dialog__heading">
          {heading}
        </h2>
        <p id="rcd-description" className="recurrence-conflict-dialog__description">
          How would you like to {verb} this recurring task?
        </p>

        <div
          className="recurrence-conflict-dialog__options"
          role="radiogroup"
          aria-label="Scope of change"
        >
          {SCOPE_OPTIONS.map(({ scope, label, description }) => (
            <button
              key={scope}
              type="button"
              className="recurrence-conflict-dialog__option"
              onClick={() => onSelectScope(scope)}
              aria-label={`${label}: ${description}`}
            >
              <span className="recurrence-conflict-dialog__option-label">{label}</span>
              <span className="recurrence-conflict-dialog__option-desc">{description}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="recurrence-conflict-dialog__cancel"
          onClick={onCancel}
          aria-label="Cancel — no changes will be made"
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
}
