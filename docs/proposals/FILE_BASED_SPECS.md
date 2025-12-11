# Proposal: File-Based Spec-Driven Development

**Status**: Draft
**Created**: 2025-12-07
**Author**: AI Assistant

---

## Problem Statement

Currently, specs (requirements, design, tasks) are stored in MongoDB. This has several drawbacks:

1. **Not Version-Controlled**: Specs aren't versioned with the code they describe
2. **Database-Dependent**: Can't work offline or without database access
3. **Hard to Edit**: Requires API calls instead of simple file editing
4. **No Agent Context**: Claude agents can't load project context from `.claude` files
5. **Not Portable**: Moving projects requires database exports

## Proposed Solution

Store specs as **files in the project workspace**, matching the structure used in Claudester itself:

```
~/claudester-workspaces/
  my-project/
    spec/
      001-user-auth/
        requirements.md
        design.md
        tasks.md
        .requirements-approved
        .design-approved
        .tasks-approved
        README.md              # Spec overview
      002-payment-system/
        requirements.md
        design.md
        tasks.md
        README.md
      .current-spec            # Points to active spec
      README.md                # Spec repository overview
      WORKFLOW.md              # Phase gate workflow
    .claude/
      context.md               # Project context for Claude agents
      instructions.md          # Project-specific instructions
    .current-task              # Current task tracking
    src/
      (generated code)
    tests/
      (generated tests)
    README.md                  # Project README
    package.json              # If applicable
```

---

## Proposed Directory Structure

### Project Root: `~/claudester-workspaces/{project-name}/`

```
my-project/
├── spec/                      # Spec-driven development specs
│   ├── 001-feature-name/
│   │   ├── README.md          # Spec status dashboard
│   │   ├── requirements.md    # Phase 1: What to build
│   │   ├── design.md          # Phase 2: How to build it
│   │   ├── tasks.md           # Phase 3: Task breakdown
│   │   ├── .requirements-approved
│   │   ├── .design-approved
│   │   └── .tasks-approved
│   ├── .current-spec          # "002-feature-name"
│   ├── README.md              # Spec repository overview
│   └── WORKFLOW.md            # Phase gate workflow
│
├── .claude/                   # Claude agent context
│   ├── context.md             # Project overview, architecture, patterns
│   ├── instructions.md        # Project-specific development rules
│   └── memory.json            # Agent memory/state (optional)
│
├── .current-task              # Current task being worked on
├── CLAUDE.md                  # Main AI context file (optional)
│
├── src/                       # Generated source code
├── tests/                     # Generated tests
├── docs/                      # Generated documentation
│
├── .gitignore
├── README.md                  # Project README
└── package.json              # (if applicable)
```

---

## Implementation Changes

### 1. Project Creation Flow

**Current:**
```typescript
// POST /api/projects
const project = await Project.create({
  name,
  description,
  ownerId,
  workspacePath: `/home/user/claudester-workspaces/${slug}`
});
```

**New:**
```typescript
// POST /api/projects
const workspacePath = `/home/user/claudester-workspaces/${slug}`;

// 1. Create project record
const project = await Project.create({
  name,
  description,
  ownerId,
  workspacePath
});

// 2. Initialize project directory
await initializeProjectWorkspace(workspacePath, project);
```

### 2. Workspace Initialization

```typescript
/**
 * Initialize project workspace on disk
 */
async function initializeProjectWorkspace(
  workspacePath: string,
  project: IProject
) {
  const fs = require('fs').promises;
  const path = require('path');

  // Create directory structure
  await fs.mkdir(workspacePath, { recursive: true });
  await fs.mkdir(path.join(workspacePath, 'spec'), { recursive: true });
  await fs.mkdir(path.join(workspacePath, '.claude'), { recursive: true });
  await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
  await fs.mkdir(path.join(workspacePath, 'tests'), { recursive: true });
  await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });

  // Create spec repository files
  await fs.writeFile(
    path.join(workspacePath, 'spec', 'README.md'),
    generateSpecReadme(project)
  );

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
}
```

### 3. Spec Creation Flow

**Current:**
```typescript
// POST /api/specs
const spec = await Spec.create({
  title,
  description,
  projectId,
  requirements: null,   // Stored in DB
  design: null,
  tasksDoc: null
});
```

