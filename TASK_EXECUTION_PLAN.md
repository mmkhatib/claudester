# Task Execution & Context Preservation Plan

## Overview

This plan implements a system where users can click on tasks to start AI-powered code generation, with full context from the project architecture down to specific task details.

## Context Flow Architecture

```
Project (architecture, conventions)
  ↓
Spec (requirements, design)
  ↓
Task (acceptance criteria, dependencies, files)
  ↓
Agent (executes with full context)
  ↓
Generated Code
```

## Context Preservation Strategy

### 1. Task Execution Context

When starting a task, we build a comprehensive context object:

```typescript
interface TaskExecutionContext {
  // Project Level
  project: {
    name: string;
    description: string;
    architecture?: ProjectArchitecture; // Tech stack, patterns, conventions
  };

  // Spec Level
  spec: {
    name: string;
    description: string;
    requirements: GeneratedRequirements;
    design: GeneratedDesign;
    priority: string;
  };

  // Task Level
  task: {
    title: string;
    description: string;
    type: TaskType;
    acceptanceCriteria: string[];
    dependencies: Task[]; // Populated with full task details
    files: string[];
    estimatedHours?: number;
  };

  // Related Context
  relatedSpecs?: Array<{
    name: string;
    description: string;
    status: string;
  }>;

  // Codebase Context
  existingFiles?: string[]; // Files in the project
  workspacePath: string;
}
```

### 2. AI Prompt Construction

When executing a task, the prompt should include:

```
PROJECT CONTEXT:
- Project: {project.name}
- Description: {project.description}
- Tech Stack: {architecture.techStack}
- Patterns: {architecture.patterns}
- Conventions: {architecture.conventions}

FEATURE SPEC:
- Feature: {spec.name}
- Description: {spec.description}
- Requirements: {spec.requirements}
- Design: {spec.design}

TASK TO IMPLEMENT:
- Task: {task.title}
- Description: {task.description}
- Type: {task.type}
- Files to modify/create: {task.files}

ACCEPTANCE CRITERIA:
{task.acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}

DEPENDENCIES:
{task.dependencies.map(dep => `- ${dep.title} (Status: ${dep.status})`).join('\n')}

Please implement this task following the project conventions and ensuring it integrates properly with the existing codebase.
```

## Implementation Components

### 1. API Endpoints

#### POST `/api/tasks/:taskId/start`
```typescript
// Builds full context and starts agent execution
{
  workspacePath?: string;
  autoApprove?: boolean; // Auto-approve code changes
}

Response:
{
  agentId: string;
  status: 'RUNNING';
  taskId: string;
}
```

#### POST `/api/tasks/bulk-start`
```typescript
// Start multiple tasks
{
  taskIds: string[];
  workspacePath?: string;
}

Response:
{
  agents: Array<{ agentId: string; taskId: string }>;
  queued: number;
}
```

#### GET `/api/tasks/:taskId/agent`
```typescript
// Get agent status and output for a task
Response:
{
  agent: {
    agentId: string;
    status: AgentStatus;
    output?: string;
    result?: any;
    error?: string;
  }
}
```

### 2. UI Components

#### Task List with Selection (Spec Detail Page)
- Checkbox for each task
- "Select All" checkbox
- Bulk action buttons:
  - "Start Selected" (starts checked tasks)
  - "Start All" (starts all PENDING tasks)

#### Task Card (Clickable)
- Shows task number, title, description, status
- Click → Opens task detail modal/drawer
- Status badge shows execution state

#### Task Detail Modal
- Full task details
- Acceptance criteria checklist
- Dependencies list
- **"Start Task" button**
  - Disabled if dependencies not met
  - Shows spinner when starting
  - Updates to show agent status

#### Agent Output Viewer
- Real-time streaming of agent output
- Shows file changes
- Approve/Reject buttons for code changes
- Re-run button if failed

### 3. Backend Services

