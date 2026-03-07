/**
 * Spec Context Loader
 *
 * Loads specification files from .claudester/ workspace and formats them
 * for AI agent consumption as steering documents.
 *
 * This is the critical missing piece identified in SPEC_SYSTEM_ANALYSIS.md:
 * AI agents must read spec files to generate code that aligns with specifications.
 */

import { workspaceManager } from './workspace-manager';
import { loggers } from '@/lib/logger';

export interface SpecContext {
  specName: string;
  currentPhase: string;
  requirements: string;
  design: string;
  tasks: string;
  approvals: {
    requirements: boolean;
    design: boolean;
    tasks: boolean;
  };
  projectContext?: string;
}

/**
 * Load spec context from .claudester/ workspace
 * This is what AI agents will use as steering documents
 */
export async function loadSpecContext(
  workspacePath: string,
  specName: string
): Promise<SpecContext> {
  try {
    loggers.server.info({ workspacePath, specName }, 'Loading spec context for AI consumption');

    // Load spec files from .claudester/specs/
    const specData = await workspaceManager.loadSpecContext(workspacePath, specName);

    // Load project-wide context
    const projectContext = await workspaceManager.loadProjectContext(workspacePath);

    const context: SpecContext = {
      specName: specData.specName,
      currentPhase: specData.metadata.currentPhase,
      requirements: specData.requirements,
      design: specData.design,
      tasks: specData.tasks,
      approvals: specData.approvals,
      projectContext,
    };

    loggers.server.info({
      specName,
      currentPhase: context.currentPhase,
      hasRequirements: !!context.requirements,
      hasDesign: !!context.design,
      hasTasks: !!context.tasks,
    }, 'Spec context loaded successfully');

    return context;
  } catch (error) {
    loggers.server.error({ error, workspacePath, specName }, 'Failed to load spec context');
    throw new Error(`Failed to load spec context for '${specName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format spec context as AI system prompt
 * This creates the "steering document" that guides AI code generation
 */
export function formatSpecContextForAI(context: SpecContext): string {
  const { specName, currentPhase, requirements, design, tasks, approvals, projectContext } = context;

  let prompt = `# ACTIVE SPECIFICATION: ${specName}

You are working on this specification. All code you generate MUST align with these requirements and design.

**Current Phase**: ${currentPhase.toUpperCase()}
**Approvals**:
- Requirements: ${approvals.requirements ? '✅ APPROVED' : '❌ NOT APPROVED'}
- Design: ${approvals.design ? '✅ APPROVED' : '❌ NOT APPROVED'}
- Tasks: ${approvals.tasks ? '✅ APPROVED' : '❌ NOT APPROVED'}

`;

  // Add project context if available
  if (projectContext) {
    prompt += `\n---\n# PROJECT CONTEXT\n\n${projectContext}\n`;
  }

  // Add requirements (always include, this is the "what")
  if (requirements) {
    prompt += `\n---\n# REQUIREMENTS\n\n${requirements}\n`;
  }

  // Add design if in design/tasks/implementation phase
  if (design && ['design', 'tasks', 'implementation'].includes(currentPhase)) {
    prompt += `\n---\n# TECHNICAL DESIGN\n\n${design}\n`;
  }

  // Add tasks if in tasks/implementation phase
  if (tasks && ['tasks', 'implementation'].includes(currentPhase)) {
    prompt += `\n---\n# IMPLEMENTATION TASKS\n\n${tasks}\n`;
  }

  prompt += `\n---\n
IMPORTANT RULES:
1. All code MUST match the requirements and design above
2. Follow the architectural patterns specified in the design
3. Use the exact data models and API contracts defined
4. Implement the specific tasks as outlined
5. Do NOT deviate from approved specifications
6. If requirements are unclear, ASK before implementing

Your code will be validated against these specifications.
`;

  return prompt;
}

/**
 * Parse #spec: syntax from user messages
 * Example: "#spec:user-auth implement task 2.3" -> "user-auth"
 */
export function parseSpecReference(message: string): string | null {
  const match = message.match(/#spec:([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Check if spec context should be loaded based on message
 */
export function shouldLoadSpecContext(message: string): boolean {
  return parseSpecReference(message) !== null;
}

/**
 * List all specs in a workspace
 */
export async function listWorkspaceSpecs(workspacePath: string): Promise<string[]> {
  try {
    return await workspaceManager.listSpecs(workspacePath);
  } catch (error) {
    loggers.server.error({ error, workspacePath }, 'Failed to list workspace specs');
    return [];
  }
}
