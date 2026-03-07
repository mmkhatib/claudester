import fs from 'fs/promises';
import path from 'path';

/**
 * Claudester Workspace Manager
 * Manages .claudester/ folder structure in project workspaces
 */

export interface WorkspaceConfig {
  version: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  aiProvider: string;
}

export interface SpecMetadata {
  specName: string;
  currentPhase: 'requirements' | 'design' | 'tasks' | 'implementation';
  requirementsApproved: boolean;
  designApproved: boolean;
  tasksApproved: boolean;
  priority: 'P0' | 'P1' | 'P2';
  progress: number;
}

export class WorkspaceManager {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');
  }

  /**
   * Initialize a new Claudester workspace for a project
   */
  async initializeWorkspace(projectName: string, projectId: string): Promise<string> {
    const workspacePath = path.join(this.workspaceRoot, this.sanitizeProjectName(projectName));

    // Create workspace directory structure
    await fs.mkdir(workspacePath, { recursive: true });
    await this.createClaudesterStructure(workspacePath);

    // Create workspace config
    const config: WorkspaceConfig = {
      version: '1.0.0',
      projectId,
      projectName,
      createdAt: new Date().toISOString(),
      aiProvider: process.env.AI_PROVIDER || 'claude-code-cli',
    };

    await fs.writeFile(
      path.join(workspacePath, '.claudester', 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create initial project context
    await this.createProjectContext(workspacePath, projectName);

    return workspacePath;
  }

  /**
   * Create .claudester/ folder structure
   */
  private async createClaudesterStructure(workspacePath: string): Promise<void> {
    const claudesterPath = path.join(workspacePath, '.claudester');

    // Create directories
    await fs.mkdir(path.join(claudesterPath, 'specs'), { recursive: true });
    await fs.mkdir(path.join(claudesterPath, 'context'), { recursive: true });
    await fs.mkdir(path.join(claudesterPath, 'planning'), { recursive: true });

    // Create README
    await fs.writeFile(
      path.join(claudesterPath, 'README.md'),
      this.getClaudesterReadme()
    );
  }

  /**
   * Create initial project context file
   */
  private async createProjectContext(workspacePath: string, projectName: string): Promise<void> {
    const contextPath = path.join(workspacePath, '.claudester', 'context', 'project-context.md');

    const context = `# ${projectName} - Project Context

## Overview
This file contains high-level context about the project that AI agents should know.

## Technology Stack
- **Frontend**: (To be determined)
- **Backend**: (To be determined)
- **Database**: (To be determined)

## Architecture Decisions
(Document key architectural decisions here)

## Conventions & Standards
(Document coding conventions, naming patterns, etc.)

## Current Status
**Created**: ${new Date().toISOString()}
**Status**: Initialization

---
*This file is automatically loaded as context for all AI operations in this workspace.*
`;

    await fs.writeFile(contextPath, context);
  }

  /**
   * Create a new spec in the workspace
   */
  async createSpec(
    workspacePath: string,
    specName: string,
    metadata: Partial<SpecMetadata>
  ): Promise<string> {
    const specPath = path.join(workspacePath, '.claudester', 'specs', specName);

    // Create spec directory
    await fs.mkdir(specPath, { recursive: true });

    // Create phase files with templates
    await fs.writeFile(
      path.join(specPath, 'requirements.md'),
      this.getRequirementsTemplate(specName)
    );

    await fs.writeFile(
      path.join(specPath, 'design.md'),
      this.getDesignTemplate(specName)
    );

    await fs.writeFile(
      path.join(specPath, 'tasks.md'),
      this.getTasksTemplate(specName)
    );

    // Create spec metadata file
    const fullMetadata: SpecMetadata = {
      specName,
      currentPhase: 'requirements',
      requirementsApproved: false,
      designApproved: false,
      tasksApproved: false,
      priority: metadata.priority || 'P1',
      progress: 0,
      ...metadata,
    };

    await fs.writeFile(
      path.join(specPath, '.metadata.json'),
      JSON.stringify(fullMetadata, null, 2)
    );

    return specPath;
  }

  /**
   * Read spec files from workspace
   */
  async loadSpecContext(workspacePath: string, specName: string) {
    const specPath = path.join(workspacePath, '.claudester', 'specs', specName);

    try {
      const [requirements, design, tasks, metadata] = await Promise.all([
        fs.readFile(path.join(specPath, 'requirements.md'), 'utf-8'),
        fs.readFile(path.join(specPath, 'design.md'), 'utf-8'),
        fs.readFile(path.join(specPath, 'tasks.md'), 'utf-8'),
        fs.readFile(path.join(specPath, '.metadata.json'), 'utf-8').then(JSON.parse),
      ]);

      // Check for approval markers
      const approvals = {
        requirements: await this.fileExists(path.join(specPath, '.requirements-approved')),
        design: await this.fileExists(path.join(specPath, '.design-approved')),
        tasks: await this.fileExists(path.join(specPath, '.tasks-approved')),
      };

      return {
        specName,
        specPath,
        requirements,
        design,
        tasks,
        metadata,
        approvals,
      };
    } catch (error) {
      throw new Error(`Failed to load spec '${specName}': ${error}`);
    }
  }

  /**
   * Approve a phase
   */
  async approvePhase(
    workspacePath: string,
    specName: string,
    phase: 'requirements' | 'design' | 'tasks'
  ): Promise<void> {
    const specPath = path.join(workspacePath, '.claudester', 'specs', specName);
    const markerFile = path.join(specPath, `.${phase}-approved`);

    await fs.writeFile(markerFile, new Date().toISOString());
  }

  /**
   * List all specs in workspace
   */
  async listSpecs(workspacePath: string): Promise<string[]> {
    const specsPath = path.join(workspacePath, '.claudester', 'specs');

    try {
      const entries = await fs.readdir(specsPath, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Load project context
   */
  async loadProjectContext(workspacePath: string): Promise<string> {
    const contextPath = path.join(workspacePath, '.claudester', 'context', 'project-context.md');

    try {
      return await fs.readFile(contextPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Update spec file content
   */
  async updateSpecFile(
    workspacePath: string,
    specName: string,
    file: 'requirements' | 'design' | 'tasks',
    content: string
  ): Promise<void> {
    const filePath = path.join(
      workspacePath,
      '.claudester',
      'specs',
      specName,
      `${file}.md`
    );

    await fs.writeFile(filePath, content);
  }

  // Utility methods

  private sanitizeProjectName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getClaudesterReadme(): string {
    return `# .claudester/

This directory contains all Claudester workspace files including specifications,
context, and planning documents.

## Structure

- **specs/**: Feature specifications organized by feature name
  - Each spec contains: requirements.md, design.md, tasks.md
  - Approval markers: .requirements-approved, .design-approved, .tasks-approved

- **context/**: Project-wide context files
  - project-context.md: High-level project information loaded for all AI operations
  - agent-memory.md: Persistent learnings and decisions

- **planning/**: Long-term planning documents
  - roadmap.md: Product roadmap and milestones

- **config.json**: Workspace configuration

## How AI Agents Use These Files

All AI operations automatically load:
1. Project context from context/project-context.md
2. Active spec context when using #spec:name syntax
3. Planning docs for strategic decisions

## Phase Gates

Specs progress through phases with approval checkpoints:
1. Requirements → Design (requires .requirements-approved)
2. Design → Tasks (requires .design-approved)
3. Tasks → Implementation (requires .tasks-approved)

---
Generated by Claudester - Spec-Driven Development Platform
`;
  }

  private getRequirementsTemplate(specName: string): string {
    return `# ${specName} - Requirements

## Overview
Brief description of what this feature does and why it's needed.

## User Stories

### Story 1: [Title]
**WHEN** [trigger/condition]
**THE SYSTEM SHALL** [expected behavior]

**Acceptance Criteria**:
- **AC-1.1**: [Testable criterion]
- **AC-1.2**: [Testable criterion]

**Priority**: P0 | P1 | P2
**Estimate**: [hours]

## Functional Requirements

### FR-1: [Requirement Title]
[Detailed requirement description]

## Non-Functional Requirements

### NFR-1: Performance
[Performance requirements]

### NFR-2: Security
[Security requirements]

## Constraints & Dependencies
- [List any constraints]
- [External dependencies]

---
*Phase: Requirements | Next: Design*
`;
  }

  private getDesignTemplate(specName: string): string {
    return `# ${specName} - Technical Design

## Architecture Overview
High-level architecture and component interactions.

## Component Design

### Component 1: [Name]
**Purpose**: What this component does
**Interface**: Public API/methods
**Dependencies**: Other components it relies on

## Data Models

### Model: [Name]
\`\`\`typescript
interface Example {
  id: string;
  // fields...
}
\`\`\`

## API Endpoints

### POST /api/example
**Purpose**: [What it does]
**Request**: [Request format]
**Response**: [Response format]

## Sequence Diagrams

\`\`\`
User -> Frontend -> Backend -> Database
\`\`\`

## Technical Decisions

### TD-1: [Decision]
**Decision**: What was decided
**Rationale**: Why this approach
**Alternatives**: What else was considered

## Error Handling
How errors are handled and propagated.

## Testing Strategy
- Unit tests: [Coverage]
- Integration tests: [Scope]
- E2E tests: [Critical paths]

---
*Phase: Design | Next: Tasks*
`;
  }

  private getTasksTemplate(specName: string): string {
    return `# ${specName} - Implementation Tasks

## Task Breakdown

### Phase 1: Foundation
**Estimated**: [hours]

#### TASK-1.1: [Task Description]
**Description**: What needs to be done
**Expected Outcome**: What success looks like
**Depends On**: None | TASK-X.Y
**Estimate**: [hours]

- [ ] Sub-task 1
- [ ] Sub-task 2

### Phase 2: Core Implementation
**Estimated**: [hours]

#### TASK-2.1: [Task Description]
[Same format as above]

## Dependencies Map
\`\`\`
TASK-1.1 → TASK-2.1 → TASK-3.1
        ↓
      TASK-2.2
\`\`\`

## Total Estimate
**Total Tasks**: X
**Total Hours**: X-Y hours
**Estimated Duration**: X weeks with N developers

---
*Phase: Tasks | Next: Implementation*
`;
  }
}

// Export singleton instance
export const workspaceManager = new WorkspaceManager();
