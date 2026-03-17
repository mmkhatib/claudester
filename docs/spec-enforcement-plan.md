# Spec Dependency Enforcement Plan

## Goal
Hard-enforce build order so specs and their tasks cannot be started unless all dependency specs are COMPLETE. Same-layer specs can run in parallel.

## Logic
```
isBlocked(spec) = spec.dependsOn.some(dep => dep.status !== 'COMPLETE')
```

## Changes

### Backend enforcement (API layer)
1. **`app/api/tasks/[taskId]/start/route.ts`** — before starting, fetch task → spec → check `isBlocked`. Reject 403 with list of blocking specs.
2. **`app/api/tasks/bulk-start/route.ts`** — same check for each task's spec.
3. **`backend/services/task-execution-service.ts`** — same check inside `startTask()`. After task completes, check if all sibling tasks are COMPLETED → auto-set spec status to COMPLETE.

### Auto-complete spec
- In `task-execution-service.ts` after `task.status = COMPLETED`, query all tasks for the spec. If all COMPLETED → `spec.status = 'COMPLETE'`.

### UI enforcement
4. **`app/(dashboard)/specs/[specId]/page.tsx`** — compute `isBlocked` + `blockingSpecs` server-side, pass to child components.
5. **`app/(dashboard)/specs/[specId]/spec-actions.tsx`** — accept `isBlocked` + `blockingSpecs` props. Show red banner listing blocking specs. Disable all buttons.
6. **`app/(dashboard)/specs/[specId]/task-list.tsx`** — accept `isBlocked` prop. Disable Start/Start Selected/Start All buttons. Show tooltip.

## Files modified
- `app/api/tasks/[taskId]/start/route.ts`
- `app/api/tasks/bulk-start/route.ts`
- `backend/services/task-execution-service.ts`
- `app/(dashboard)/specs/[specId]/page.tsx`
- `app/(dashboard)/specs/[specId]/spec-actions.tsx`
- `app/(dashboard)/specs/[specId]/task-list.tsx`
