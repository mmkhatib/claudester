# CLAUDE.md - AI Assistant Context & Guidelines

This file provides critical context for Claude Code to maintain consistency and prevent drift.

## 🎯 SPEC-DRIVEN DEVELOPMENT APPROACH

### 🔴 CRITICAL: Phase Gate System Active
**We use a four-phase spec-driven development process with approval gates.**

#### Quick Start for New Session
```
1. Check active spec: cat spec/.current-spec
2. Check current task: cat .current-task
3. Verify phase: ls spec/0*/*-approved
4. Continue from last state
```

### Memory-Loaded References (Auto-loaded each session)
@spec/README.md
@spec/WORKFLOW.md
@.current-task

### Primary References (ALWAYS CONSULT IN THIS ORDER)
1. **[spec/](./spec/)** - Active specifications with phase gates
   - Current spec: `spec/.current-spec`
   - Workflow guide: `spec/WORKFLOW.md`
2. **[.current-task](./.current-task)** - Exactly what we're working on NOW
3. **[docs/](./docs/)** - Project requirements and documentation
4. **[planning/](./planning/)** - Long-term roadmap and planning docs

### ⚠️ Phase Gate Rules (MUST FOLLOW)
- **CANNOT** start Design without `.requirements-approved`
- **CANNOT** start Tasks without `.design-approved`
- **CANNOT** implement without `.tasks-approved`
- **MUST** check for approval markers before proceeding
- **MUST** update tracking files after EVERY change

### 🤖 Claude's Context Maintenance Rules (AUTO-UPDATE)
**Claude MUST update this file automatically when:**
1. **After completing ANY task** - Update progress and next actions
2. **When switching specs** - Update current focus
3. **When encountering blockers** - Document what's preventing progress
4. **When phase changes** - Update approval status
5. **At end of each work session** - Summary of what was accomplished
6. **When user gives new priorities** - Update focus areas

### 🔄 SPEC COMPLETION PROTOCOL (MANDATORY)
**Every time a spec is completed, Claude MUST follow this exact sequence:**

1. **FULL TESTING REQUIRED**
   - Test all new functionality for syntax errors
   - Run relevant components to verify no breaking changes
   - Check that all integrations work properly
   - Document any issues or limitations discovered

2. **UPDATE PROGRESS DOCUMENTATION**
   - Update `.current-task` with completion status and summary
   - Update `spec/XXX/README.md` with 100% completion status
   - Create all approval marker files (`.requirements-approved`, `.design-approved`, `.tasks-approved`, `.implementation-complete`)
   - Update `spec/README.md` main status table
   - Update `spec/.current-spec` to point to next priority spec

3. **COMMIT CODE CHANGES**
   - Stage all relevant files (implementation, documentation, status files)
   - Create comprehensive commit message with:
     - Clear title indicating spec completion
     - Bullet-point summary of what was implemented
     - List of new features and capabilities
     - Any breaking changes or important notes
   - Include standard footer: "🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

**Format for updates:**
```markdown
## 🔄 LAST SESSION UPDATE - [DATE]
### What Was Accomplished
- [Specific achievements]

### Current Focus
- **Active Spec**: [ID] - [Name]
- **Phase**: [Requirements/Design/Tasks/Implementation]
- **Status**: [In Progress/Blocked/Approved]

### Immediate Blockers
- [List what's preventing progress]

### Next Session Should
1. [First action]
2. [Second action]
3. [Third action]
```

## 🔄 LAST SESSION UPDATE - 2025-11-16

### What Was Accomplished
- ✅ **Project Setup**: Initial spec-driven development structure
- ✅ **Context System**: Created CLAUDE.md for AI assistant guidelines

### Current Focus
- **Latest Task**: Setting up spec-driven development process
- **Status**: Ready for first specification

### Next Session Should
1. **Create first specification** based on user requirements
2. **Set up testing infrastructure** (unit tests, e2e tests, coverage)
3. **Begin implementation** following TDD approach

---

## 📋 Workflow Rules
1. **ALWAYS** use TodoWrite tool to track tasks
2. **NEVER** implement features not in specs without explicit user request
3. **CHECK** requirements before making changes (prevents drift)
4. **UPDATE** tracking files when completing tasks or finding issues
5. **FOLLOW** design patterns from existing codebase exactly
6. **ASK** before committing code
7. **MAINTAIN** consistency with existing codebase patterns

## 📚 Development Standards (MANDATORY)

### Critical Documents - Read Before Every Task
All AI agents and developers MUST consult these documents before writing code:

1. **[Style Guide](./docs/standards/STYLE_GUIDE.md)** - Code formatting, naming conventions, patterns
   - TypeScript standards
   - React/Next.js patterns
   - File organization
   - Error handling

2. **[API Contracts](./docs/standards/API_CONTRACTS.md)** - API specifications and service interfaces
   - Standard response formats
   - Endpoint documentation
   - Data models (IProject, ISpec, ITask, IAgent)
   - Service interfaces
   - WebSocket events

3. **[Agent Guidelines](./docs/standards/AGENT_GUIDELINES.md)** - AI agent output standards
   - Code generation standards
   - Documentation requirements
   - Communication standards
   - Quality checks
   - Prohibited practices

4. **[Code Review Checklist](./docs/standards/CODE_REVIEW.md)** - Quality gates and review process
   - Automated quality gates (lint, type-check, tests, build)
   - Comprehensive review checklist
   - Common issues and solutions

### Configuration Files
- `.eslintrc.json` - ESLint rules (enforced)
- `.prettierrc.json` - Code formatting (enforced)
- `tsconfig.json` - TypeScript configuration

### Before Writing ANY Code:
```bash
# 1. Read the active spec
cat spec/.current-spec
cat .current-task

# 2. Review relevant standards
cat docs/standards/STYLE_GUIDE.md
cat docs/standards/API_CONTRACTS.md
cat docs/standards/AGENT_GUIDELINES.md

# 3. Study existing similar code
# Use Glob/Grep to find examples

# 4. Run quality checks before committing
npm run lint
npm run type-check
npm test
```

## 🏗️ Current System State

### What's Working
- ✅ Spec-driven development structure
- ✅ Context maintenance system

### What's In Progress
- 🟡 First specification (to be created)
- 🟡 Testing infrastructure setup

### What's Blocked
- None currently

## 🔑 Key Principles
- **Spec Compliance**: Every change must align with specifications
- **Test Coverage**: Maintain high test coverage (aim for 80%+)
- **Simplicity**: Minimize code impact, use existing patterns
- **Security**: No sensitive data in logs, proper authentication
- **Performance**: Check existing patterns for optimization

## Development Commands

```bash
# Add your project-specific commands here
# Example:
# npm run dev          # Start development server
# npm run build        # Build for production
# npm test            # Run tests
# npm run test:coverage # Generate coverage report
```

## Architecture Overview

**[To be defined based on project requirements]**
- **Tech Stack**: [Framework] + [Language] + [Database] + [Key Libraries]
- **Features**: [List main features]
- **Structure**: [Describe routing/architecture]

## File Structure
- `src/`: Main application code
- `tests/`: Test files (unit, integration, e2e)
- `docs/`: Documentation
- `planning/`: Project planning documents
- `spec/`: Specifications

## Development Guidelines

### Core Patterns
- **[Pattern 1]**: Description
- **[Pattern 2]**: Description

### Environment Variables
- See `.env.example` for required configuration

## Security Features
- [List security features]

## Current Features
- [List current features]
