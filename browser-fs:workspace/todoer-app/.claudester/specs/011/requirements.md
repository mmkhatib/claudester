# Requirements

## Functional Requirements

- Users can configure any task as recurring by selecting a recurrence pattern: daily, weekly, monthly, or custom days of the week (e.g. every Monday and Wednesday)
- When creating or editing a task, a recurrence section is available allowing the user to enable recurrence and choose the schedule
- Recurring tasks display a repeat/cycle icon to visually distinguish them from non-recurring tasks in all views (task list, Today view, list views)
- When a recurring task is marked as complete, a new instance of that task is automatically generated with the next due date calculated based on the recurrence rule
- The completed instance is archived/marked done while the new instance appears in the task list with the upcoming due date
- Users can edit a single instance of a recurring task without affecting other future instances (edit this occurrence only)
- Users can edit all future instances of a recurring task, propagating changes to all upcoming occurrences
- Users can delete a single instance of a recurring task without affecting other future instances
- Users can delete all future instances of a recurring task, effectively ending the recurrence series
- Recurring tasks respect the due date feature: the original due date serves as the anchor for computing recurrence, and each generated instance carries its computed due date
- Recurring tasks with due dates appear in the 'Today' view when their computed due date matches the current date
- Overdue recurring tasks are visually highlighted in the same manner as non-recurring overdue tasks
- Recurring tasks assigned to a list remain in that list for all generated instances
- Tasks created while a specific list is selected and configured as recurring are automatically assigned to that list for all future instances
- Users can view the full recurrence schedule/series from a task detail view or context menu
- Recurrence can be removed from a task (converting it to a one-time task) without deleting the task itself
- When editing recurrence settings on an existing series, the user is prompted to apply changes to 'This occurrence', 'This and all future occurrences', or 'All occurrences'
- Daily recurrence generates the next instance exactly 1 day after the current due date
- Weekly recurrence generates the next instance exactly 7 days after the current due date
- Monthly recurrence generates the next instance on the same day of the month in the following month, handling edge cases (e.g. Jan 31 → Feb 28/29)
- Custom day-of-week recurrence generates the next instance on the next matching weekday(s) in the schedule

## Technical Requirements

- Recurrence rules must be stored as structured data (e.g. a recurrence rule object) on the task record, not as plain text, to enable programmatic computation of next due dates
- Recurrence rule schema must capture: frequency type (daily | weekly | monthly | custom), interval (default 1), and for custom type, an array of weekday indices (0=Sunday through 6=Saturday)
- Each task instance in a series must store a reference (series ID) linking it to its parent recurrence series, enabling bulk edit/delete operations across the series
- A dedicated recurrence engine/utility function must compute the next due date given a current date and a recurrence rule object, covering all frequency types and edge cases
- The recurrence engine must be a pure, side-effect-free function to facilitate unit testing
- On task completion, the recurrence engine is invoked client-side to generate and persist the next task instance before updating the completed task's status
- All task data including recurrence rules and series linkage must persist in localStorage using the existing persistence mechanism established by the Core CRUD spec
- The data model for a task must be extended to include: recurrenceRule (object | null), seriesId (string | null), and isRecurring (boolean) fields
- Series IDs must be generated as unique identifiers (e.g. UUID v4 or equivalent) at the time recurrence is first configured on a task
- When querying tasks for the Today view or overdue filtering, the due date on generated recurring instances must be evaluated identically to manually set due dates
- UI components for recurrence configuration (frequency selector, day-of-week checkboxes) must be reusable and render within the existing task create/edit modal or panel
- Edit/delete conflict resolution (single vs. all future) must be handled via a modal confirmation dialog component that is reusable across edit and delete actions
- No server-side infrastructure is required; all logic runs client-side in the browser using localStorage for persistence
- Performance: generating the next recurring instance on task completion must complete synchronously and within a single event loop tick to avoid UI flicker

## Constraints

- The implementation must not introduce any backend or server-side dependencies; the app remains entirely client-side with localStorage persistence
- Recurrence configuration is limited to the four defined schedule types: daily, weekly, monthly, and specific days of the week — no support for complex iCal-style rules (e.g. 'every 3rd Tuesday') in this iteration
- The system generates only one future instance at a time upon task completion; it does not pre-generate the entire series upfront, to keep localStorage usage bounded
- Monthly recurrence on days 29–31 must gracefully degrade to the last valid day of the target month (e.g. March 31 → April 30)
- Recurring tasks must be compatible with all existing features: Core CRUD (create/edit/delete), Lists/Categories (list assignment), and Due Dates (Today view, overdue highlighting, urgency flagging)
- Deleting a list that contains recurring task instances must handle or warn about orphaned series instances consistently with the existing list-deletion behavior
- The recurrence repeat icon must be sourced from the existing icon library or system used by the app to maintain visual consistency
- Bulk operations on a recurring series ('all future') only affect instances that have not yet been completed — completed past instances are immutable
- The feature must function correctly in all major modern browsers (Chrome, Firefox, Safari, Edge) without polyfills beyond what is already in use
- localStorage capacity limitations apply; the implementation must not store redundant or duplicate data across recurrence instances

## Acceptance Criteria

- Given a new task, when the user enables recurrence and selects 'Daily', then upon saving the task has isRecurring=true, recurrenceRule.frequency='daily', and a non-null seriesId
- Given a daily recurring task due today, when the user marks it complete, then a new task instance appears in the list with a due date of tomorrow and the same seriesId
- Given a weekly recurring task due on a Wednesday, when the user marks it complete, then the new instance has a due date exactly 7 days later (next Wednesday)
- Given a monthly recurring task due on the 31st, when the user marks it complete in a month where the next month has fewer than 31 days, then the new instance is due on the last day of that next month
- Given a custom recurring task set to repeat on Monday and Friday, when the user marks it complete on a Monday, then the new instance is due on the following Friday
- Given a recurring task instance, when the user views the task list, then a repeat/cycle icon is visible on the task row
- Given a recurring task, when the user chooses 'Edit this occurrence only' and changes the title, then only the selected instance has the updated title and all other series instances retain the original title
- Given a recurring task, when the user chooses 'Edit this and all future occurrences' and changes the title, then the selected instance and all future (uncompleted) instances reflect the updated title
- Given a recurring task, when the user chooses 'Delete this occurrence only', then only that instance is removed and the next future instance remains in the task list
- Given a recurring task, when the user chooses 'Delete all future occurrences', then the selected and all future uncompleted instances are removed, and completed past instances are unaffected
- Given a recurring task with a due date matching today, when the user navigates to the 'Today' view, then the recurring task appears in that view with its repeat icon
- Given a recurring task whose due date has passed and no new instance has been generated, when the user views the task list, then it is visually highlighted as overdue in the same style as non-recurring overdue tasks
- Given a recurring task assigned to the 'Work' list, when the task is completed and a new instance is generated, then the new instance is also assigned to the 'Work' list
- Given a recurring task, when the user removes the recurrence setting (disables recurrence), then the task remains with no recurrenceRule and isRecurring=false, and completing it does not generate a new instance
- Given the app is closed and reopened (page refresh), when the user views the task list, then all recurring task instances and their recurrence rules are restored from localStorage exactly as they were before the refresh
- Given a recurring task configured with 'Edit all occurrences', when changes are saved, completed past instances are not modified
- Given the task creation form with a list selected, when the user creates a recurring task, then all future auto-generated instances are automatically assigned to that same list