#### TaskExecutionService
```typescript
class TaskExecutionService {
  async startTask(taskId: string, options?: StartTaskOptions) {
    // 1. Fetch task with all relations
    const task = await Task.findById(taskId)
      .populate('specId')
      .populate('projectId')
      .populate('dependencies');

    // 2. Fetch project architecture
    const project = await Project.findById(task.projectId);

    // 3. Build full context
    const context = this.buildTaskContext(task, project);

    // 4. Create and start agent
    const agent = await this.createAgent(task, context);

    // 5. Execute task with Claude Code CLI
    await this.executeTask(agent, context);

    return agent;
  }

  private buildTaskContext(task, project) {
    return {
      project: {
        name: project.name,
        description: project.description,
        architecture: project.architecture,
      },
      spec: {
        name: task.specId.name,
        description: task.specId.description,
        requirements: task.specId.requirements,
        design: task.specId.design,
      },
      task: {
        title: task.title,
        description: task.description,
        type: task.type,
        acceptanceCriteria: task.acceptanceCriteria,
        dependencies: task.dependencies,
        files: task.files,
      },
    };
  }

  private async executeTask(agent, context) {
    // Use Claude Code CLI to execute the task
    const prompt = this.buildExecutionPrompt(context);

    // Execute using claude client
    const result = await claudeClient.generateCode(
      context.task.description,
      this.contextToString(context)
    );

    // Save result to agent
    agent.output = result;
    agent.status = AgentStatus.COMPLETED;
    await agent.save();

    // Update task status
    await Task.findByIdAndUpdate(task._id, {
      status: TaskStatus.COMPLETED,
      output: result,
      completedAt: new Date(),
    });
  }
}
```

## User Workflow

### Starting a Single Task

1. User navigates to spec detail page
2. Sees list of 17 tasks
3. Clicks on "Task 1: Create TimerManager Core Class"
4. Modal opens showing:
   - Full task description
   - Acceptance criteria
   - Dependencies (none for first task)
   - "Start Task" button
5. User clicks "Start Task"
6. System:
   - Creates Agent record
   - Builds full context (project → spec → task)
   - Calls Claude Code CLI with context-rich prompt
   - Starts streaming output to modal
7. User sees:
   - Real-time output from Claude
   - File changes being made
   - Approval requests (if needed)
8. Task completes:
   - Status → COMPLETED
   - Code files generated
   - Next dependent tasks become available

### Starting Multiple Tasks

1. User checks boxes for tasks 1, 2, 3
2. Clicks "Start Selected"
3. System:
   - Creates queue of selected tasks
   - Starts tasks in order based on dependencies
   - Shows progress indicator for each
4. Tasks execute sequentially with full context for each

### Starting All Tasks

1. User clicks "Start All"
2. System:
   - Topologically sorts tasks by dependencies
   - Starts execution queue
   - Tasks run in dependency order
3. User can monitor all tasks in real-time

## Context Preservation Examples

### Example 1: Game Timer Feature

```
Context Flow:
Project: Tic Tac Toe
├─ Architecture:
│  ├─ Tech: Vanilla JS, HTML, CSS
│  ├─ Pattern: Event-driven, Component-based
│  ├─ Convention: camelCase, modular files
│
├─ Spec: Game Timer
│  ├─ Requirements: "Timer must count up from start..."
│  ├─ Design: "TimerManager class with start/stop/reset..."
│
└─ Task: Create TimerManager Core Class
   ├─ Description: "Implement TimerManager class..."
   ├─ Acceptance Criteria:
   │  • Class has start(), stop(), reset() methods
   │  • Emits 'tick' event every second
   │  • Stores elapsed time
   ├─ Files: ['js/timer-manager.js']

When Agent executes:
- Knows to use Vanilla JS (not React/Vue)
- Follows event-driven pattern (emits events)
- Uses camelCase for methods
- Creates file at correct path
- Implements all acceptance criteria
```

## Next Steps to Implement

1. ✅ Create TASK_EXECUTION_PLAN.md
2. Create `/api/tasks/:taskId/start` endpoint
3. Create TaskExecutionService
4. Update spec detail page UI with:
   - Checkboxes for each task
   - Clickable task cards
   - Bulk action buttons
5. Create task detail modal
6. Add agent status polling
7. Test full context flow

## Questions to Consider

1. **Workspace Path**: Where should generated code be saved?
   - Option 1: User provides path when starting tasks
   - Option 2: Project has default workspace path
   - Option 3: Temp directory with download option

2. **Approval Workflow**: Should code changes require approval?
   - Option 1: Auto-approve all changes
   - Option 2: Show diff and require approval
   - Option 3: Configurable per project

3. **Concurrent Execution**: Can multiple tasks run at once?
   - Option 1: Sequential only (safer)
   - Option 2: Parallel for independent tasks
   - Option 3: User chooses

4. **Error Handling**: What if a task fails?
   - Option 1: Stop all dependent tasks
   - Option 2: Allow retry
   - Option 3: Continue with others

Would you like me to start implementing this? I can begin with the task execution API and UI components.