**New:**
```typescript
// POST /api/specs
const project = await Project.findById(projectId);
const specNumber = await getNextSpecNumber(projectId);
const specId = `${String(specNumber).padStart(3, '0')}-${slugify(title)}`;

// 1. Create spec record (metadata only)
const spec = await Spec.create({
  title,
  description,
  projectId,
  specNumber,
  specId,
  // NO requirements/design/tasks in DB
});

// 2. Create spec directory
const specPath = path.join(project.workspacePath, 'spec', specId);
await createSpecDirectory(specPath, spec);

// 3. Update .current-spec
await fs.writeFile(
  path.join(project.workspacePath, 'spec', '.current-spec'),
  specId
);
```

### 4. Spec Directory Creation

```typescript
async function createSpecDirectory(specPath: string, spec: ISpec) {
  const fs = require('fs').promises;
  const path = require('path');

  // Create spec directory
  await fs.mkdir(specPath, { recursive: true });

  // Create README.md (spec status dashboard)
  await fs.writeFile(
    path.join(specPath, 'README.md'),
    generateSpecReadme(spec)
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
}
```

### 5. Spec Generation Flow

**Current:**
```typescript
// POST /api/specs/[specId]/generate-requirements
const content = await claudeClient.generateRequirements(spec);

// Store in database
spec.requirements = content;
await spec.save();
```

**New:**
```typescript
// POST /api/specs/[specId]/generate-requirements
const project = await Project.findById(spec.projectId);
const specPath = path.join(project.workspacePath, 'spec', spec.specId);

// 1. Generate content
const content = await claudeClient.generateRequirements(spec);

// 2. Write to file
await fs.writeFile(
  path.join(specPath, 'requirements.md'),
  content
);

// 3. Update spec metadata (NOT content)
spec.requirementsGenerated = true;
spec.requirementsGeneratedAt = new Date();
await spec.save();
```

### 6. Reading Specs

**Current:**
```typescript
// GET /api/specs/[specId]
const spec = await Spec.findById(specId);
return {
  ...spec,
  requirements: spec.requirements,  // From DB
  design: spec.design,
  tasks: spec.tasksDoc
};
```

**New:**
```typescript
// GET /api/specs/[specId]
const spec = await Spec.findById(specId).populate('projectId');
const project = spec.projectId;
const specPath = path.join(project.workspacePath, 'spec', spec.specId);

// Read from files
const requirements = await readFileIfExists(path.join(specPath, 'requirements.md'));
const design = await readFileIfExists(path.join(specPath, 'design.md'));
const tasks = await readFileIfExists(path.join(specPath, 'tasks.md'));

// Check approval markers
const requirementsApproved = await fileExists(path.join(specPath, '.requirements-approved'));
const designApproved = await fileExists(path.join(specPath, '.design-approved'));
const tasksApproved = await fileExists(path.join(specPath, '.tasks-approved'));

return {
  ...spec.toObject(),
  requirements,
  design,
  tasks,
  requirementsApproved,
  designApproved,
  tasksApproved,
  specPath  // Include path for reference
};
```

### 7. Approval Flow

**Current:**
```typescript
// POST /api/specs/[specId]/approve-requirements
spec.requirementsApproved = true;
spec.requirementsApprovedAt = new Date();
await spec.save();
```

**New:**
```typescript
// POST /api/specs/[specId]/approve-requirements
const project = await Project.findById(spec.projectId);
const specPath = path.join(project.workspacePath, 'spec', spec.specId);

// Create approval marker file
await fs.writeFile(
  path.join(specPath, '.requirements-approved'),
  new Date().toISOString()
);

// Update metadata
spec.requirementsApproved = true;
spec.requirementsApprovedAt = new Date();
await spec.save();
```

---

## Claude Agent Context Loading

### .claude/context.md Template

```markdown
# {Project Name} - Claude Agent Context

## Project Overview
{description}

## Architecture
**Tech Stack**:
- Frontend: {frontend stack}
- Backend: {backend stack}
- Database: {database}

**Patterns**: {architectural patterns}

## Development Guidelines
- Follow spec-driven development (see `spec/WORKFLOW.md`)
- Read `spec/.current-spec` to see active spec
- Read `.current-task` for current work
- All code must match patterns in existing codebase

## File Structure
```
{project structure}
```

## Current Status
- Active Spec: {spec ID}
- Current Phase: {phase}
- Tasks Complete: {count}

## Important Context
{project-specific notes}
```

