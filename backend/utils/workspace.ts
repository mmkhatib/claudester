/**
 * Workspace Management Utilities
 *
 * Handles file-based storage for project specs, requirements, design, and tasks.
 * All spec content is stored as markdown files in the project workspace directory.
 */

import fs from 'fs/promises';
import path from 'path';
import { IProject } from '../models/Project';
import { ISpec } from '../models/Spec';
import { loggers } from '@/lib/logger';
import { workspaceManager } from '../services/workspace-manager';

/**
 * Get the workspace root directory from environment or use default
 */
export function getWorkspaceRoot(): string {
  return process.env.WORKSPACE_ROOT || path.join(process.cwd(), '../claudester-workspaces');
}

/**
 * Generate workspace path for a project
 */
export function generateWorkspacePath(projectName: string, projectId: string): string {
  const root = getWorkspaceRoot();
  // Use project ID to ensure uniqueness, but include name for readability
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Format: {workspace-root}/{project-name}-{last-8-chars-of-id}
  const idSuffix = projectId.toString().slice(-8);
  return path.join(root, `${slug}-${idSuffix}`);
}

/**
 * Generate spec ID from spec number and title
 */
export function generateSpecId(specNumber: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${String(specNumber).padStart(3, '0')}-${slug}`;
}

/**
 * Initialize project workspace directory structure using .claudester/ format
 */
export async function initializeProjectWorkspace(
  workspacePath: string,
  project: IProject
): Promise<void> {
  try {
    console.log('Initializing project workspace:', workspacePath, 'for project:', project.name);

    // Create the workspace directory
    await fs.mkdir(workspacePath, { recursive: true });
    
    // Create .claudester structure
    const claudesterPath = path.join(workspacePath, '.claudester');
    await fs.mkdir(path.join(claudesterPath, 'specs'), { recursive: true });
    await fs.mkdir(path.join(claudesterPath, 'context'), { recursive: true });
    
    // Create config file
    const config = {
      version: '1.0.0',
      projectId: project._id.toString(),
      projectName: project.name,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(claudesterPath, 'config.json'),
      JSON.stringify(config, null, 2)
    );
    
    // Create project context
    await fs.writeFile(
      path.join(claudesterPath, 'context', 'project-context.md'),
      generateClaudeContext(project)
    );

    console.log('Project workspace initialized successfully:', workspacePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to initialize project workspace:', errorMessage, 'Path:', workspacePath);
    throw new Error(`Failed to initialize workspace: ${errorMessage}`);
  }
}

/**
 * Create spec directory structure using .claudester/ format
 */
export async function createSpecDirectory(
  workspacePath: string,
  specId: string,
  spec: ISpec
): Promise<void> {
  try {
    loggers.server.info({ workspacePath, specId, specTitle: spec.title }, 'Creating spec directory in .claudester/');

    // Use the WorkspaceManager to create spec in .claudester/specs/
    await workspaceManager.createSpec(workspacePath, specId, {
      specName: spec.title,
      currentPhase: spec.currentPhase || 'requirements',
      requirementsApproved: spec.requirementsApproved || false,
      designApproved: spec.designApproved || false,
      tasksApproved: spec.tasksApproved || false,
      priority: spec.priority || 'P1',
      progress: spec.progress || 0,
    });

    loggers.server.info({ workspacePath, specId }, 'Spec directory created successfully in .claudester/specs/');
  } catch (error) {
    loggers.server.error({ errorMsg: error instanceof Error ? error.message : "Unknown error", specId }, 'Failed to create spec directory');
    throw new Error(`Failed to create spec directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write requirements to file in .claudester/ structure
 */
export async function writeRequirements(
  workspacePath: string,
  specId: string,
  requirements: any
): Promise<void> {
  try {
    const content = formatRequirements(requirements);
    await workspaceManager.updateSpecFile(workspacePath, specId, 'requirements', content);

    loggers.server.info({ specId, workspacePath }, 'Requirements written to .claudester/specs/');
  } catch (error) {
    loggers.server.error({ errorMsg: error instanceof Error ? error.message : "Unknown error", specId }, 'Failed to write requirements');
    throw new Error(`Failed to write requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write design to file in .claudester/ structure
 */
export async function writeDesign(
  workspacePath: string,
  specId: string,
  design: any
): Promise<void> {
  try {
    const content = formatDesign(design);
    await workspaceManager.updateSpecFile(workspacePath, specId, 'design', content);

    loggers.server.info({ specId, workspacePath }, 'Design written to .claudester/specs/');
  } catch (error) {
    loggers.server.error({ errorMsg: error instanceof Error ? error.message : "Unknown error", specId }, 'Failed to write design');
    throw new Error(`Failed to write design: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write tasks to file in .claudester/ structure
 */
export async function writeTasks(
  workspacePath: string,
  specId: string,
  tasks: any[]
): Promise<void> {
  try {
    const content = formatTasks(tasks);
    await workspaceManager.updateSpecFile(workspacePath, specId, 'tasks', content);

    loggers.server.info({ specId, workspacePath, taskCount: tasks.length }, 'Tasks written to .claudester/specs/');
  } catch (error) {
    loggers.server.error({ errorMsg: error instanceof Error ? error.message : "Unknown error", specId }, 'Failed to write tasks');
    throw new Error(`Failed to write tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read requirements from file in .claudester/ structure
 */
export async function readRequirements(workspacePath: string, specId: string): Promise<any | null> {
  try {
    const specContext = await workspaceManager.loadSpecContext(workspacePath, specId);

    // Parse markdown back to structured format
    return parseRequirementsMarkdown(specContext.requirements);
  } catch (error) {
    // File doesn't exist or can't be read
    loggers.server.debug({ specId, error }, 'Requirements file not found in .claudester/specs/');
    return null;
  }
}

/**
 * Read design from file in .claudester/ structure
 */
export async function readDesign(workspacePath: string, specId: string): Promise<any | null> {
  try {
    const specContext = await workspaceManager.loadSpecContext(workspacePath, specId);

    // Parse markdown back to structured format
    return parseDesignMarkdown(specContext.design);
  } catch (error) {
    loggers.server.debug({ specId, error }, 'Design file not found in .claudester/specs/');
    return null;
  }
}

/**
 * Read tasks from file in .claudester/ structure
 */
export async function readTasks(workspacePath: string, specId: string): Promise<any[] | null> {
  try {
    const specContext = await workspaceManager.loadSpecContext(workspacePath, specId);

    // Parse markdown back to structured format
    return parseTasksMarkdown(specContext.tasks);
  } catch (error) {
    loggers.server.debug({ specId, error }, 'Tasks file not found in .claudester/specs/');
    return null;
  }
}

/**
 * Check if approval marker exists in .claudester/ structure
 */
export async function checkApproval(
  workspacePath: string,
  specId: string,
  phase: 'requirements' | 'design' | 'tasks'
): Promise<boolean> {
  try {
    const specContext = await workspaceManager.loadSpecContext(workspacePath, specId);
    return specContext.approvals[phase] || false;
  } catch {
    return false;
  }
}

/**
 * Create approval marker file in .claudester/ structure
 */
export async function createApprovalMarker(
  workspacePath: string,
  specId: string,
  phase: 'requirements' | 'design' | 'tasks'
): Promise<void> {
  try {
    await workspaceManager.approvePhase(workspacePath, specId, phase);

    loggers.server.info({ specId, phase }, 'Approval marker created in .claudester/specs/');
  } catch (error) {
    loggers.server.error({ errorMsg: error instanceof Error ? error.message : "Unknown error", specId, phase }, 'Failed to create approval marker');
    throw new Error(`Failed to create approval marker: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Template Generation Functions
// ============================================================================

function generateSpecRepositoryReadme(project: IProject): string {
  return `# ${project.name} - Specifications

This directory contains all feature specifications for the project, following a spec-driven development (SDD) methodology.

## Active Specifications

| ID | Name | Status | Current Phase | Progress |
|----|------|--------|---------------|----------|
| (No specs yet) | - | - | - | 0% |

## Structure

Each specification follows this structure:
\`\`\`
spec/
  00X-feature-name/
    README.md           # Overview and status dashboard
    requirements.md     # What needs to be built (Phase 1)
    design.md          # How it will be built (Phase 2)
    tasks.md           # Implementation breakdown (Phase 3)
    .requirements-approved  # Phase gate marker
    .design-approved       # Phase gate marker
    .tasks-approved        # Phase gate marker
\`\`\`

## Workflow

See [WORKFLOW.md](./WORKFLOW.md) for the complete spec-driven development process.
`;
}

function generateWorkflowDoc(): string {
  return `# Spec-Driven Development Workflow

## Phase Gate System

### Requirements → Design → Tasks → Implementation

1. **Requirements Phase**: Define what needs to be built
2. **Design Phase**: Determine technical approach
3. **Tasks Phase**: Break down into actionable items
4. **Implementation Phase**: Build and test

### Approval Process

- Each phase requires explicit approval before proceeding
- Create \`.{phase}-approved\` marker file to approve
- Cannot skip phases or work out of order

## Phase Gate Rules

- ❌ Cannot start Design without \`.requirements-approved\`
- ❌ Cannot start Tasks without \`.design-approved\`
- ❌ Cannot start Implementation without \`.tasks-approved\`
- ✅ Can iterate within a phase without re-approval
- ⚠️ Major changes require phase re-approval
`;
}

function generateClaudeContext(project: IProject): string {
  return `# ${project.name} - Claude Agent Context

## Project Overview
${project.description}

## Architecture
${project.architecture ? JSON.stringify(project.architecture, null, 2) : 'To be defined'}

## Development Guidelines
- Follow spec-driven development (see \`spec/WORKFLOW.md\`)
- Read \`spec/.current-spec\` to see active spec
- Read \`.current-task\` for current work
- All code must match patterns in existing codebase

## Current Status
- Active Spec: (check \`spec/.current-spec\`)
- Current Phase: (check spec README)
- Tasks Complete: (check spec tasks.md)

## Important Context
- This is a Claudester-managed project
- Follow development standards in \`docs/standards/\`
- All code changes should be driven by approved specs
`;
}

function generateClaudeInstructions(project: IProject): string {
  return `# Development Instructions for ${project.name}

## Before Starting Any Work
1. Read \`spec/.current-spec\`
2. Read \`.current-task\`
3. Review active spec in \`spec/{spec-id}/\`
4. Check approval markers

## Code Style
- Follow TypeScript best practices
- Use consistent naming conventions
- Proper error handling required
- Write tests for all new code

## Testing Requirements
- Unit tests for business logic
- Integration tests for APIs
- Minimum 80% code coverage

## Quality Standards
- No \`any\` types in TypeScript
- All functions must have proper error handling
- Follow existing code patterns
- Document complex logic
`;
}

function generateInitialTask(project: IProject): string {
  return `# Current Task Tracking

## Active Task
**Project**: ${project.name}
**Status**: Initialized
**Phase**: Setup

## Next Steps
1. Create first specification for a feature
2. Generate requirements phase
3. Review and approve requirements
4. Proceed to design phase

## Notes
- Project workspace initialized
- Ready for spec-driven development
`;
}

function generateProjectReadme(project: IProject): string {
  return `# ${project.name}

${project.description}

## Getting Started

This project follows spec-driven development (SDD). All features are specified in the \`spec/\` directory before implementation.

### Workflow
1. Review specifications in \`spec/\`
2. Check current spec: \`cat spec/.current-spec\`
3. Follow phase gates: Requirements → Design → Tasks → Implementation

## Project Structure
- \`spec/\` - Feature specifications
- \`src/\` - Source code
- \`tests/\` - Test files
- \`docs/\` - Documentation
- \`.claude/\` - AI agent context

## Architecture
${project.architecture ? JSON.stringify(project.architecture, null, 2) : 'To be defined'}
`;
}

function generateGitignore(): string {
  return `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
`;
}

function generateSpecReadme(spec: ISpec, specId: string): string {
  return `# ${spec.title}

**Spec ID**: ${specId}
**Description**: ${spec.description}
**Priority**: ${spec.priority}
**Status**: ${spec.status}

## Phase Status

| Phase | Status | Approved | Date |
|-------|--------|----------|------|
| Requirements | 🟡 Pending | ❌ | - |
| Design | ⏸️ Blocked | ❌ | - |
| Tasks | ⏸️ Blocked | ❌ | - |
| Implementation | ⏸️ Blocked | ❌ | - |

## Progress
0% complete

## Files
- [requirements.md](./requirements.md) - Requirements specification
- [design.md](./design.md) - Technical design
- [tasks.md](./tasks.md) - Implementation tasks
`;
}

function generateRequirementsTemplate(spec: ISpec): string {
  return `# Requirements: ${spec.title}

${spec.description}

## Functional Requirements
- [ ] FR-1: (To be defined)

## Technical Requirements
- [ ] TR-1: (To be defined)

## Constraints
- C-1: (To be defined)

## Acceptance Criteria
- [ ] AC-1: (To be defined)
`;
}

function generateDesignTemplate(spec: ISpec): string {
  return `# Design: ${spec.title}

## Architecture
(To be defined)

## Data Model
(To be defined)

## API Endpoints
(To be defined)

## UI Components
(To be defined)
`;
}

function generateTasksTemplate(spec: ISpec): string {
  return `# Tasks: ${spec.title}

## Implementation Tasks

### Phase 1: Foundation
- [ ] TASK-001: (To be defined)

### Phase 2: Core Features
- [ ] TASK-002: (To be defined)

### Phase 3: Testing
- [ ] TASK-003: (To be defined)
`;
}

// ============================================================================
// Format/Parse Functions
// ============================================================================

function formatRequirements(requirements: any): string {
  let markdown = '# Requirements\n\n';

  if (requirements.functional && requirements.functional.length > 0) {
    markdown += '## Functional Requirements\n\n';
    requirements.functional.forEach((req: string) => {
      markdown += `- ${req}\n`;
    });
    markdown += '\n';
  }

  if (requirements.technical && requirements.technical.length > 0) {
    markdown += '## Technical Requirements\n\n';
    requirements.technical.forEach((req: string) => {
      markdown += `- ${req}\n`;
    });
    markdown += '\n';
  }

  if (requirements.constraints && requirements.constraints.length > 0) {
    markdown += '## Constraints\n\n';
    requirements.constraints.forEach((req: string) => {
      markdown += `- ${req}\n`;
    });
    markdown += '\n';
  }

  if (requirements.acceptanceCriteria && requirements.acceptanceCriteria.length > 0) {
    markdown += '## Acceptance Criteria\n\n';
    requirements.acceptanceCriteria.forEach((req: string) => {
      markdown += `- ${req}\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

function formatDesign(design: any): string {
  let markdown = '# Design\n\n';

  if (design.architecture) {
    markdown += '## Architecture\n\n';
    markdown += `${design.architecture}\n\n`;
  }

  if (design.dataModel) {
    markdown += '## Data Model\n\n';
    markdown += `${design.dataModel}\n\n`;
  }

  if (design.apiEndpoints && design.apiEndpoints.length > 0) {
    markdown += '## API Endpoints\n\n';
    design.apiEndpoints.forEach((endpoint: string) => {
      markdown += `- ${endpoint}\n`;
    });
    markdown += '\n';
  }

  if (design.uiComponents && design.uiComponents.length > 0) {
    markdown += '## UI Components\n\n';
    design.uiComponents.forEach((component: string) => {
      markdown += `- ${component}\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

function formatTasks(tasks: any[]): string {
  let markdown = '# Tasks\n\n';

  tasks.forEach((task, index) => {
    markdown += `## ${index + 1}. ${task.title}\n\n`;
    if (task.description) {
      markdown += `${task.description}\n\n`;
    }
    markdown += `**Status**: ${task.status}\n`;
    markdown += `**Priority**: ${task.priority}\n`;
    if (task.estimatedHours) {
      markdown += `**Estimated**: ${task.estimatedHours}h\n`;
    }
    markdown += '\n';
  });

  return markdown;
}

function parseRequirementsMarkdown(content: string): any {
  // Simple parser - could be enhanced
  const requirements: any = {
    functional: [],
    technical: [],
    constraints: [],
    acceptanceCriteria: []
  };

  const lines = content.split('\n');
  let currentSection: string | null = null;

  for (const line of lines) {
    if (line.startsWith('## Functional Requirements')) {
      currentSection = 'functional';
    } else if (line.startsWith('## Technical Requirements')) {
      currentSection = 'technical';
    } else if (line.startsWith('## Constraints')) {
      currentSection = 'constraints';
    } else if (line.startsWith('## Acceptance Criteria')) {
      currentSection = 'acceptanceCriteria';
    } else if (line.startsWith('- ') && currentSection) {
      requirements[currentSection].push(line.substring(2));
    }
  }

  return requirements;
}

function parseDesignMarkdown(content: string): any {
  const design: any = {
    architecture: '',
    dataModel: '',
    apiEndpoints: [],
    uiComponents: []
  };

  const lines = content.split('\n');
  let currentSection: string | null = null;
  let buffer = '';

  for (const line of lines) {
    if (line.startsWith('## Architecture')) {
      if (currentSection && buffer) {
        if (currentSection === 'architecture' || currentSection === 'dataModel') {
          design[currentSection] = buffer.trim();
        }
      }
      currentSection = 'architecture';
      buffer = '';
    } else if (line.startsWith('## Data Model')) {
      if (currentSection && buffer) {
        if (currentSection === 'architecture' || currentSection === 'dataModel') {
          design[currentSection] = buffer.trim();
        }
      }
      currentSection = 'dataModel';
      buffer = '';
    } else if (line.startsWith('## API Endpoints')) {
      if (currentSection && buffer) {
        if (currentSection === 'architecture' || currentSection === 'dataModel') {
          design[currentSection] = buffer.trim();
        }
      }
      currentSection = 'apiEndpoints';
      buffer = '';
    } else if (line.startsWith('## UI Components')) {
      if (currentSection && buffer) {
        if (currentSection === 'architecture' || currentSection === 'dataModel') {
          design[currentSection] = buffer.trim();
        }
      }
      currentSection = 'uiComponents';
      buffer = '';
    } else if (line.startsWith('- ') && (currentSection === 'apiEndpoints' || currentSection === 'uiComponents')) {
      design[currentSection].push(line.substring(2));
    } else if (currentSection === 'architecture' || currentSection === 'dataModel') {
      buffer += line + '\n';
    }
  }

  // Handle last section
  if (currentSection && buffer && (currentSection === 'architecture' || currentSection === 'dataModel')) {
    design[currentSection] = buffer.trim();
  }

  return design;
}

function parseTasksMarkdown(content: string): any[] {
  // Simplified parser - returns empty array for now
  // In a full implementation, this would parse the markdown and return task objects
  return [];
}
