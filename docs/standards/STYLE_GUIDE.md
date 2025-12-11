# Claudester Development Style Guide

> **CRITICAL**: All AI agents and developers MUST follow these standards when writing code for Claudester.

Last Updated: 2025-12-07

---

## Table of Contents
1. [TypeScript Standards](#typescript-standards)
2. [React & Next.js Patterns](#react--nextjs-patterns)
3. [Naming Conventions](#naming-conventions)
4. [File Organization](#file-organization)
5. [Code Formatting](#code-formatting)
6. [Error Handling](#error-handling)
7. [Testing Standards](#testing-standards)
8. [Documentation Requirements](#documentation-requirements)

---

## TypeScript Standards

### Strict Type Safety
```typescript
// ✅ GOOD: Explicit types, no any
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ BAD: Using 'any'
function getUser(id: any): Promise<any> {
  // ...
}
```

### Type Definitions
- **Always** define interfaces for data structures
- Use `type` for unions, intersections, and mapped types
- Use `interface` for object shapes that may be extended
- Export shared types from centralized locations

```typescript
// ✅ GOOD: Centralized type definitions
// types/spec.ts
export interface ISpec {
  _id: string;
  title: string;
  description: string;
  phase: SpecPhase;
  status: SpecStatus;
}

export type SpecPhase = 'REQUIREMENTS' | 'DESIGN' | 'TASKS' | 'IMPLEMENTATION';
export type SpecStatus = 'ACTIVE' | 'BLOCKED' | 'COMPLETED';
```

### Avoid 'any'
- Use `unknown` for truly unknown types
- Use generics for reusable type-safe code
- `any` is only acceptable in test files

```typescript
// ✅ GOOD: Type-safe with unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  throw new Error('Invalid data type');
}

// ❌ BAD: Using any
function processData(data: any) {
  return data.toUpperCase();  // Runtime error if data isn't string!
}
```

---

## React & Next.js Patterns

### Component Structure
```typescript
// ✅ GOOD: Clear component structure
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({
  onClick,
  children,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={getVariantClass(variant)}
    >
      {children}
    </button>
  );
}
```

### Server Components (Default)
- Next.js 14 uses Server Components by default
- Use `'use client'` ONLY when needed (state, effects, browser APIs)
- Keep client components small and focused

```typescript
// ✅ GOOD: Server Component (no 'use client' needed)
// app/projects/page.tsx
export default async function ProjectsPage() {
  const projects = await getProjects();  // Server-side fetch
  return <ProjectList projects={projects} />;
}

// ✅ GOOD: Client Component (needs interactivity)
// components/project-actions.tsx
'use client';

export function ProjectActions({ projectId }: { projectId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteProject(projectId);
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Data Fetching
- Server Components: Use direct fetch or database calls
- Client Components: Use hooks (useState, useEffect) or SWR/React Query
- Always use `{ cache: 'no-store' }` for dynamic data

```typescript
// ✅ GOOD: Server-side data fetching
async function getSpecs() {
  const res = await fetch('http://127.0.0.1:3001/api/specs', {
    cache: 'no-store'
  });
  if (!res.ok) {
    return [];
  }
  const json = await res.json();
  return json.data?.specs || [];
}
```

---

## Naming Conventions

### Files and Directories
```
✅ GOOD:
components/ui/button.tsx
app/(dashboard)/projects/page.tsx
backend/services/spec-generator.ts
types/spec.ts

❌ BAD:
components/UI/Button.tsx
app/Projects/page.tsx
backend/Services/SpecGenerator.ts
types/Spec.ts
```

**Rules:**
- Files: `kebab-case.tsx/ts`
- Directories: `kebab-case`
- Components: `PascalCase` (but file is kebab-case)
- Route groups in Next.js: `(groupName)`

### Variables and Functions
```typescript
// ✅ GOOD:
const userName = 'John';
const isActive = true;
const MAX_RETRIES = 3;

function getUserById(id: string) { }
function handleSubmit() { }
async function fetchProjects() { }

// ❌ BAD:
const UserName = 'John';      // Should be camelCase
const active = true;          // Should be isActive/hasActive
const max_retries = 3;        // Should be UPPERCASE for constants
function get_user_by_id() { } // Should be camelCase
```

**Rules:**
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Functions: `camelCase`, verb-prefixed (get, set, handle, fetch, create, update, delete)
- Booleans: Prefix with `is`, `has`, `should`, `can`
- Classes: `PascalCase`
- Interfaces: `PascalCase` with `I` prefix (e.g., `ISpec`, `IUser`)
- Types: `PascalCase`

### Components
```typescript
// ✅ GOOD:
export function ProjectCard() { }
export function SpecDetailPage() { }
export function UserAvatar() { }

// ❌ BAD:
export function projectCard() { }    // Should be PascalCase
export function spec_detail() { }    // Should be PascalCase
export function avatar() { }         // Too generic, needs context
```

---

## File Organization

### Project Structure
```
claudester/
├── app/                      # Next.js 14 App Router
│   ├── (dashboard)/         # Route group for authenticated pages
│   ├── api/                 # API routes
│   └── layout.tsx           # Root layout
├── backend/                 # Backend services
│   ├── models/              # Mongoose models
│   ├── services/            # Business logic
│   ├── queues/              # Bull queue workers
│   └── websocket/           # WebSocket handlers
├── components/              # Shared React components
│   ├── ui/                  # Base UI components (shadcn/ui)
│   └── ...                  # Feature-specific components
├── docs/                    # Documentation
│   └── standards/           # Development standards
├── lib/                     # Shared utilities
├── spec/                    # Specifications (SDD)
├── types/                   # TypeScript type definitions
└── tests/                   # Test files
```

### Import Order
```typescript
// ✅ GOOD: Organized imports
// 1. External dependencies
import React from 'react';
import { useRouter } from 'next/navigation';
import mongoose from 'mongoose';

// 2. Internal absolute imports
import { Button } from '@/components/ui/button';
import { getProjects } from '@/backend/services/project-service';

// 3. Types
import type { ISpec } from '@/types/spec';

// 4. Relative imports
import { ProjectCard } from './project-card';
import styles from './styles.module.css';
```

---

## Code Formatting

### Enforced by Prettier
Configuration in `.prettierrc.json`:
- **Single quotes** for strings
- **Semicolons** required
- **2 spaces** for indentation
- **100 character** line width
- **Trailing commas** in ES5 style

### Code Style
```typescript
// ✅ GOOD: Clean, readable code
async function createSpec(data: CreateSpecInput): Promise<ISpec> {
  try {
    const spec = await Spec.create({
      ...data,
      phase: 'REQUIREMENTS',
      status: 'ACTIVE',
      progress: 0,
    });

    return spec;
  } catch (error) {
    logger.error({ error, data }, 'Failed to create spec');
    throw new Error('Spec creation failed');
  }
}

// ❌ BAD: Inconsistent spacing, no error handling
async function createSpec(data: any) {
  const spec=await Spec.create({...data,phase:'REQUIREMENTS'});
  return spec;
}
```

---

## Error Handling

### Always Handle Errors
```typescript
// ✅ GOOD: Proper error handling
async function fetchData(id: string) {
  try {
    const response = await fetch(`/api/data/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch data');
    return null;  // Or throw, depending on use case
  }
}

// ❌ BAD: No error handling
async function fetchData(id: string) {
  const response = await fetch(`/api/data/${id}`);
  return response.json();
}
```

### Use Structured Logging
```typescript
// ✅ GOOD: Structured logging with context
import { logger } from '@/backend/config/logger';

logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error, specId }, 'Spec generation failed');

// ❌ BAD: Console.log with no structure
console.log('User logged in:', userId);
console.log('Error:', error);
```

---

## Testing Standards

### Test File Naming
```
✅ GOOD:
button.test.tsx
spec-service.test.ts
integration/api.test.ts

❌ BAD:
button.spec.tsx (use .test, not .spec for test files)
ButtonTest.tsx
test-button.tsx
```

### Test Structure
```typescript
// ✅ GOOD: Clear test structure
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    await userEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Coverage Requirements
- **Target**: 80% code coverage
- All critical paths must be tested
- Test error conditions, not just happy paths
- Integration tests for API routes

---

## Documentation Requirements

### JSDoc for Complex Functions
```typescript
// ✅ GOOD: Documented complex function
/**
 * Generates a complete specification document using Claude AI
 *
 * @param specId - The MongoDB ObjectId of the spec
 * @param phase - Which phase to generate (requirements/design/tasks)
 * @param options - Additional generation options
 * @returns The generated content as a markdown string
 * @throws {Error} If Claude API call fails or spec not found
 */
async function generateSpecPhase(
  specId: string,
  phase: SpecPhase,
  options?: GenerationOptions
): Promise<string> {
  // ...
}
```

### Inline Comments for Complex Logic
```typescript
// ✅ GOOD: Comments explain WHY, not WHAT
// Use 127.0.0.1 instead of localhost to avoid DNS resolution issues
// during Next.js SSR in some environments
const baseUrl = 'http://127.0.0.1:3001';

// ❌ BAD: Comment states the obvious
// Set baseUrl to 127.0.0.1:3001
const baseUrl = 'http://127.0.0.1:3001';
```

### Component Documentation
```typescript
// ✅ GOOD: Prop types serve as documentation
interface ProjectCardProps {
  /** The project object from the database */
  project: IProject;
  /** Callback fired when project is deleted */
  onDelete?: (id: string) => void;
  /** Whether to show the stats section */
  showStats?: boolean;
}
```

---

## Common Patterns to Follow

### API Response Format
```typescript
// ✅ GOOD: Consistent API response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Always return this format from API routes
return NextResponse.json({
  success: true,
  data: { specs, pagination }
});
```

### Environment Variables
```typescript
// ✅ GOOD: Validate env vars early
const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/claudester',
  aiProvider: process.env.AI_PROVIDER || 'claude-code-cli',
  port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
};

// Validate critical env vars
if (!config.mongoUri) {
  throw new Error('MONGODB_URI is required');
}
```

---

## Enforcement

### Pre-commit Checks
1. **ESLint**: `npm run lint` (must pass)
2. **Type Check**: `npm run type-check` (must pass)
3. **Tests**: `npm test` (must pass)
4. **Format**: Code must be formatted with Prettier

### CI/CD Pipeline
All checks run automatically on:
- Pull requests
- Commits to main branch
- Before deployment

### Review Checklist
Before merging code, verify:
- [ ] Follows all naming conventions
- [ ] No ESLint errors or warnings
- [ ] TypeScript types are explicit (no `any`)
- [ ] Error handling is in place
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed

---

## Questions or Exceptions?

If you need to deviate from these standards, document WHY in a code comment and get approval during code review.

For questions or suggested improvements to this guide, create an issue or discuss in the team channel.
