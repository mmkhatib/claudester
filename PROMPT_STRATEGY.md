# Claudester Prompt Strategy for Consistency

## Current Problems

### 1. Isolated Spec Generation
Each spec is generated independently with zero awareness of other specs:
```
Input: "tic tac toe for browser"
Output: 20 specs, each designed in isolation
```

### 2. Minimal Context Chaining
```
Requirements prompt gets: spec name + description + "Project: tic tac toe"
Design prompt gets: requirements (but no tech stack)
Tasks prompt gets: design.architecture (but no cross-spec dependencies)
```

### 3. No Shared Architecture
- Every spec can choose different tech approaches
- No shared data models
- No naming conventions
- No code organization standards

---

## Improved Strategy

### Phase 1: Project Architecture Generation (ONCE per project)

**When:** Right after creating a project, before generating specs

**Prompt:**
```
You are a senior software architect. Analyze this project and create a comprehensive architecture document that will guide all feature development.

Project: {name}
Description: {description}

Generate a project-wide architecture including:

1. **Tech Stack**
   - Frontend framework and key libraries
   - Backend framework (if needed)
   - Database technology
   - Deployment strategy

2. **Architectural Patterns**
   - Overall architecture style (MVC, Component-based, Event-driven, etc.)
   - State management approach
   - Data flow patterns

3. **Shared Data Models**
   - Core entities that multiple features will use
   - Common data structures
   - API contracts (if applicable)

4. **Code Conventions**
   - Naming conventions (files, variables, functions)
   - File/folder structure
   - Code style guidelines

Output as JSON:
{
  "techStack": {
    "frontend": ["React", "TypeScript", ...],
    "backend": ["Node.js", "Express", ...],
    "database": ["MongoDB", ...],
    "deployment": ["Vercel", ...]
  },
  "patterns": ["Component-based", "Event-driven", ...],
  "dataModel": "Detailed description of core shared entities...",
  "conventions": {
    "naming": "camelCase for variables, PascalCase for components...",
    "fileStructure": "Feature-based folder structure...",
    "codeStyle": "Functional components, hooks..."
  }
}
```

**Result:** Stored in `project.architecture` field

---

### Phase 2: Spec Generation (WITH project context)

**Current:**
```
Project: tic tac toe
Description: tic tac toe for browser
→ Generate specs
```

**Improved:**
```
You are a technical product manager. Generate feature specifications for this project.

Project: {name}
Description: {description}

ARCHITECTURE CONSTRAINTS:
- Tech Stack: {architecture.techStack}
- Patterns: {architecture.patterns}
- Data Model: {architecture.dataModel}
- Conventions: {architecture.conventions}

EXISTING SPECS:
{List of already-generated spec names and descriptions}

Generate NEW specifications that:
1. Use the defined tech stack and patterns
2. Reference and build upon existing specs where appropriate
3. Follow the established conventions
4. Avoid duplicating existing functionality

Output as JSON array...
```

---

### Phase 3: Requirements Generation (WITH full context)

**Current:**
```
Specification: Game Timer
Description: Add optional turn timer...
Project Context: Project: tic tac toe\ntic tac toe for browser
```

**Improved:**
```
You are a technical requirements analyst.

SPEC: {specName}
DESCRIPTION: {specDescription}

PROJECT CONTEXT:
- Name: {project.name}
- Description: {project.description}
- Tech Stack: {architecture.techStack}
- Patterns: {architecture.patterns}
- Data Model: {architecture.dataModel}

RELATED SPECS (that this feature may integrate with):
- Game State Management: Tracks current game state, player turns...
- UI Component System: Provides reusable UI components...
- Event System: Handles game events and state changes...

Generate requirements that:
1. Use the specified tech stack (e.g., vanilla JS if that's the stack)
2. Follow the architectural patterns
3. Integrate with existing data models
4. Reference related specs for integration points
5. Maintain consistency with project conventions

Output as JSON:
{
  "functional": [...],
  "technical": [
    "Must use {techStack.frontend} for implementation",
    "Must integrate with Game State Management spec for turn tracking",
    ...
  ],
  "constraints": [...],
  "acceptanceCriteria": [...],
  "relatedSpecs": ["spec_id_1", "spec_id_2"] // IDs of specs this depends on
}
```

---

### Phase 4: Design Generation (WITH requirements + architecture)

**Current:**
```
Specification: Game Timer
Requirements: {functional, technical, constraints, acceptanceCriteria}
```

**Improved:**
```
You are a software architect.

SPEC: {specName}
DESCRIPTION: {specDescription}
REQUIREMENTS: {requirements}

PROJECT ARCHITECTURE:
- Tech Stack: {architecture.techStack}
- Patterns: {architecture.patterns}
- Shared Data Model: {architecture.dataModel}
- Conventions: {architecture.conventions}

RELATED SPEC DESIGNS:
- Game State Management:
  - Architecture: Centralized state with pub/sub events
  - Data Model: GameState { board, currentPlayer, winner, ... }
  - Components: GameBoard, PlayerIndicator, ...

- Event System:
  - Architecture: Event bus pattern
  - API: emit(event, data), on(event, handler)

Design the technical implementation that:
1. Uses EXACTLY the tech stack defined (no introducing new frameworks)
2. Follows the established architectural patterns
3. Extends/uses the shared data model
4. Integrates cleanly with related spec designs
5. Follows the file structure and naming conventions

Output as JSON:
{
  "architecture": "Event-driven timer using GameState.subscribe()...",
  "dataModel": "Extends GameState with: { timer: { enabled, limit, remaining, ... } }",
  "apiEndpoints": [], // Or actual endpoints if backend exists
  "uiComponents": ["TimerDisplay extends BaseComponent from UI spec", ...],
  "integrationPoints": [
    {
      "spec": "Game State Management",
      "integration": "Subscribe to 'turnChange' event to reset timer"
    }
  ]
}
```

