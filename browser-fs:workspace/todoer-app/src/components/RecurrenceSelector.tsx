import React, { useId } from 'react';
import type { RecurrenceRule, RecurrenceFrequency } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RecurrenceSelectorProps {
  /** Current recurrence rule value, or null when recurrence is disabled. */
  value: RecurrenceRule | null;
  /** Called whenever the rule changes; emits null when recurrence is toggled off. */
  onChange: (rule: RecurrenceRule | null) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const WEEKDAYS: { index: number; short: string; label: string }[] = [
  { index: 0, short: 'Su', label: 'Sunday' },
  { index: 1, short: 'Mo', label: 'Monday' },
  { index: 2, short: 'Tu', label: 'Tuesday' },
  { index: 3, short: 'We', label: 'Wednesday' },
  { index: 4, short: 'Th', label: 'Thursday' },
  { index: 5, short: 'Fr', label: 'Friday' },
  { index: 6, short: 'Sa', label: 'Saturday' },
];

const DEFAULT_FREQUENCY: RecurrenceFrequency = 'daily';
const DEFAULT_WEEKDAYS: number[] = [1]; // Monday

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Controlled recurrence configuration component for use inside a task
 * create/edit form.
 *
 * Renders:
 *  1. An enable/disable toggle checkbox.
 *  2. A frequency selector (Daily / Weekly / Monthly / Custom) — visible when
 *     recurrence is enabled.
 *  3. A 7-day weekday multi-picker (Sun–Sat) — visible only when "Custom" is
 *     selected.
 *
 * The component is fully controlled: it holds no internal state and drives all
 * rendering entirely from the `value` prop.  All user interactions are
 * communicated upward via `onChange`.
 */
export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const uid = useId();
  const toggleId = `${uid}-toggle`;
  const frequencyGroupId = `${uid}-frequency`;

  const isEnabled = value !== null;
  const currentFrequency = value?.type ?? DEFAULT_FREQUENCY;
  const currentWeekdays = value?.daysOfWeek ?? DEFAULT_WEEKDAYS;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      onChange({ type: DEFAULT_FREQUENCY, interval: 1 });
    } else {
      onChange(null);
    }
  }

  function handleFrequencyChange(freq: RecurrenceFrequency) {
    if (freq === 'custom') {
      onChange({ type: 'custom', interval: 1, daysOfWeek: DEFAULT_WEEKDAYS });
    } else {
      onChange({ type: freq, interval: 1 });
    }
  }

  function handleWeekdayToggle(dayIndex: number) {
    const selected = new Set(currentWeekdays);

    if (selected.has(dayIndex)) {
      // Enforce at least one day must remain selected.
      if (selected.size === 1) return;
      selected.delete(dayIndex);
    } else {
      selected.add(dayIndex);
    }

    onChange({
      type: 'custom',
      interval: value?.interval ?? 1,
      daysOfWeek: Array.from(selected).sort((a, b) => a - b),
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="recurrence-selector" role="group" aria-labelledby={`${uid}-heading`}>
      <span id={`${uid}-heading`} className="recurrence-selector__heading">
        Recurrence
      </span>

      {/* ── Toggle ── */}
      <label className="recurrence-selector__toggle-label" htmlFor={toggleId}>
        <input
          id={toggleId}
          type="checkbox"
          className="recurrence-selector__toggle-input"
          checked={isEnabled}
          onChange={handleToggle}
          aria-describedby={`${uid}-heading`}
        />
        <span className="recurrence-selector__toggle-text">Repeat this task</span>
      </label>

      {/* ── Frequency selector — visible when enabled ── */}
      {isEnabled && (
        <fieldset className="recurrence-selector__frequency-fieldset">
          <legend className="recurrence-selector__frequency-legend" id={frequencyGroupId}>
            Repeat
          </legend>
          <div className="recurrence-selector__frequency-options" role="radiogroup">
            {FREQUENCIES.map(({ value: freq, label }) => {
              const radioId = `${uid}-freq-${freq}`;
              return (
                <label
                  key={freq}
                  htmlFor={radioId}
                  className={`recurrence-selector__freq-label${
                    currentFrequency === freq ? ' recurrence-selector__freq-label--active' : ''
                  }`}
                >
                  <input
                    id={radioId}
                    type="radio"
                    name={frequencyGroupId}
                    className="recurrence-selector__freq-input"
                    value={freq}
                    checked={currentFrequency === freq}
                    onChange={() => handleFrequencyChange(freq)}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── Weekday picker — visible only when Custom is selected ── */}
      {isEnabled && currentFrequency === 'custom' && (
        <fieldset className="recurrence-selector__weekday-fieldset">
          <legend className="recurrence-selector__weekday-legend">
            Days of the week
            <span className="recurrence-selector__weekday-hint" aria-live="polite">
              {currentWeekdays.length === 1 ? ' (at least one required)' : ''}
            </span>
          </legend>
          <div className="recurrence-selector__weekday-options">
            {WEEKDAYS.map(({ index, short, label }) => {
              const isChecked = currentWeekdays.includes(index);
              const isOnlySelected = isChecked && currentWeekdays.length === 1;
              const checkboxId = `${uid}-day-${index}`;
              return (
                <label
                  key={index}
                  htmlFor={checkboxId}
                  className={`recurrence-selector__day-label${
                    isChecked ? ' recurrence-selector__day-label--selected' : ''
                  }${isOnlySelected ? ' recurrence-selector__day-label--required' : ''}`}
                  title={isOnlySelected ? `${label} must remain selected` : label}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="recurrence-selector__day-input"
                    checked={isChecked}
                    onChange={() => handleWeekdayToggle(index)}
                    aria-label={label}
                    aria-checked={isChecked}
                    disabled={isOnlySelected}
                  />
                  <span aria-hidden="true">{short}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
