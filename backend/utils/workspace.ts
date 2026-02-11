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
 * Initialize project workspace directory structure
 */
export async function initializeProjectWorkspace(
  workspacePath: string,
  project: IProject
): Promise<void> {
  try {
    loggers.server.info({ workspacePath, projectName: project.name }, 'Initializing project workspace');

    // Create directory structure
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'spec'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, '.claude'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'tests'), { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });

    // Create spec repository README
    await fs.writeFile(
      path.join(workspacePath, 'spec', 'README.md'),
      generateSpecRepositoryReadme(project)
    );

    // Create workflow guide
    await fs.writeFile(
      path.join(workspacePath, 'spec', 'WORKFLOW.md'),
      generateWorkflowDoc()
    );

    // Create .claude context
    await fs.writeFile(
      path.join(workspacePath, '.claude', 'context.md'),
      generateClaudeContext(project)
    );

    await fs.writeFile(
      path.join(workspacePath, '.claude', 'instructions.md'),
      generateClaudeInstructions(project)
    );

    // Create .current-task
    await fs.writeFile(
      path.join(workspacePath, '.current-task'),
      generateInitialTask(project)
    );

    // Create project README
    await fs.writeFile(
      path.join(workspacePath, 'README.md'),
      generateProjectReadme(project)
    );

    // Create .gitignore
    await fs.writeFile(
      path.join(workspacePath, '.gitignore'),
      generateGitignore()
    );

    loggers.server.info({ workspacePath }, 'Project workspace initialized successfully');
  } catch (error) {
    loggers.server.error({ error, workspacePath }, 'Failed to initialize project workspace');
    throw new Error(`Failed to initialize workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create spec directory structure
 */
export async function createSpecDirectory(
  workspacePath: string,
  specId: string,
  spec: ISpec
): Promise<void> {
  try {
    const specPath = path.join(workspacePath, 'spec', specId);

    loggers.server.info({ specPath, specTitle: spec.title }, 'Creating spec directory');

    // Create spec directory
    await fs.mkdir(specPath, { recursive: true });

    // Create README.md (spec status dashboard)
    await fs.writeFile(
      path.join(specPath, 'README.md'),
      generateSpecReadme(spec, specId)
    );

    // Create requirements.md (initially empty or with template)
    await fs.writeFile(
      path.join(specPath, 'requirements.md'),
      generateRequirementsTemplate(spec)
    );

    // Create design.md (placeholder)
    await fs.writeFile(
      path.join(specPath, 'design.md'),
      generateDesignTemplate(spec)
    );

    // Create tasks.md (placeholder)
    await fs.writeFile(
      path.join(specPath, 'tasks.md'),
      generateTasksTemplate(spec)
    );

    // Update .current-spec
    await fs.writeFile(
      path.join(workspacePath, 'spec', '.current-spec'),
      specId
    );

    loggers.server.info({ specPath }, 'Spec directory created successfully');
  } catch (error) {
    loggers.server.error({ error, specId }, 'Failed to create spec directory');
    throw new Error(`Failed to create spec directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write requirements to file
 */
export async function writeRequirements(
  workspacePath: string,
  specId: string,
  requirements: any
): Promise<void> {
  try {
    const specPath = path.join(workspacePath, 'spec', specId);
    const requirementsPath = path.join(specPath, 'requirements.md');

    const content = formatRequirements(requirements);

    await fs.writeFile(requirementsPath, content);

    loggers.server.info({ specId, requirementsPath }, 'Requirements written to file');
  } catch (error) {
    loggers.server.error({ error, specId }, 'Failed to write requirements');
    throw new Error(`Failed to write requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write design to file
 */
export async function writeDesign(
  workspacePath: string,
  specId: string,
  design: any
): Promise<void> {
  try {
    const specPath = path.join(workspacePath, 'spec', specId);
    const designPath = path.join(specPath, 'design.md');

    const content = formatDesign(design);

    await fs.writeFile(designPath, content);

    loggers.server.info({ specId, designPath }, 'Design written to file');
  } catch (error) {
    loggers.server.error({ error, specId }, 'Failed to write design');
    throw new Error(`Failed to write design: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write tasks to file
 */
export async function writeTasks(
  workspacePath: string,
  specId: string,
  tasks: any[]
): Promise<void> {
  try {
    const specPath = path.join(workspacePath, 'spec', specId);
    const tasksPath = path.join(specPath, 'tasks.md');

    const content = formatTasks(tasks);

    await fs.writeFile(tasksPath, content);

    loggers.server.info({ specId, tasksPath, taskCount: tasks.length }, 'Tasks written to file');
  } catch (error) {
    loggers.server.error({ error, specId }, 'Failed to write tasks');
    throw new Error(`Failed to write tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read requirements from file
 */
export async function readRequirements(workspacePath: string, specId: string): Promise<any | null> {
  try {
    const requirementsPath = path.join(workspacePath, 'spec', specId, 'requirements.md');
    const content = await fs.readFile(requirementsPath, 'utf-8');

    // Parse markdown back to structured format
    return parseRequirementsMarkdown(content);
  } catch (error) {
    // File doesn't exist or can't be read
    loggers.server.debug({ specId, error }, 'Requirements file not found');
    return null;
  }
}

/**
 * Read design from file
 */
export async function readDesign(workspacePath: string, specId: string): Promise<any | null> {
  try {
    const designPath = path.join(workspacePath, 'spec', specId, 'design.md');
    const content = await fs.readFile(designPath, 'utf-8');

    // Parse markdown back to structured format
    return parseDesignMarkdown(content);
  } catch (error) {
    loggers.server.debug({ specId, error }, 'Design file not found');
    return null;
  }
}

/**
 * Read tasks from file
 */
export async function readTasks(workspacePath: string, specId: string): Promise<any[] | null> {
  try {
    const tasksPath = path.join(workspacePath, 'spec', specId, 'tasks.md');
    const content = await fs.readFile(tasksPath, 'utf-8');

    // Parse markdown back to structured format
    return parseTasksMarkdown(content);
  } catch (error) {
    loggers.server.debug({ specId, error }, 'Tasks file not found');
    return null;
  }
}

/**
 * Check if approval marker exists
 */
export async function checkApproval(
  workspacePath: string,
  specId: string,
  phase: 'requirements' | 'design' | 'tasks'
): Promise<boolean> {
  try {
    const markerPath = path.join(workspacePath, 'spec', specId, `.${phase}-approved`);
    await fs.access(markerPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create approval marker file
 */
export async function createApprovalMarker(
  workspacePath: string,
  specId: string,
  phase: 'requirements' | 'design' | 'tasks'
): Promise<void> {
  try {
    const markerPath = path.join(workspacePath, 'spec', specId, `.${phase}-approved`);
    await fs.writeFile(markerPath, new Date().toISOString());

    loggers.server.info({ specId, phase }, 'Approval marker created');
  } catch (error) {
    loggers.server.error({ error, specId, phase }, 'Failed to create approval marker');
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
