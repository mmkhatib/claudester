import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Task } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import { successResponse, withErrorHandling, notFoundError } from '@/lib/api-utils';
import { spawn, execSync } from 'child_process';

function findClaude(): string {
  try { return execSync('which claude', { encoding: 'utf8' }).trim(); } catch {}
  const paths = ['/usr/local/bin/claude', '/usr/bin/claude', `${process.env.HOME}/.local/bin/claude`];
  return paths.find(p => { try { execSync(`test -f ${p}`); return true; } catch { return false; } }) || 'claude';
}

const PRIORITY_MAP: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export const POST = withErrorHandling(async (request: NextRequest, { params }: { params: { specId: string } }) => {
  await requirePermission('SPEC_UPDATE');
  await connectDB();

  const spec = await Spec.findById(params.specId);
  if (!spec) return notFoundError('Specification');

  const tasks = await Task.find({ specId: params.specId }).sort({ order: 1 });
  if (!tasks.length) return successResponse({ updated: 0 }, 'No tasks to analyze');

  const taskList = tasks.map((t: any, i: number) =>
    `${i}: ID:${t._id} "${t.title}" — ${t.description.slice(0, 100)}`
  ).join('\n');

  const prompt = `You are analyzing implementation tasks for a software feature spec.

Spec: "${spec.title}"

Tasks (index: ID "title"):
${taskList}

For each task assign:
- priority: P0 (critical path/blocking), P1 (core feature), P2 (supporting), P3 (polish/optional)
- dependencies: array of task IDs that must complete before this task can start (use the exact ID strings)

Respond ONLY with valid JSON, no explanation:
{"tasks":[{"id":"<_id>","priority":"P1","dependencies":["<_id>","<_id>"]}]}`;

  const claude = findClaude();
  const env = { ...process.env };
  delete (env as any).ANTHROPIC_API_KEY;

  const result = await new Promise<string>((resolve) => {
    let output = '';
    const proc = spawn(claude, ['-p', prompt, '--output-format', 'text'], { env });
    proc.stdout.on('data', (d: Buffer) => output += d.toString());
    proc.on('close', () => resolve(output));
    proc.on('error', () => resolve(''));
  });

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return successResponse({ updated: 0, error: 'AI parse failed' }, 'Analysis failed');

  const { tasks: analyzed } = JSON.parse(jsonMatch[0]);
  let updated = 0;
  for (const item of analyzed) {
    await Task.findByIdAndUpdate(item.id, {
      priority: PRIORITY_MAP[item.priority] ?? 1,
      dependencies: item.dependencies || [],
    });
    updated++;
  }

  return successResponse({ updated }, `Updated ${updated} tasks`);
});