---

### Phase 5: Task Generation (WITH cross-spec dependencies)

**Current:**
```
Specification: Game Timer
Architecture: {design.architecture}
Requirements: {functional requirements}
```

**Improved:**
```
You are a technical project manager.

SPEC: {specName}
DESCRIPTION: {specDescription}
DESIGN: {full design object}
REQUIREMENTS: {requirements}

RELATED SPECS AND THEIR STATUS:
- Game State Management (COMPLETED) - provides GameState API
- Event System (IN PROGRESS) - provides event bus
- UI Component System (COMPLETED) - provides base components

PROJECT CONVENTIONS:
- File Structure: {architecture.conventions.fileStructure}
- Naming: {architecture.conventions.naming}

Generate implementation tasks that:
1. Reference completed specs as dependencies
2. Use the established file structure
3. Follow naming conventions
4. Create integration tasks for related specs
5. Are properly ordered based on dependencies

Output as JSON:
[
  {
    "title": "Create TimerState model extending GameState",
    "description": "Add timer fields to GameState data model...",
    "estimatedHours": 2,
    "dependencies": ["Game State Management spec must be completed"],
    "relatedSpecs": ["spec_id_of_game_state"],
    "acceptanceCriteria": [...]
  },
  {
    "title": "Implement TimerDisplay component",
    "description": "Create timer UI using BaseComponent from UI Component System...",
    "estimatedHours": 3,
    "dependencies": ["UI Component System spec must be completed", "TimerState model"],
    "relatedSpecs": ["spec_id_of_ui_system"],
    "files": ["src/components/timer/TimerDisplay.js"], // Following conventions
    "acceptanceCriteria": [...]
  }
]
```

---

## Implementation Checklist

### 1. Add Architecture Fields to Project Model
```typescript
// backend/models/Project.ts
architecture?: {
  techStack?: { frontend, backend, database, deployment },
  patterns?: string[],
  dataModel?: string,
  conventions?: { naming, fileStructure, codeStyle }
}
```
✅ DONE

### 2. Create Architecture Generation Method
```typescript
// backend/services/ai-providers/base-provider.ts
generateProjectArchitecture(projectName, projectDescription): Promise<Architecture>
```

### 3. Create Architecture Generation Endpoint
```
POST /api/projects/:projectId/generate-architecture
```

### 4. Update Spec Generation Prompt
- Pass architecture
- Pass existing specs
- Request cross-spec awareness

### 5. Update Requirements Prompt
- Pass full architecture
- Pass related specs
- Request integration points

### 6. Update Design Prompt
- Pass architecture + conventions
- Pass related spec designs
- Request integration points

### 7. Update Tasks Prompt
- Pass related spec statuses
- Request cross-spec dependencies
- Request file paths following conventions

### 8. Add relatedSpecs Field to Spec Model
```typescript
relatedSpecs?: mongoose.Types.ObjectId[] // Specs this depends on/integrates with
```

### 9. Add relatedSpecs Field to Task Model
```typescript
relatedSpecs?: mongoose.Types.ObjectId[]
files?: string[] // Files this task creates/modifies
```

---

## Benefits of This Approach

### ✅ Consistency
- All specs use the same tech stack
- All specs follow the same patterns
- All specs follow the same naming conventions

### ✅ Integration
- Specs explicitly reference each other
- Tasks know their dependencies
- Designs show integration points

### ✅ Reusability
- Shared data models across features
- Shared components/utilities
- Avoid duplication

### ✅ Maintainability
- Clear dependency graph
- Consistent file structure
- Easy to understand relationships

---

## Example: Tic Tac Toe Project

### Step 1: Generate Architecture
```json
{
  "techStack": {
    "frontend": ["Vanilla JavaScript", "CSS3", "HTML5"],
    "backend": [],
    "database": [],
    "deployment": ["Static hosting", "GitHub Pages"]
  },
  "patterns": ["Event-driven", "Component-based", "Pub/Sub"],
  "dataModel": "GameState { board: string[], currentPlayer: 'X'|'O', winner: string|null, moveHistory: [], timers: {} }",
  "conventions": {
    "naming": "camelCase for variables/functions, PascalCase for classes, kebab-case for files",
    "fileStructure": "src/{components,utils,state}/ - feature-based modules",
    "codeStyle": "ES6+ classes for components, pure functions for utilities, JSDoc comments"
  }
}
```

### Step 2: Generate Specs (aware of architecture)
All 20 specs know:
- Must use Vanilla JS (no React)
- Must follow event-driven pattern
- Must extend GameState data model
- Must use camelCase/PascalCase/kebab-case conventions

### Step 3: Generate Requirements for "Game Timer"
```json
{
  "technical": [
    "TR-1: Implement using vanilla JavaScript ES6+ (no frameworks)",
    "TR-2: Integrate with GameState event bus (from Game State Management spec)",
    "TR-3: Extend GameState.timers object with timer config",
    "TR-4: Use Component class pattern for TimerDisplay",
    "TR-5: File: src/components/timer-display.js following kebab-case convention"
  ],
  "relatedSpecs": ["6923ac10...", "6923ac11..."] // IDs of related specs
}
```

### Step 4: All specs interconnected
- Game Timer knows about Game State Management
- Leaderboard knows about Game State + Cloud Sync
- Multiplayer knows about Game State + Network System
- Animations know about Game State + UI Components

### Result: Cohesive, integrated project instead of 20 isolated features
