# Design

## Architecture

Client-side SPA architecture with no backend. All logic runs in the browser using localStorage for persistence. Key patterns: (1) Recurrence Engine — a pure utility module (`recurrenceEngine.ts`) that computes next due dates given a rule object and a reference date, fully unit-testable with zero side effects. (2) Series-based task graph — tasks in a recurring series share a `seriesId` (UUIDv4), allowing O(n) bulk operations by filtering the task store. (3) Event-driven completion hook — on task completion, a single synchronous function call invokes the recurrence engine, creates the next instance, and persists both the completed task and the new instance in one localStorage write to avoid UI flicker. (4) Immutable instance model — each generated occurrence is a first-class task record; edits to a single occurrence clone the task and sever its tie to the series via a new `seriesId` or null, while 'edit all future' updates all tasks in the series with `dueDate >= pivot`. (5) Existing persistence layer is extended, not replaced — the current localStorage read/write helpers gain awareness of the new fields but retain backward compatibility by defaulting `recurrenceRule`, `seriesId`, and `isRecurring` to null/false for legacy records.

## Data Model

Task record schema (TypeScript interface):

```ts
type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom';

interface RecurrenceRule {
  frequency: Frequency;   // required
  interval: number;       // default 1; e.g. 2 = every 2 weeks
  weekdays?: number[];    // 0=Sun…6=Sat; only used when frequency='custom'
}

interface Task {
  id: string;             // UUIDv4, unique per instance
  seriesId: string | null;// UUIDv4 shared by all instances in a series
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  seriesAnchorDate: string | null; // ISO date of the original task; basis for monthly recurrence day-of-month
  title: string;
  notes: string;
  listId: string | null;
  dueDate: string | null; // ISO date string
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Storage layout in localStorage:
- Key `todoer_tasks`: JSON array of Task[]
- Key `todoer_lists`: JSON array of List[] (unchanged)

Recurrence engine signature:
```ts
function computeNextDueDate(
  currentDueDate: Date,
  rule: RecurrenceRule,
  anchorDate: Date
): Date
```
Edge case handling: monthly recurrence clamps to last day of month (Jan 31 → Feb 28/29). Custom weekday recurrence scans forward from `currentDueDate + 1` to the next matching weekday in `rule.weekdays`, wrapping within a 7-day window.

## API Endpoints

- No server-side API endpoints required. All operations are client-side.
- taskStore.createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task — generates UUID, timestamps, writes to localStorage
- taskStore.updateTask(id: string, patch: Partial<Task>): Task — merges patch, updates `updatedAt`, writes to localStorage
- taskStore.deleteTask(id: string): void — removes single record from localStorage array
- taskStore.getTasksBySeries(seriesId: string): Task[] — filters all tasks by seriesId, sorted by dueDate asc
- taskStore.getFutureTasksInSeries(seriesId: string, fromDate: string): Task[] — returns series tasks with dueDate >= fromDate
- recurrenceEngine.computeNextDueDate(currentDueDate: Date, rule: RecurrenceRule, anchorDate: Date): Date — pure function, no I/O
- recurrenceEngine.generateNextInstance(completedTask: Task): Task — calls computeNextDueDate, constructs new Task record (new UUID, same seriesId, same recurrenceRule, completed=false)
- recurrenceActions.completeRecurringTask(task: Task): void — synchronously: (1) generates next instance via recurrenceEngine, (2) persists next instance, (3) marks original complete — single localStorage write batch
- recurrenceActions.editOccurrence(task: Task, patch: Partial<Task>): void — detaches task from series (seriesId=null, isRecurring=false, recurrenceRule=null) and applies patch as a standalone one-time task
- recurrenceActions.editFutureOccurrences(seriesId: string, fromDate: string, patch: Partial<Task>): void — applies patch to all tasks in series with dueDate >= fromDate
- recurrenceActions.deleteOccurrence(taskId: string): void — deletes single task record, rest of series unaffected
- recurrenceActions.deleteFutureOccurrences(seriesId: string, fromDate: string): void — deletes all tasks in series with dueDate >= fromDate
- recurrenceActions.removeRecurrence(task: Task): void — sets isRecurring=false, recurrenceRule=null, seriesId=null on current instance only; future instances are deleted via deleteFutureOccurrences

## UI Components

- RecurrenceRuleEditor — reusable form section rendered inside the task create/edit modal. Props: value: RecurrenceRule | null, onChange: (rule: RecurrenceRule | null) => void. Contains: RecurrenceToggle (checkbox to enable/disable), FrequencySelector (radio or select for daily/weekly/monthly/custom), WeekdayPicker (7 checkboxes Sun–Sat, shown only when frequency=custom), IntervalInput (number input, optional advanced setting). Emits null when recurrence is disabled.
- RecurringTaskBadge — small repeat/cycle icon (e.g. SVG arrow loop) displayed inline next to task title in all list and Today views whenever task.isRecurring=true.
- RecurrenceConflictDialog — modal confirmation dialog triggered whenever user edits or deletes a task that belongs to a series (seriesId != null). Props: mode: 'edit' | 'delete', onSelectScope: (scope: 'this' | 'future' | 'all') => void, onCancel: () => void. Renders three options as radio buttons or distinct buttons. Reused for both edit and delete flows.
- RecurrenceSeriesViewer — panel or modal showing all instances in a series (past and future), accessed via task detail view or context menu 'View series'. Displays a scrollable list of Task records filtered by seriesId with their due dates and completion status.
- TaskCard / TaskListItem (extended) — existing component extended to: (1) render RecurringTaskBadge when isRecurring=true, (2) apply overdue highlight class when dueDate < today and completed=false (same logic as non-recurring tasks), (3) wire completion checkbox to recurrenceActions.completeRecurringTask when isRecurring=true instead of the standard completion handler.
- TaskCreateEditModal (extended) — existing modal extended to include RecurrenceRuleEditor below the due date field. On save: if recurrenceRule is newly set, generates a UUIDv4 seriesId and sets isRecurring=true; if recurrenceRule was previously set and is now changed, shows RecurrenceConflictDialog to determine scope of change.
- TodayView (no structural change) — existing view already filters by dueDate === today; generated recurring instances carry their computed dueDate so they appear automatically with no special-case logic.
- OverdueIndicator (no structural change) — existing overdue highlight logic evaluates task.dueDate < today and task.completed === false; recurring instances satisfy this identically to manual tasks.

