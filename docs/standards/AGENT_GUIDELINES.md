# AI Agent Output Guidelines

> **CRITICAL**: All AI agents working on Claudester MUST follow these guidelines to ensure consistent, high-quality output across all generated code and documentation.

Last Updated: 2025-12-07

---

## Table of Contents
1. [Core Principles](#core-principles)
2. [Before You Start](#before-you-start)
3. [Code Generation Standards](#code-generation-standards)
4. [Documentation Standards](#documentation-standards)
5. [Communication Standards](#communication-standards)
6. [Quality Checks](#quality-checks)
7. [Prohibited Practices](#prohibited-practices)

---

## Core Principles

### 1. **Consistency Above All**
Every agent must produce output that is indistinguishable in style from human-written code and documentation. There should be NO telltale signs that code was AI-generated.

### 2. **Spec Compliance**
- **ALWAYS** check the active spec before starting work
- **NEVER** deviate from spec requirements without explicit user approval
- Reference: `cat spec/.current-spec` and `cat .current-task`

### 3. **Existing Patterns First**
- Study existing code before writing new code
- Match naming conventions, file structure, and code patterns
- When in doubt, find a similar example in the codebase and follow its pattern

### 4. **Quality Over Speed**
- Take time to read relevant files
- Understand context before making changes
- Test code before marking tasks complete

---

## Before You Start

### Required Pre-Work Checklist
Before writing ANY code or documentation, you MUST:

1. **Read the spec**
   ```bash
   # Check active spec
   cat spec/.current-spec

   # Read current task
   cat .current-task

   # Read the full spec
   cat spec/002-claudester-platform/requirements.md
   cat spec/002-claudester-platform/design.md
   cat spec/002-claudester-platform/tasks.md
   ```

2. **Read relevant documentation**
   ```bash
   # Style guide
   cat docs/standards/STYLE_GUIDE.md

   # API contracts
   cat docs/standards/API_CONTRACTS.md

   # This file
   cat docs/standards/AGENT_GUIDELINES.md
   ```

3. **Study existing code patterns**
   - Find similar files to what you're building
   - Note naming conventions, imports, error handling
   - Match the existing style EXACTLY

4. **Check CLAUDE.md for context**
   ```bash
   cat CLAUDE.md
   ```

---

## Code Generation Standards

### File Creation

#### BEFORE Creating a New File
```typescript
// 1. Search for similar files
// Use Glob or Grep to find examples

// 2. Read at least 2-3 similar files
// Understand the pattern

// 3. Match the structure EXACTLY
```

#### File Header Template
```typescript
// ✅ GOOD: Match existing file patterns
// No file headers unless they already exist in similar files

// If project uses file headers, match this format:
/**
 * Spec Generator Service
 *
 * Handles AI-powered generation of spec phases using Claude
 */

import { logger } from '@/backend/config/logger';
import type { ISpec } from '@/types/spec';

// ... rest of file
```

### Import Organization
```typescript
// ✅ GOOD: Organized, matches existing files
// 1. External deps
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// 2. Internal absolute imports
import { Spec } from '@/backend/models/Spec';
import { logger } from '@/backend/config/logger';

// 3. Types
import type { ISpec, SpecPhase } from '@/types/spec';

// 4. Relative imports
import { validateSpec } from './validation';
```

### Function Structure
```typescript
// ✅ GOOD: Clear, type-safe, well-documented
/**
 * Generate requirements phase for a spec using Claude AI
 *
 * @param specId - MongoDB ObjectId of the spec
 * @returns Promise resolving to generated markdown content
 * @throws Error if spec not found or AI generation fails
 */
async function generateRequirements(specId: string): Promise<string> {
  // 1. Input validation
  if (!mongoose.Types.ObjectId.isValid(specId)) {
    throw new Error('Invalid spec ID');
  }

  // 2. Fetch data
  const spec = await Spec.findById(specId);
  if (!spec) {
    throw new Error('Spec not found');
  }

  // 3. Business logic
  try {
    const content = await claudeClient.generateRequirements(spec);
    return content;
  } catch (error) {
    // 4. Error handling
    logger.error({ error, specId }, 'Requirements generation failed');
    throw new Error('Failed to generate requirements');
  }
}

// ❌ BAD: No types, no error handling, unclear logic
async function generateRequirements(id: any) {
  const spec = await Spec.findById(id);
  return await claude.generate(spec);
}
```

### Error Handling Pattern
```typescript
// ✅ GOOD: Consistent error handling
try {
  // Attempt operation
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Log with context
  logger.error({
    error,
    context: { userId, operation: 'riskyOperation' }
  }, 'Operation failed');

  // Throw user-friendly error
  throw new Error('Failed to complete operation. Please try again.');
}

// ❌ BAD: Silent failures or generic errors
try {
  return await riskyOperation();
} catch (e) {
  return null;  // Silent failure!
}
```

---

## Documentation Standards

### Markdown Documents
```markdown
<!-- ✅ GOOD: Clear structure, proper formatting -->

# Document Title

> Brief description of what this document covers

Last Updated: 2025-12-07

---

## Section 1

### Subsection

Clear, concise explanation with examples.

### Code Examples

Always include examples for complex concepts:

\`\`\`typescript
// Example code here
const example = "with comments";
\`\`\`

### Lists

- Use bullet points for unordered lists
- Keep items parallel in structure
- Start each item with a capital letter

1. Use numbers for ordered/sequential lists
2. Maintain consistent formatting
3. Include explanations when needed
```

### Inline Code Comments
```typescript
// ✅ GOOD: Comments explain WHY, not WHAT

// Use 127.0.0.1 instead of localhost to avoid DNS resolution issues
// during Next.js SSR on some macOS configurations
const baseUrl = 'http://127.0.0.1:3001';

// Calculate retry delay with exponential backoff (2^attempt * 100ms)
const retryDelay = Math.pow(2, attempt) * 100;

// ❌ BAD: Comments state the obvious

// Set base URL to 127.0.0.1:3001
const baseUrl = 'http://127.0.0.1:3001';

// Calculate retry delay
const retryDelay = Math.pow(2, attempt) * 100;
```

### JSDoc Comments
```typescript
// ✅ GOOD: Complete JSDoc for public APIs
/**
 * Execute a task using an AI agent
 *
 * Queues the task for execution and returns an execution ID that can be used
 * to track progress. The task will be picked up by an available agent.
 *
 * @param taskId - MongoDB ObjectId of the task to execute
 * @param options - Optional execution configuration
 * @param options.priority - Task priority (higher = executes sooner), default: 0
 * @param options.timeout - Max execution time in ms, default: 3600000 (1 hour)
 * @returns Promise resolving to execution ID
 * @throws {Error} If task not found or invalid
 *
 * @example
 * ```typescript
 * const executionId = await executeTask('task123', { priority: 10 });
 * console.log(`Task queued: ${executionId}`);
 * ```
 */
async function executeTask(
  taskId: string,
  options?: ExecutionOptions
): Promise<string> {
  // Implementation
}
```

---

## Communication Standards

### Progress Updates
```typescript
// ✅ GOOD: Use TodoWrite to track progress
// Update todo list IMMEDIATELY when:
// - Starting a new task
// - Completing a task
// - Encountering a blocker
// - Discovering new tasks

// Example:
TodoWrite({
  todos: [
    { content: "Create API endpoint", status: "completed", activeForm: "Creating API endpoint" },
    { content: "Write tests", status: "in_progress", activeForm: "Writing tests" },
    { content: "Update documentation", status: "pending", activeForm: "Updating documentation" }
  ]
});
```

### User Communication
```typescript
// ✅ GOOD: Clear, concise, actionable

"I've updated the projects page to use 127.0.0.1 instead of localhost to fix the SSR fetch errors. The pages should now display your project and spec data correctly."

// ❌ BAD: Vague, overly technical

"I modified the data fetching logic to address network connectivity issues in the server-side rendering context by utilizing IP-based addressing."
```

### Asking Questions
```typescript
// ✅ GOOD: Specific questions with context

"I need to update the Spec model. Should I:
1. Create a database migration to rename existing 'name' fields to 'title', OR
2. Support both fields during a transition period?

This affects 44 existing specs in the database."

// ❌ BAD: Vague questions without context

"Should I update the database?"
```

---

## Quality Checks

### Before Marking a Task Complete

Run this mental checklist:

1. **Code Quality**
   - [ ] Follows style guide (STYLE_GUIDE.md)
   - [ ] Matches existing code patterns
   - [ ] No ESLint errors or warnings
   - [ ] No TypeScript errors
   - [ ] Proper error handling in place

2. **Testing**
   - [ ] Code has been tested (manual or automated)
   - [ ] Edge cases considered
   - [ ] Error paths tested
   - [ ] No breaking changes to existing functionality

3. **Documentation**
   - [ ] Complex logic has comments explaining WHY
   - [ ] Public APIs have JSDoc comments
   - [ ] README or docs updated if needed

4. **Integration**
   - [ ] Follows API contracts (API_CONTRACTS.md)
   - [ ] Type-safe (no `any` types)
   - [ ] Uses correct service interfaces
   - [ ] Handles API responses correctly

5. **Cleanup**
   - [ ] No commented-out code
   - [ ] No console.log statements (use logger)
   - [ ] No debug code left behind
   - [ ] Imports organized correctly

---

## Prohibited Practices

### ❌ NEVER Do These Things

1. **Using `any` type**
   ```typescript
   // ❌ NEVER
   function process(data: any) { }

   // ✅ ALWAYS
   function process(data: unknown) {
     if (typeof data === 'string') {
       // Safe to use as string
     }
   }
   ```

2. **Silent error swallowing**
   ```typescript
   // ❌ NEVER
   try {
     await criticalOperation();
   } catch (e) {
     // Ignore error
   }

   // ✅ ALWAYS
   try {
     await criticalOperation();
   } catch (error) {
     logger.error({ error }, 'Critical operation failed');
     throw error;  // Or handle appropriately
   }
   ```

3. **Implementing features not in spec**
   ```typescript
   // ❌ NEVER add features without user request
   // Even if it seems like a good idea!

   // ✅ ALWAYS ask first
   // "I noticed we could add X feature. Should I implement it?"
   ```

4. **Copy-pasting without understanding**
   ```typescript
   // ❌ NEVER blindly copy code
   // Understand what it does and why

   // ✅ ALWAYS read, understand, then adapt
   ```

5. **Skipping the spec**
   ```typescript
   // ❌ NEVER start coding without reading the spec

   // ✅ ALWAYS check:
   cat spec/.current-spec
   cat .current-task
   // Then proceed
   ```

6. **Using `console.log`**
   ```typescript
   // ❌ NEVER
   console.log('Debug:', data);

   // ✅ ALWAYS use logger
   logger.debug({ data }, 'Debug information');
   ```

7. **Creating files without checking existing patterns**
   ```typescript
   // ❌ NEVER create files in isolation

   // ✅ ALWAYS:
   // 1. Find similar files (Glob/Grep)
   // 2. Read 2-3 examples
   // 3. Match the pattern EXACTLY
   ```

---

## Agent Self-Review Checklist

Before submitting your work, ask yourself:

1. **Spec Compliance**
   - [ ] Did I read the full spec before starting?
   - [ ] Does my solution match spec requirements?
   - [ ] Did I get approval for any deviations?

2. **Style Consistency**
   - [ ] Could this code have been written by the original developer?
   - [ ] Does it match surrounding code in style?
   - [ ] Would a reviewer notice it's AI-generated?

3. **Quality**
   - [ ] Did I test this code?
   - [ ] Does it handle errors properly?
   - [ ] Is it type-safe?

4. **Documentation**
   - [ ] Updated todos as I worked?
   - [ ] Documented complex logic?
   - [ ] Updated relevant docs?

5. **Clean Code**
   - [ ] No debug code?
   - [ ] No commented-out code?
   - [ ] Proper imports?
   - [ ] No ESLint/TS errors?

**If you answered "NO" to any of these, fix it before proceeding.**

---

## Emergency Contacts

When you're stuck or unsure:

1. **Check existing documentation first**
   - CLAUDE.md
   - STYLE_GUIDE.md
   - API_CONTRACTS.md
   - This file

2. **Study similar code**
   - Use Glob to find examples
   - Read and understand patterns

3. **Ask the user**
   - Be specific about what you need
   - Provide context and options
   - Don't make assumptions

---

## Remember

**Your goal is to be indistinguishable from a skilled human developer who:**
- Follows project conventions religiously
- Writes clean, maintainable code
- Tests thoroughly
- Documents clearly
- Communicates effectively

**You are NOT here to:**
- Show off clever tricks
- Reinvent patterns
- Add unsolicited features
- Rush through tasks

**Quality. Consistency. Spec Compliance. Always.**
