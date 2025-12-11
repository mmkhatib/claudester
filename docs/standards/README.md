# Development Standards

This directory contains all development standards and guidelines for the Claudester project. **All AI agents and developers MUST follow these standards.**

Last Updated: 2025-12-07

---

## Quick Start for AI Agents

Before writing ANY code, read these documents in order:

1. **[AGENT_GUIDELINES.md](./AGENT_GUIDELINES.md)** - Start here! Core principles and workflow
2. **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - Code formatting and patterns to follow
3. **[API_CONTRACTS.md](./API_CONTRACTS.md)** - API specifications and data models
4. **[CODE_REVIEW.md](./CODE_REVIEW.md)** - Quality gates and review checklist

---

## Document Overview

### 📘 [STYLE_GUIDE.md](./STYLE_GUIDE.md)
**Purpose**: Define how code should look and be structured

**Key Sections**:
- TypeScript standards (no `any`, explicit types)
- React & Next.js patterns (Server vs Client components)
- Naming conventions (camelCase, PascalCase, UPPER_SNAKE_CASE)
- File organization (import order, project structure)
- Code formatting (enforced by Prettier)
- Error handling patterns
- Testing standards (80% coverage target)
- Documentation requirements

**When to Reference**:
- Before creating any new file
- When writing functions or components
- When handling errors
- When naming variables, functions, or files

---

### 📗 [API_CONTRACTS.md](./API_CONTRACTS.md)
**Purpose**: Define API specifications and service interfaces

**Key Sections**:
- Standard API response format
- All API endpoints (Projects, Specs, Tasks)
- Data models (IProject, ISpec, ITask, IAgent)
- Service interfaces (ClaudeClient, TaskExecution, SpecGenerator)
- WebSocket events
- Error codes

**When to Reference**:
- Before creating API endpoints
- When fetching data from APIs
- When defining TypeScript interfaces
- When handling API responses
- When implementing backend services

---

### 📙 [AGENT_GUIDELINES.md](./AGENT_GUIDELINES.md)
**Purpose**: Ensure AI agents produce consistent, high-quality output

**Key Sections**:
- Core principles (consistency, spec compliance, existing patterns)
- Pre-work checklist (read spec, study code, understand context)
- Code generation standards
- Documentation standards
- Communication standards
- Quality checks
- Prohibited practices (no `any`, no silent errors, etc.)

**When to Reference**:
- At the start of EVERY work session
- Before writing code
- Before submitting work
- When unsure about approach

---

### 📕 [CODE_REVIEW.md](./CODE_REVIEW.md)
**Purpose**: Automated and manual quality gates

**Key Sections**:
- Pre-review checklist
- Automated quality gates (lint, type-check, tests, build)
- Comprehensive code review checklist
- Common issues and solutions
- Review process

**When to Reference**:
- Before submitting code for review
- When reviewing someone else's code
- When code fails automated checks
- When encountering common issues

---

## Configuration Files

Located in project root:

| File | Purpose | Enforced By |
|------|---------|-------------|
| `.eslintrc.json` | Code quality rules | `npm run lint` |
| `.prettierrc.json` | Code formatting | Auto-format on save |
| `.prettierignore` | Files to skip formatting | Prettier |
| `tsconfig.json` | TypeScript configuration | `npm run type-check` |

---

## Quality Gates (Automated)

All code MUST pass these before merging:

```bash
# 1. Linting
npm run lint
# Must pass: Zero ESLint errors or warnings

# 2. Type checking
npm run type-check
# Must pass: Zero TypeScript errors

# 3. Tests
npm test
# Must pass: All tests pass, ≥80% coverage

# 4. Build
npm run build
# Must pass: Successful production build
```

---

## The Development Flow

### 1. Before Starting
```bash
# Read the spec
cat spec/.current-spec
cat .current-task

# Read relevant standards
cat docs/standards/AGENT_GUIDELINES.md
cat docs/standards/STYLE_GUIDE.md
```

### 2. During Development
- Follow STYLE_GUIDE.md for code patterns
- Reference API_CONTRACTS.md for APIs
- Update todos with TodoWrite tool
- Test as you go

### 3. Before Submitting
```bash
# Run quality gates
npm run lint
npm run type-check
npm test
npm run build

# Self-review with CODE_REVIEW.md checklist
```

### 4. Submit
- Clean commit messages
- Link to spec or task
- All quality gates passing

---

## Common Scenarios

### Scenario: Creating a New API Endpoint
1. **Read**: API_CONTRACTS.md - Standard response format
2. **Read**: STYLE_GUIDE.md - Error handling, naming conventions
3. **Study**: Find similar endpoint in codebase
4. **Implement**: Match existing patterns
5. **Test**: Write tests for happy and error paths
6. **Document**: Update API_CONTRACTS.md with new endpoint

### Scenario: Building a New Component
1. **Read**: STYLE_GUIDE.md - React patterns, naming
2. **Study**: Find similar component (Glob for `**/components/**/*.tsx`)
3. **Implement**: Match existing structure and patterns
4. **Test**: Component tests with React Testing Library
5. **Document**: JSDoc for complex props

### Scenario: Fixing a Bug
1. **Read**: Spec and .current-task
2. **Understand**: Read surrounding code, find root cause
3. **Fix**: Minimal change, match existing patterns
4. **Test**: Add test that would catch this bug
5. **Document**: Comment explaining WHY the fix works

---

## Philosophy

### Consistency Over Cleverness
It's better to write code that matches the existing codebase than to write "better" code that stands out.

### Patterns Over Innovation
Study existing patterns. Follow them. Don't innovate unless specifically required.

### Quality Over Speed
Take time to read docs, understand context, and write proper tests. Fast code that doesn't work is worthless.

### Spec Compliance First
Never implement features not in the spec without explicit approval.

---

## For AI Agents

### Your Prime Directive
**Write code that is indistinguishable from human-written code**

This means:
- No telltale AI patterns
- Match existing style EXACTLY
- Follow all conventions religiously
- Test thoroughly
- Document clearly

### Success Criteria
A code reviewer should NOT be able to tell:
- [ ] That an AI wrote this code
- [ ] What AI wrote it
- [ ] When it was written

The code should blend seamlessly with the existing codebase.

---

## Questions or Updates?

### To Propose Changes
1. Create a spec documenting the change
2. Get team approval
3. Update relevant standards document
4. Notify all agents and developers

### For Questions
1. Check existing documentation first
2. Study similar code in codebase
3. Ask in team channel

---

## Remember

> **"The best code is code that looks like everything else in the codebase."**

Consistency is king. Standards exist to maintain quality and ensure all code, regardless of who (or what) wrote it, meets the same high bar.
