/**
 * Agent Context Loader Service
 *
 * Loads project context files for AI agents to ensure consistent development
 * across sessions. Agents automatically load:
 * - Project context (.claude/context.md)
 * - Development instructions (.claude/instructions.md)
 * - Current task (.current-task)
 * - Current spec (spec/.current-spec and its documents)
 * - Development standards (from Claudester's docs/standards/)
 */

import fs from 'fs/promises';
import path from 'path';
import { IProject } from '../models/Project';
import { loggers } from '@/lib/logger';

export interface AgentContext {
  project: IProject;
  workspacePath: string;

  // Project-specific context
  claudeContext: string;
  instructions: string;
  currentTask: string;

  // Current spec
  currentSpec: {
    id: string;
    requirements: string | null;
    design: string | null;
    tasks: string | null;
    path: string;
  } | null;

  // Development standards (from Claudester repo)
  standards: {
    styleGuide: string;
    apiContracts: string;
    agentGuidelines: string;
    codeReview: string;
  };
}

/**
 * Load complete context for an AI agent working on a project
 */
export async function loadAgentContext(project: IProject): Promise<AgentContext> {
  const workspacePath = project.workspacePath;

  if (!workspacePath) {
    throw new Error('Project has no workspace path. Cannot load agent context.');
  }

  loggers.agent.info({ projectId: project._id, workspacePath }, 'Loading agent context');

  try {
    // Load project-specific context files
    const claudeContext = await readFileIfExists(
      path.join(workspacePath, '.claude', 'context.md'),
      '# Project Context\n\nNo context file found.'
    );

    const instructions = await readFileIfExists(
      path.join(workspacePath, '.claude', 'instructions.md'),
      '# Development Instructions\n\nNo instructions file found.'
    );

    const currentTask = await readFileIfExists(
      path.join(workspacePath, '.current-task'),
      'No current task specified.'
    );

    // Load current spec
    let currentSpec: AgentContext['currentSpec'] = null;
    try {
      const currentSpecId = await fs.readFile(
        path.join(workspacePath, 'spec', '.current-spec'),
        'utf-8'
      );

      const specId = currentSpecId.trim();
      const specPath = path.join(workspacePath, 'spec', specId);

      currentSpec = {
        id: specId,
        requirements: await readFileIfExists(path.join(specPath, 'requirements.md')),
        design: await readFileIfExists(path.join(specPath, 'design.md')),
        tasks: await readFileIfExists(path.join(specPath, 'tasks.md')),
        path: specPath,
      };

      loggers.agent.info({ specId }, 'Loaded current spec');
    } catch (error) {
      loggers.agent.debug({ error }, 'No current spec found');
    }

    // Load Claudester development standards
    const standardsPath = path.join(process.cwd(), 'docs', 'standards');

    const standards = {
      styleGuide: await readFileIfExists(
        path.join(standardsPath, 'STYLE_GUIDE.md'),
        '# Style Guide\n\nNo style guide found.'
      ),
      apiContracts: await readFileIfExists(
        path.join(standardsPath, 'API_CONTRACTS.md'),
        '# API Contracts\n\nNo API contracts found.'
      ),
      agentGuidelines: await readFileIfExists(
        path.join(standardsPath, 'AGENT_GUIDELINES.md'),
        '# Agent Guidelines\n\nNo agent guidelines found.'
      ),
      codeReview: await readFileIfExists(
        path.join(standardsPath, 'CODE_REVIEW.md'),
        '# Code Review\n\nNo code review checklist found.'
      ),
    };

    const context: AgentContext = {
      project,
      workspacePath,
      claudeContext,
      instructions,
      currentTask,
      currentSpec,
      standards,
    };

    loggers.agent.info(
      {
        projectId: project._id,
        hasCurrentSpec: !!currentSpec,
        contextLength: claudeContext.length + instructions.length,
      },
      'Agent context loaded successfully'
    );

    return context;
  } catch (error) {
    loggers.agent.error({ error, projectId: project._id }, 'Failed to load agent context');
    throw new Error(`Failed to load agent context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format agent context as a prompt system message
 */
export function formatContextAsPrompt(context: AgentContext): string {
  let prompt = '';

  // Project overview
  prompt += `# Project: ${context.project.name}\n\n`;
  prompt += `${context.project.description}\n\n`;
  prompt += `**Workspace**: ${context.workspacePath}\n\n`;
  prompt += `---\n\n`;

  // Project-specific context
  prompt += `## Project Context\n\n`;
  prompt += `${context.claudeContext}\n\n`;
  prompt += `---\n\n`;

  // Development instructions
  prompt += `## Development Instructions\n\n`;
  prompt += `${context.instructions}\n\n`;
  prompt += `---\n\n`;

  // Current task
  prompt += `## Current Task\n\n`;
  prompt += `${context.currentTask}\n\n`;
  prompt += `---\n\n`;

  // Current spec (if exists)
  if (context.currentSpec) {
    prompt += `## Active Specification: ${context.currentSpec.id}\n\n`;

    if (context.currentSpec.requirements) {
      prompt += `### Requirements\n\n`;
      prompt += `${context.currentSpec.requirements}\n\n`;
    }

    if (context.currentSpec.design) {
      prompt += `### Design\n\n`;
      prompt += `${context.currentSpec.design}\n\n`;
    }

    if (context.currentSpec.tasks) {
      prompt += `### Tasks\n\n`;
      prompt += `${context.currentSpec.tasks}\n\n`;
    }

    prompt += `---\n\n`;
  }

  // Development standards (summary)
  prompt += `## Development Standards\n\n`;
  prompt += `**Important**: Follow these Claudester development standards:\n\n`;
  prompt += `- **Style Guide**: TypeScript/React patterns, naming conventions\n`;
  prompt += `- **API Contracts**: Standard response formats, data models\n`;
  prompt += `- **Agent Guidelines**: Code generation standards, quality checks\n`;
  prompt += `- **Code Review**: Quality gates (lint, type-check, tests, build)\n\n`;
  prompt += `Full standards available in workspace at: \`${path.join(process.cwd(), 'docs', 'standards')}\`\n\n`;
  prompt += `---\n\n`;

  // Critical reminders
  prompt += `## Critical Reminders\n\n`;
  prompt += `1. **Read before writing**: Always check existing code patterns\n`;
  prompt += `2. **Follow the spec**: Only implement what's approved\n`;
  prompt += `3. **Match style**: Code should be indistinguishable from human-written\n`;
  prompt += `4. **Test everything**: Write tests for all new functionality\n`;
  prompt += `5. **Update tracking**: Keep .current-task and spec files up to date\n\n`;

  return prompt;
}

/**
 * Load context specifically for task execution
 */
export async function loadTaskExecutionContext(
  project: IProject,
  taskTitle: string,
  taskDescription: string
): Promise<string> {
  const context = await loadAgentContext(project);

  let prompt = formatContextAsPrompt(context);

  // Add task-specific context
  prompt += `## Current Task to Execute\n\n`;
  prompt += `**Title**: ${taskTitle}\n\n`;
  if (taskDescription) {
    prompt += `**Description**:\n${taskDescription}\n\n`;
  }
  prompt += `**Workspace Path**: ${context.workspacePath}\n\n`;
  prompt += `**Instructions**:\n`;
  prompt += `1. Change directory to the workspace: \`cd ${context.workspacePath}\`\n`;
  prompt += `2. Read relevant code files before making changes\n`;
  prompt += `3. Follow the design patterns from the spec\n`;
  prompt += `4. Write or update code to complete this task\n`;
  prompt += `5. Ensure all tests pass\n`;
  prompt += `6. Update .current-task with progress\n\n`;

  return prompt;
}

/**
 * Update current task file
 */
export async function updateCurrentTask(
  workspacePath: string,
  taskContent: string
): Promise<void> {
  try {
    const taskPath = path.join(workspacePath, '.current-task');
    await fs.writeFile(taskPath, taskContent);

    loggers.agent.info({ workspacePath }, 'Updated .current-task');
  } catch (error) {
    loggers.agent.error({ error, workspacePath }, 'Failed to update .current-task');
    throw new Error(`Failed to update current task: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update Claude context file
 */
export async function updateClaudeContext(
  workspacePath: string,
  contextContent: string
): Promise<void> {
  try {
    const contextPath = path.join(workspacePath, '.claude', 'context.md');
    await fs.writeFile(contextPath, contextContent);

    loggers.agent.info({ workspacePath }, 'Updated .claude/context.md');
  } catch (error) {
    loggers.agent.error({ error, workspacePath }, 'Failed to update Claude context');
    throw new Error(`Failed to update Claude context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function readFileIfExists(filePath: string, defaultContent?: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (defaultContent !== undefined) {
      return defaultContent;
    }
    return null;
  }
}