### .claude/instructions.md Template

```markdown
# Development Instructions for {Project Name}

## Before Starting Any Work
1. Read `spec/.current-spec`
2. Read `.current-task`
3. Review active spec in `spec/{spec-id}/`
4. Check approval markers

## Code Style
{project-specific style rules}

## Testing Requirements
{project-specific testing rules}

## Deployment
{deployment instructions}
```

### Agent Loading Process

When Claude agent starts working on a project:

```typescript
async function loadProjectContext(projectId: string) {
  const project = await Project.findById(projectId);
  const workspacePath = project.workspacePath;

  // 1. Load Claude context
  const context = await fs.readFile(
    path.join(workspacePath, '.claude', 'context.md'),
    'utf-8'
  );

  const instructions = await fs.readFile(
    path.join(workspacePath, '.claude', 'instructions.md'),
    'utf-8'
  );

  // 2. Load current task
  const currentTask = await fs.readFile(
    path.join(workspacePath, '.current-task'),
    'utf-8'
  );

  // 3. Load current spec
  const currentSpecId = await fs.readFile(
    path.join(workspacePath, 'spec', '.current-spec'),
    'utf-8'
  );

  const specPath = path.join(workspacePath, 'spec', currentSpecId.trim());

  // 4. Load spec documents
  const requirements = await readFileIfExists(path.join(specPath, 'requirements.md'));
  const design = await readFileIfExists(path.join(specPath, 'design.md'));
  const tasks = await readFileIfExists(path.join(specPath, 'tasks.md'));

  // Return comprehensive context
  return {
    project,
    workspacePath,
    context,
    instructions,
    currentTask,
    currentSpec: {
      id: currentSpecId.trim(),
      requirements,
      design,
      tasks,
      path: specPath
    }
  };
}
```

---

## Migration Strategy

### Phase 1: Add File System Support (Parallel)
- Keep existing MongoDB storage
- Add file system writes in parallel
- Both systems work together

### Phase 2: Prioritize File System
- Read from files first, fall back to DB
- New projects use file system only
- Existing projects gradually migrate

### Phase 3: Database for Metadata Only
- Database stores only metadata (title, status, dates, etc.)
- All content lives in files
- Remove content fields from Spec model

---

## Benefits

1. **Version Control**: Specs are git-versioned with code
2. **Portability**: Projects are self-contained directories
3. **Transparency**: Anyone can edit specs in text editor
4. **Agent Context**: Claude loads context from `.claude/` files
5. **Offline Work**: No database dependency for reading specs
6. **Backup**: Simple directory backups
7. **Collaboration**: Specs can be reviewed in pull requests
8. **Standards Alignment**: Matches how Claudester itself works

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| File system permissions | Set proper permissions on workspace creation |
| Concurrent writes | Use file locking or atomic writes |
| Disk space | Monitor workspace sizes, set limits |
| File corruption | Regular backups, checksums |
| Path traversal | Validate all paths, sanitize inputs |

---

## Configuration

Add to `.env`:

```bash
# Workspace Configuration
WORKSPACE_ROOT=/home/user/claudester-workspaces
MAX_WORKSPACE_SIZE_MB=1000
ENABLE_FILE_SYSTEM_SPECS=true
```

---

## API Changes

### New Endpoints

```typescript
// Get spec content from files
GET /api/specs/[specId]/files
Response: {
  requirements: string,
  design: string,
  tasks: string,
  readme: string
}

// Update spec file
PUT /api/specs/[specId]/files/requirements
Body: { content: string }
Response: { success: true, updated: Date }

// Get project workspace info
GET /api/projects/[projectId]/workspace
Response: {
  path: string,
  size: number,
  specs: string[],
  structure: object
}
```

---

## Next Steps

1. **Get approval** for this approach
2. **Create spec** for implementation (following spec-driven development!)
3. **Implement workspace initialization**
4. **Add file system operations**
5. **Test with new project**
6. **Migrate existing projects** (optional)

---

## Questions for Discussion

1. Should we keep MongoDB for search/filtering, or use file system only?
2. What's the workspace root path? User's home directory? Configurable?
3. Should each user have their own workspaces directory?
4. How to handle workspace cleanup when projects are deleted?
5. Should workspaces be git repositories automatically?
