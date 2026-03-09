/**
 * recurrenceActions.test.ts
 *
 * Unit tests for generateNextInstance and onRecurringTaskComplete.
 *
 * localStorage is stubbed via a simple in-memory Map so these tests run in any
 * JS environment (Node / jsdom) without requiring a real browser.
 */

import { generateNextInstance, onRecurringTaskComplete } from './recurrenceActions';
import type { Task, RecurrenceRule } from '../types';

// ── localStorage stub ──────────────────────────────────────────────────────────

const store: Map<string, string> = new Map();

const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ── Test helpers ───────────────────────────────────────────────────────────────

const TASKS_KEY = 'todoer_tasks';

function seedTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function readTasks(): Task[] {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? (JSON.parse(raw) as Task[]) : [];
}

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'task-001',
    title: 'Default task',
    notes: '',
    listId: null,
    dueDate: '2025-06-15',
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    isRecurring: true,
    recurrenceRule: { type: 'daily', interval: 1 },
    seriesId: 'series-abc',
    seriesAnchorDate: '2025-06-15',
    ...overrides,
  };
}

// ── generateNextInstance ───────────────────────────────────────────────────────

describe('generateNextInstance', () => {
  describe('daily recurrence', () => {
    it('returns a new instance due 1 day later', () => {
      const task = makeTask({ dueDate: '2025-06-15', recurrenceRule: { type: 'daily' } });
      const next = generateNextInstance(task);
      expect(next.dueDate).toBe('2025-06-16');
    });

    it('handles month boundary', () => {
      const task = makeTask({ dueDate: '2025-06-30', recurrenceRule: { type: 'daily' } });
      expect(generateNextInstance(task).dueDate).toBe('2025-07-01');
    });

    it('handles year boundary', () => {
      const task = makeTask({ dueDate: '2025-12-31', recurrenceRule: { type: 'daily' } });
      expect(generateNextInstance(task).dueDate).toBe('2026-01-01');
    });

    it('respects interval > 1', () => {
      const task = makeTask({
        dueDate: '2025-06-15',
        recurrenceRule: { type: 'daily', interval: 3 },
      });
      expect(generateNextInstance(task).dueDate).toBe('2025-06-18');
    });
  });

  describe('weekly recurrence', () => {
    it('returns a new instance due 7 days later', () => {
      // 2025-06-11 (Wed) → 2025-06-18 (Wed)
      const task = makeTask({ dueDate: '2025-06-11', recurrenceRule: { type: 'weekly' } });
      expect(generateNextInstance(task).dueDate).toBe('2025-06-18');
    });
  });

  describe('monthly recurrence', () => {
    it('returns same day-of-month in next month', () => {
      const task = makeTask({
        dueDate: '2025-06-15',
        recurrenceRule: { type: 'monthly' },
        seriesAnchorDate: '2025-06-15',
      });
      expect(generateNextInstance(task).dueDate).toBe('2025-07-15');
    });

    it('clamps Jan 31 → Feb 28 in a non-leap year', () => {
      const task = makeTask({
        dueDate: '2025-01-31',
        recurrenceRule: { type: 'monthly' },
        seriesAnchorDate: '2025-01-31',
      });
      expect(generateNextInstance(task).dueDate).toBe('2025-02-28');
    });

    it('uses seriesAnchorDate day-of-month over fromDate when they differ', () => {
      // Series started Jan 31; clamped to Apr 30 last month.
      // May has 31 days → should target May 31 (from anchor, not Apr 30).
      const task = makeTask({
        dueDate: '2025-04-30',
        recurrenceRule: { type: 'monthly' },
        seriesAnchorDate: '2025-01-31',
      });
      expect(generateNextInstance(task).dueDate).toBe('2025-05-31');
    });

    it('falls back to fromDate as anchor when seriesAnchorDate is null', () => {
      const task = makeTask({
        dueDate: '2025-06-15',
        recurrenceRule: { type: 'monthly' },
        seriesAnchorDate: null,
      });
      expect(generateNextInstance(task).dueDate).toBe('2025-07-15');
    });
  });

  describe('custom weekday recurrence', () => {
    it('[Mon, Fri] from Monday returns next Friday', () => {
      // 2025-06-09 is a Monday
      const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 5] };
      const task = makeTask({ dueDate: '2025-06-09', recurrenceRule: rule });
      expect(generateNextInstance(task).dueDate).toBe('2025-06-13');
    });

    it('[Mon, Fri] from Friday returns next Monday', () => {
      // 2025-06-13 is a Friday
      const rule: RecurrenceRule = { type: 'custom', daysOfWeek: [1, 5] };
      const task = makeTask({ dueDate: '2025-06-13', recurrenceRule: rule });
      expect(generateNextInstance(task).dueDate).toBe('2025-06-16');
    });
  });

  describe('instance identity and series metadata', () => {
    it('assigns a fresh id (not the same as the completed task)', () => {
      const task = makeTask({ id: 'original-id' });
      const next = generateNextInstance(task);
      expect(next.id).not.toBe('original-id');
      expect(typeof next.id).toBe('string');
      expect(next.id.length).toBeGreaterThan(0);
    });

    it('retains the same seriesId', () => {
      const task = makeTask({ seriesId: 'series-xyz' });
      expect(generateNextInstance(task).seriesId).toBe('seriesId' in task ? task.seriesId : 'series-xyz');
    });

    it('retains title, notes, listId, recurrenceRule, seriesAnchorDate', () => {
      const rule: RecurrenceRule = { type: 'weekly' };
      const task = makeTask({
        title: 'Walk the dog',
        notes: 'Bring the leash',
        listId: 'list-home',
        recurrenceRule: rule,
        seriesId: 'series-dog',
        seriesAnchorDate: '2025-06-09',
        dueDate: '2025-06-09',
      });
      const next = generateNextInstance(task);
      expect(next.title).toBe('Walk the dog');
      expect(next.notes).toBe('Bring the leash');
      expect(next.listId).toBe('list-home');
      expect(next.recurrenceRule).toEqual(rule);
      expect(next.seriesId).toBe('series-dog');
      expect(next.seriesAnchorDate).toBe('2025-06-09');
    });

    it('is incomplete (completed=false, completedAt=null)', () => {
      const next = generateNextInstance(makeTask());
      expect(next.completed).toBe(false);
      expect(next.completedAt).toBeNull();
    });

    it('isRecurring is true on the next instance', () => {
      expect(generateNextInstance(makeTask()).isRecurring).toBe(true);
    });

    it('has fresh createdAt and updatedAt timestamps', () => {
      const before = Date.now();
      const next = generateNextInstance(makeTask());
      const after = Date.now();
      expect(new Date(next.createdAt).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(next.createdAt).getTime()).toBeLessThanOrEqual(after);
      expect(next.createdAt).toBe(next.updatedAt);
    });
  });

  describe('error cases', () => {
    it('throws when dueDate is null', () => {
      const task = makeTask({ dueDate: null });
      expect(() => generateNextInstance(task)).toThrow(/dueDate is null/);
    });

    it('throws when recurrenceRule is null', () => {
      const task = makeTask({ recurrenceRule: null });
      expect(() => generateNextInstance(task)).toThrow(/recurrenceRule is null/);
    });
  });
});

