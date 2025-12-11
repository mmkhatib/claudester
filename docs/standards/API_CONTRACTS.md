# API Contracts & Integration Specifications

> **CRITICAL**: All agents must adhere to these API contracts and interface definitions when building or modifying backend services.

Last Updated: 2025-12-07

---

## Table of Contents
1. [Standard API Response Format](#standard-api-response-format)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Service Interfaces](#service-interfaces)
5. [WebSocket Events](#websocket-events)
6. [Error Codes](#error-codes)

---

## Standard API Response Format

### Success Response
```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

### Error Response
```typescript
interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
}
```

### Pagination Response
```typescript
interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

### Examples
```typescript
// Success with data
{
  "success": true,
  "data": {
    "_id": "123",
    "title": "My Spec",
    ...
  }
}

// Success with array
{
  "success": true,
  "data": {
    "specs": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

// Error
{
  "success": false,
  "error": "Spec not found",
  "code": "SPEC_NOT_FOUND"
}
```

---

## API Endpoints

### Projects API

#### GET /api/projects
**Description**: List all projects for the current user

**Query Parameters**:
```typescript
interface ProjectsQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  status?: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
  search?: string;      // Search in name and description
}
```

**Response**:
```typescript
{
  success: true,
  data: IProject[]
}
```

#### GET /api/projects/[id]
**Description**: Get a single project by ID

**Response**:
```typescript
{
  success: true,
  data: IProject
}
```

#### POST /api/projects
**Description**: Create a new project

**Request Body**:
```typescript
{
  name: string;         // Required
  description?: string;
  status?: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
}
```

**Response**:
```typescript
{
  success: true,
  data: IProject,
  message: "Project created successfully"
}
```

#### PUT /api/projects/[id]
**Description**: Update a project

**Request Body**: Partial<IProject>

**Response**:
```typescript
{
  success: true,
  data: IProject,
  message: "Project updated successfully"
}
```

#### DELETE /api/projects/[id]
**Description**: Delete a project

**Response**:
```typescript
{
  success: true,
  message: "Project deleted successfully"
}
```

---

### Specs API

#### GET /api/specs
**Description**: List specs with optional filters

**Query Parameters**:
```typescript
interface SpecsQuery {
  page?: number;
  limit?: number;
  projectId?: string;   // Filter by project
  phase?: SpecPhase;    // Filter by phase
  status?: SpecStatus;  // Filter by status
  search?: string;      // Search in title and description
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    specs: ISpec[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

#### GET /api/specs/[specId]
**Description**: Get a single spec by ID

**Response**:
```typescript
{
  success: true,
  data: ISpec
}
```

#### POST /api/specs
**Description**: Create a new spec

**Request Body**:
```typescript
{
  title: string;           // Required
  description?: string;
  projectId: string;       // Required
  phase?: SpecPhase;       // Default: REQUIREMENTS
  priority?: 'P0' | 'P1' | 'P2';
}
```

**Response**:
```typescript
{
  success: true,
  data: ISpec,
  message: "Spec created successfully"
}
```

#### POST /api/specs/[specId]/generate-requirements
**Description**: Generate requirements phase using AI

**Response**:
```typescript
{
  success: true,
  data: {
    requirements: string,  // Markdown content
    spec: ISpec           // Updated spec
  }
}
```

#### POST /api/specs/[specId]/generate-design
**Description**: Generate design phase using AI

**Response**:
```typescript
{
  success: true,
  data: {
    design: string,  // Markdown content
    spec: ISpec     // Updated spec
  }
}
```

#### POST /api/specs/[specId]/generate-tasks
**Description**: Generate tasks phase using AI

**Response**:
```typescript
{
  success: true,
  data: {
    tasks: string,  // Markdown content
    spec: ISpec     // Updated spec
  }
}
```

---

### Tasks API

#### GET /api/tasks
**Description**: List tasks with filters

**Query Parameters**:
```typescript
interface TasksQuery {
  page?: number;
  limit?: number;
  specId?: string;      // Filter by spec
  projectId?: string;   // Filter by project
  status?: TaskStatus;  // Filter by status
  assignedTo?: string;  // Filter by user
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    tasks: ITask[],
    total: number
  }
}
```

#### POST /api/tasks
**Description**: Create a new task

**Request Body**:
```typescript
{
  title: string;
  description?: string;
  specId: string;
  projectId: string;
  type: 'IMPLEMENTATION' | 'TESTING' | 'DOCUMENTATION';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedHours?: number;
}
```

#### PUT /api/tasks/[taskId]
**Description**: Update a task

**Request Body**: Partial<ITask>

#### POST /api/tasks/[taskId]/execute
**Description**: Execute a task using AI agent

**Response**:
```typescript
{
  success: true,
  data: {
    executionId: string,
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  }
}
```

---

## Data Models

### IProject
```typescript
interface IProject {
  _id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### ISpec
```typescript
interface ISpec {
  _id: string;
  specNumber: number;          // Auto-incremented
  title: string;
  description: string;
  projectId: string | IProject;

  // Phase tracking
  phase: 'REQUIREMENTS' | 'DESIGN' | 'TASKS' | 'IMPLEMENTATION';
  status: 'ACTIVE' | 'BLOCKED' | 'COMPLETED';
  priority: 'P0' | 'P1' | 'P2';
  progress: number;            // 0-100

  // Phase content (stored as markdown)
  requirements?: {
    content: string;
    approved: boolean;
    approvedAt?: Date;
    approvedBy?: string;
  };
  design?: {
    content: string;
    approved: boolean;
    approvedAt?: Date;
    approvedBy?: string;
  };
  tasks?: {
    content: string;
    approved: boolean;
    approvedAt?: Date;
    approvedBy?: string;
  };

  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### ITask
```typescript
interface ITask {
  _id: string;
  title: string;
  description?: string;
  specId: string | ISpec;
  projectId: string | IProject;

  type: 'IMPLEMENTATION' | 'TESTING' | 'DOCUMENTATION';
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'FAILED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';

  estimatedHours?: number;
  actualHours?: number;

  assignedTo?: string;         // User ID
  agentId?: string;            // If executed by agent

  dependencies?: string[];     // Task IDs

  result?: {
    success: boolean;
    output?: string;
    error?: string;
    filesModified?: string[];
    testsRun?: number;
    testsPassed?: number;
  };

  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### IAgent
```typescript
interface IAgent {
  _id: string;
  name: string;
  type: 'REQUIREMENTS' | 'DESIGN' | 'IMPLEMENTATION' | 'TESTING';
  status: 'IDLE' | 'BUSY' | 'ERROR';

  currentTask?: string;        // Task ID

  config: {
    model: string;
    maxTokens?: number;
    temperature?: number;
  };

  metrics: {
    tasksCompleted: number;
    tasksFaile: number;
    averageExecutionTime: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Service Interfaces

### Claude Client Service
```typescript
interface ClaudeClientService {
  /**
   * Send a prompt to Claude and get a response
   */
  chat(prompt: string, options?: ChatOptions): Promise<string>;

  /**
   * Generate requirements for a spec
   */
  generateRequirements(spec: ISpec): Promise<string>;

  /**
   * Generate design for a spec
   */
  generateDesign(spec: ISpec): Promise<string>;

  /**
   * Generate tasks for a spec
   */
  generateTasks(spec: ISpec): Promise<string>;
}

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}
```

### Task Execution Service
```typescript
interface TaskExecutionService {
  /**
   * Execute a task using an AI agent
   */
  executeTask(taskId: string): Promise<TaskExecutionResult>;

  /**
   * Queue a task for execution
   */
  queueTask(taskId: string, priority?: number): Promise<void>;

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>;
}

interface TaskExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  filesModified: string[];
  duration: number;
}

interface ExecutionStatus {
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
}
```

### Spec Generator Service
```typescript
interface SpecGeneratorService {
  /**
   * Generate requirements phase
   */
  generateRequirements(specId: string): Promise<void>;

  /**
   * Generate design phase
   */
  generateDesign(specId: string): Promise<void>;

  /**
   * Generate tasks phase
   */
  generateTasks(specId: string): Promise<void>;

  /**
   * Approve a phase
   */
  approvePhase(
    specId: string,
    phase: SpecPhase,
    userId: string
  ): Promise<void>;
}
```

---

## WebSocket Events

### Client → Server Events

#### join_project
**Payload**:
```typescript
{
  projectId: string;
}
```

#### leave_project
**Payload**:
```typescript
{
  projectId: string;
}
```

#### subscribe_spec
**Payload**:
```typescript
{
  specId: string;
}
```

### Server → Client Events

#### spec_updated
**Payload**:
```typescript
{
  specId: string;
  spec: ISpec;
  updatedFields: string[];
}
```

#### task_status_changed
**Payload**:
```typescript
{
  taskId: string;
  task: ITask;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}
```

#### agent_progress
**Payload**:
```typescript
{
  agentId: string;
  taskId: string;
  progress: number;
  message: string;
}
```

#### error
**Payload**:
```typescript
{
  code: string;
  message: string;
  details?: any;
}
```

---

## Error Codes

### Standard Error Codes
```typescript
enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Resource Not Found
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  SPEC_NOT_FOUND = 'SPEC_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',

  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Business Logic Errors
  PHASE_NOT_APPROVED = 'PHASE_NOT_APPROVED',
  SPEC_ALREADY_EXISTS = 'SPEC_ALREADY_EXISTS',
  TASK_IN_PROGRESS = 'TASK_IN_PROGRESS',

  // External Service Errors
  CLAUDE_API_ERROR = 'CLAUDE_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Internal Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
```

### Error Response Example
```typescript
// Bad Request
{
  "success": false,
  "error": "Title is required",
  "code": "MISSING_REQUIRED_FIELD",
  "message": "Please provide a title for the spec"
}

// Not Found
{
  "success": false,
  "error": "Spec not found",
  "code": "SPEC_NOT_FOUND",
  "message": "The requested spec does not exist or you don't have permission to access it"
}

// Business Logic Error
{
  "success": false,
  "error": "Cannot proceed to design phase",
  "code": "PHASE_NOT_APPROVED",
  "message": "Requirements phase must be approved before proceeding to design"
}
```

---

## Integration Guidelines

### For AI Agents Building APIs

1. **Always use the standard response format**
   - Return `ApiSuccessResponse` or `ApiErrorResponse`
   - Include appropriate error codes
   - Provide helpful error messages

2. **Validate input early**
   - Use Zod or similar for request validation
   - Return `INVALID_INPUT` with details

3. **Handle errors gracefully**
   - Catch and log all errors
   - Never leak internal error details to client
   - Use appropriate HTTP status codes

4. **Document new endpoints**
   - Add to this file when creating new endpoints
   - Include request/response examples
   - Document all query parameters

5. **Follow RESTful conventions**
   - GET for reading
   - POST for creating
   - PUT/PATCH for updating
   - DELETE for removing

### For Frontend Developers

1. **Type-safe API calls**
   - Use TypeScript interfaces from this document
   - Create typed fetch wrappers
   - Handle both success and error cases

2. **Error handling**
   - Display user-friendly error messages
   - Log detailed errors for debugging
   - Show appropriate UI states (loading, error, success)

3. **Optimistic updates**
   - Update UI immediately on action
   - Revert on error
   - Sync with server response

---

## Versioning

This document describes API version **v1**.

When breaking changes are needed:
1. Create new version (v2)
2. Support both versions concurrently
3. Migrate clients gradually
4. Deprecate old version with notice period

---

## Questions or Changes?

To propose changes to these contracts:
1. Create a spec documenting the change
2. Get approval from team
3. Update this document
4. Notify all stakeholders