// ── onRecurringTaskComplete ────────────────────────────────────────────────────

describe('onRecurringTaskComplete', () => {
  beforeEach(() => {
    store.clear();
  });

  // ── Acceptance criteria 1: daily task → dueDate + 1 day ──────────────────────

  it('AC1: completing a daily recurring task creates a new task with dueDate +1 day', () => {
    const task = makeTask({
      id: 'task-daily',
      dueDate: '2025-06-15',
      recurrenceRule: { type: 'daily', interval: 1 },
      seriesId: 'series-001',
    });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);

    expect(result).not.toBeNull();
    expect(result!.next.dueDate).toBe('2025-06-16');
  });

  // ── Acceptance criteria 2: same seriesId, title, listId, recurrenceRule ──────

  it('AC2: new instance inherits seriesId, title, listId, and recurrenceRule', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1 };
    const task = makeTask({
      id: 'task-ac2',
      title: 'Read a book',
      listId: 'list-personal',
      recurrenceRule: rule,
      seriesId: 'series-book',
      dueDate: '2025-07-01',
    });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);

    expect(result!.next.seriesId).toBe('series-book');
    expect(result!.next.title).toBe('Read a book');
    expect(result!.next.listId).toBe('list-personal');
    expect(result!.next.recurrenceRule).toEqual(rule);
  });

  // ── Acceptance criteria 3: fresh UUID, status=incomplete ─────────────────────

  it('AC3: new instance has a fresh id and is incomplete', () => {
    const task = makeTask({ id: 'original-task', dueDate: '2025-06-20' });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);

    expect(result!.next.id).not.toBe('original-task');
    expect(result!.next.completed).toBe(false);
    expect(result!.next.completedAt).toBeNull();
  });

  // ── Acceptance criteria 4: completed task is archived ────────────────────────

  it('AC4: completed task is marked done and retained in storage', () => {
    const task = makeTask({ id: 'task-done', dueDate: '2025-06-15' });
    seedTasks([task]);

    onRecurringTaskComplete(task);

    const tasks = readTasks();
    const done = tasks.find((t) => t.id === 'task-done');
    expect(done).toBeDefined();
    expect(done!.completed).toBe(true);
    expect(done!.completedAt).not.toBeNull();
  });

  // ── Acceptance criteria 5: both records survive a "page refresh" ──────────────

  it('AC5: both completed task and new instance are readable after re-reading localStorage', () => {
    const task = makeTask({ id: 'task-persist', dueDate: '2025-08-10' });
    seedTasks([task]);

    onRecurringTaskComplete(task);

    // Simulate page refresh by re-reading from localStorage
    const tasks = readTasks();
    expect(tasks.length).toBe(2);

    const done = tasks.find((t) => t.id === 'task-persist');
    const next = tasks.find((t) => t.id !== 'task-persist');

    expect(done!.completed).toBe(true);
    expect(next!.completed).toBe(false);
    expect(next!.dueDate).toBe('2025-08-11');
  });

  // ── Acceptance criteria 5b: single atomic write ───────────────────────────────

  it('AC5b: both records are written in a single localStorage.setItem call', () => {
    const task = makeTask({ id: 'task-atomic', dueDate: '2025-06-15' });
    seedTasks([task]);

    const setItemSpy = jest.spyOn(localStorage, 'setItem');

    onRecurringTaskComplete(task);

    // completeRecurringTaskAtomic must do exactly ONE write that captures both records.
    const taskWrites = setItemSpy.mock.calls.filter(([key]) => key === TASKS_KEY);
    expect(taskWrites.length).toBe(1);

    // Verify that single write payload contains both records.
    const payload = JSON.parse(taskWrites[0][1] as string) as Task[];
    expect(payload.length).toBe(2);
    expect(payload.some((t) => t.id === 'task-atomic' && t.completed)).toBe(true);
    expect(payload.some((t) => t.id !== 'task-atomic' && !t.completed)).toBe(true);

    setItemSpy.mockRestore();
  });

  // ── Acceptance criteria 6: non-recurring tasks are not affected ───────────────

  it('AC6: returns null and does not modify storage for non-recurring tasks', () => {
    const task = makeTask({
      id: 'task-nonrecurring',
      isRecurring: false,
      recurrenceRule: null,
      seriesId: null,
      seriesAnchorDate: null,
    });
    seedTasks([task]);

    const setItemSpy = jest.spyOn(localStorage, 'setItem');

    const result = onRecurringTaskComplete(task);

    expect(result).toBeNull();
    // No write should have occurred.
    expect(setItemSpy.mock.calls.filter(([key]) => key === TASKS_KEY).length).toBe(0);

    setItemSpy.mockRestore();
  });

  it('returns null when dueDate is missing (guard against malformed data)', () => {
    const task = makeTask({ dueDate: null });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);
    expect(result).toBeNull();
  });

  it('returns null when recurrenceRule is missing (guard against malformed data)', () => {
    const task = makeTask({ recurrenceRule: null });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);
    expect(result).toBeNull();
  });

  // ── Series membership on new instance ────────────────────────────────────────

  it('next instance preserves isRecurring=true', () => {
    const task = makeTask({ dueDate: '2025-06-15' });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);
    expect(result!.next.isRecurring).toBe(true);
  });

  // ── List assignment propagation ───────────────────────────────────────────────

  it('next instance is assigned to the same list as the completed task', () => {
    const task = makeTask({ dueDate: '2025-06-15', listId: 'list-work' });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);
    expect(result!.next.listId).toBe('list-work');
  });

  // ── Weekly recurrence ─────────────────────────────────────────────────────────

  it('weekly recurring task generates instance 7 days later', () => {
    // 2025-06-11 is a Wednesday
    const task = makeTask({
      dueDate: '2025-06-11',
      recurrenceRule: { type: 'weekly', interval: 1 },
    });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);
    expect(result!.next.dueDate).toBe('2025-06-18');
  });

  // ── Monthly recurrence month-end clamping ─────────────────────────────────────

  it('monthly recurring task clamps Mar 31 → Apr 30', () => {
    const task = makeTask({
      dueDate: '2025-03-31',
      recurrenceRule: { type: 'monthly', interval: 1 },
      seriesAnchorDate: '2025-03-31',
    });
    seedTasks([task]);

    const result = onRecurringTaskComplete(task);
    expect(result!.next.dueDate).toBe('2025-04-30');
  });
});
