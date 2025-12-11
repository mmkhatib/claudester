# Code Review Checklist & Quality Gates

> **CRITICAL**: All code must pass these quality gates before being merged. Both AI agents and human developers must follow this checklist.

Last Updated: 2025-12-07

---

## Table of Contents
1. [Pre-Review Checklist](#pre-review-checklist)
2. [Automated Quality Gates](#automated-quality-gates)
3. [Code Review Checklist](#code-review-checklist)
4. [Review Process](#review-process)
5. [Common Issues](#common-issues)

---

## Pre-Review Checklist

Before submitting code for review, the author must verify:

### ✅ Self-Review
- [ ] Code has been tested locally
- [ ] All automated checks pass (lint, type-check, tests)
- [ ] Code follows the style guide
- [ ] No debug code or console.logs
- [ ] No commented-out code
- [ ] Commits are clean and well-described

### ✅ Documentation
- [ ] Complex logic has explanatory comments
- [ ] Public APIs have JSDoc comments
- [ ] README or docs updated if needed
- [ ] API contracts updated for new endpoints

### ✅ Testing
- [ ] Unit tests added for new functions
- [ ] Integration tests for new endpoints
- [ ] Edge cases covered
- [ ] Error paths tested

---

## Automated Quality Gates

These gates run automatically and MUST pass before code review:

### Gate 1: Linting
```bash
npm run lint
```

**Must Pass**: No ESLint errors or warnings

**Common Issues**:
- Unused variables
- Missing await keywords
- Inconsistent code style
- Using `any` type

### Gate 2: Type Checking
```bash
npm run type-check
```

**Must Pass**: No TypeScript errors

**Common Issues**:
- Missing type annotations
- Type mismatches
- Using `any` instead of proper types
- Importing types incorrectly

### Gate 3: Tests
```bash
npm test
```

**Must Pass**: All tests pass, minimum 80% coverage

**Common Issues**:
- Breaking existing tests
- Not testing error cases
- Flaky tests
- Low coverage

### Gate 4: Build
```bash
npm run build
```

**Must Pass**: Project builds successfully

**Common Issues**:
- Import errors
- Missing dependencies
- Build configuration issues

---

## Code Review Checklist

### 1. Spec Compliance
- [ ] **Matches Requirements**: Code implements exactly what's in the spec
- [ ] **No Scope Creep**: No additional features added without approval
- [ ] **Phase Gate Compliance**: Proper phase approvals in place
- [ ] **Tracking Updated**: `.current-task` and spec progress updated

### 2. Code Quality

#### Architecture & Design
- [ ] **Follows Existing Patterns**: Matches codebase conventions
- [ ] **Proper Separation**: Logic, UI, and data properly separated
- [ ] **DRY Principle**: No unnecessary code duplication
- [ ] **SOLID Principles**: Code is maintainable and extensible

#### TypeScript
- [ ] **No `any` Types**: All types are explicit (except in test files)
- [ ] **Proper Interfaces**: Data structures use interfaces or types
- [ ] **Type Safety**: No type assertions (`as`) unless necessary
- [ ] **Generics Used**: For reusable, type-safe code

#### Code Style
- [ ] **Naming Conventions**: Follows style guide
  - Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Functions: `camelCase` with verb prefix
  - Components: `PascalCase`
  - Files: `kebab-case.ts/tsx`

- [ ] **File Organization**: Imports ordered correctly
  1. External dependencies
  2. Internal absolute imports
  3. Types
  4. Relative imports

- [ ] **Function Size**: Functions are focused and reasonably sized
- [ ] **Complexity**: No overly complex logic (consider refactoring if cyclomatic complexity > 10)

### 3. Error Handling
- [ ] **Try-Catch Blocks**: All async operations wrapped
- [ ] **Structured Logging**: Errors logged with context
- [ ] **User-Friendly Messages**: Error messages are clear and actionable
- [ ] **No Silent Failures**: All errors either handled or thrown
- [ ] **Validation**: Input validated early

Example:
```typescript
// ✅ GOOD
try {
  const result = await riskyOperation(input);
  return result;
} catch (error) {
  logger.error({ error, input }, 'Operation failed');
  throw new Error('Failed to complete operation. Please try again.');
}

// ❌ BAD
try {
  return await riskyOperation(input);
} catch (e) {
  return null;  // Silent failure!
}
```

### 4. API Design (If Applicable)
- [ ] **Follows API Contracts**: Matches `docs/standards/API_CONTRACTS.md`
- [ ] **Standard Response Format**: Uses `ApiSuccessResponse` or `ApiErrorResponse`
- [ ] **Proper HTTP Status Codes**: 200, 201, 400, 404, 500, etc.
- [ ] **Error Codes**: Uses standardized error codes
- [ ] **Input Validation**: Request bodies and params validated
- [ ] **Authentication**: Proper auth checks in place

### 5. React/Next.js (If Applicable)
- [ ] **Server vs Client Components**: Correct use of `'use client'`
- [ ] **Data Fetching**: Appropriate method for component type
  - Server Components: Direct fetch/DB calls
  - Client Components: Hooks or SWR
- [ ] **Props Typed**: All component props have TypeScript interfaces
- [ ] **Keys on Lists**: Proper keys for mapped elements
- [ ] **No Prop Drilling**: Use context or state management when appropriate

### 6. Database (If Applicable)
- [ ] **Schema Validation**: Mongoose schemas match TypeScript interfaces
- [ ] **Indexes**: Proper indexes for queries
- [ ] **Transactions**: Use transactions for related operations
- [ ] **Error Handling**: Database errors caught and logged
- [ ] **Migrations**: Data migrations documented and tested

### 7. Performance
- [ ] **No Unnecessary Re-renders**: React components optimized
- [ ] **Efficient Queries**: Database queries optimized
- [ ] **Caching**: Appropriate use of caching
- [ ] **Pagination**: Large lists are paginated
- [ ] **Lazy Loading**: Heavy components/routes lazy loaded

### 8. Security
- [ ] **No Secrets in Code**: All secrets in environment variables
- [ ] **Input Sanitization**: User input sanitized
- [ ] **SQL Injection Prevention**: Use parameterized queries
- [ ] **XSS Prevention**: User content escaped
- [ ] **CSRF Protection**: Forms have CSRF tokens (if applicable)
- [ ] **Authentication**: Proper auth checks on protected routes/APIs

### 9. Testing
- [ ] **Unit Tests**: All functions have unit tests
- [ ] **Integration Tests**: API endpoints have integration tests
- [ ] **Edge Cases**: Error paths and edge cases tested
- [ ] **Test Quality**: Tests are clear, focused, and maintainable
- [ ] **Coverage**: Meets 80% minimum coverage target

### 10. Documentation
- [ ] **JSDoc for Complex Functions**: Public APIs documented
- [ ] **Inline Comments**: Complex logic explained
- [ ] **README Updated**: If public-facing changes
- [ ] **API Contracts Updated**: For new endpoints
- [ ] **Changelog**: Breaking changes noted

---

## Review Process

### For Code Authors

1. **Self-Review First**
   - Run through this entire checklist yourself
   - Fix any issues before requesting review
   - Test thoroughly

2. **Prepare for Review**
   - Write clear commit messages
   - Add description to PR
   - Link to relevant spec or task
   - Note any areas needing special attention

3. **Address Feedback**
   - Respond to all comments
   - Make requested changes promptly
   - Explain decisions when declining suggestions

### For Reviewers

1. **Context First**
   - Read the linked spec or task
   - Understand the goal of the changes
   - Check if automated gates passed

2. **Review Systematically**
   - Go through this checklist item by item
   - Leave constructive, specific comments
   - Suggest alternatives, don't just criticize

3. **Focus Areas**
   - **P0 (Critical)**: Security, data loss, breaking changes
   - **P1 (Important)**: Performance, maintainability, code quality
   - **P2 (Nice-to-have)**: Style nitpicks, minor optimizations

4. **Approval Criteria**
   - All automated gates pass
   - No critical (P0) issues
   - Major (P1) issues addressed or have plan
   - Code follows standards and patterns

---

## Common Issues

### Issue: Using `any` Type
**Problem**:
```typescript
function processData(data: any) {
  return data.value.toUpperCase();
}
```

**Solution**:
```typescript
interface DataWithValue {
  value: string;
}

function processData(data: DataWithValue) {
  return data.value.toUpperCase();
}
```

**Why**: Type safety prevents runtime errors and improves code maintainability.

---

### Issue: Silent Error Handling
**Problem**:
```typescript
try {
  await saveToDatabase(data);
} catch (error) {
  // Ignore
}
```

**Solution**:
```typescript
try {
  await saveToDatabase(data);
} catch (error) {
  logger.error({ error, data }, 'Failed to save to database');
  throw new Error('Could not save data. Please try again.');
}
```

**Why**: Silent failures make debugging impossible and hide problems from users.

---

### Issue: No Error Handling
**Problem**:
```typescript
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

**Solution**:
```typescript
async function getUser(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch user');
    throw new Error('Could not load user data');
  }
}
```

**Why**: Network requests can fail. Always handle errors gracefully.

---

### Issue: Inconsistent API Response Format
**Problem**:
```typescript
// Some endpoints return
return { data: user };

// Others return
return { success: true, user: user };

// Others return
return user;
```

**Solution**:
```typescript
// All endpoints return
return {
  success: true,
  data: user
};

// Or for errors
return {
  success: false,
  error: 'User not found',
  code: 'USER_NOT_FOUND'
};
```

**Why**: Consistent format makes client-side code simpler and more reliable.

---

### Issue: No Input Validation
**Problem**:
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await createUser(body);
  return NextResponse.json(user);
}
```

**Solution**:
```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateUserSchema.parse(body);

    const user = await createUser(validated);

    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
        details: error.errors
      }, { status: 400 });
    }

    throw error;
  }
}
```

**Why**: Input validation prevents bugs, security issues, and improves error messages.

---

### Issue: Large Functions
**Problem**:
```typescript
// 200-line function doing everything
async function handleSubmit(data: FormData) {
  // Validation (30 lines)
  // API calls (40 lines)
  // Data transformation (50 lines)
  // State updates (30 lines)
  // Side effects (50 lines)
}
```

**Solution**:
```typescript
async function handleSubmit(data: FormData) {
  const validatedData = validateFormData(data);
  const apiResponse = await submitToApi(validatedData);
  const transformedData = transformResponse(apiResponse);

  updateState(transformedData);
  trackSubmission(transformedData);
}

// Each helper function is focused and testable
function validateFormData(data: FormData) { }
async function submitToApi(data: ValidatedData) { }
function transformResponse(response: ApiResponse) { }
```

**Why**: Smaller, focused functions are easier to test, understand, and maintain.

---

## Quality Gate Summary

| Gate | Command | Must Pass | Coverage |
|------|---------|-----------|----------|
| Lint | `npm run lint` | ✅ Zero errors/warnings | All files |
| Type Check | `npm run type-check` | ✅ Zero TS errors | All files |
| Tests | `npm test` | ✅ All pass | ≥80% |
| Build | `npm run build` | ✅ Successful build | All files |

---

## Final Checklist

Before merging, verify ALL of these:

- [ ] All automated gates pass
- [ ] Code review approved by at least one reviewer
- [ ] All review comments addressed
- [ ] Spec compliance verified
- [ ] Documentation updated
- [ ] Tests added and passing
- [ ] No breaking changes (or properly documented)
- [ ] Commits are clean and descriptive

---

## When in Doubt

**Ask yourself**:
1. Would I be comfortable maintaining this code in 6 months?
2. Could another developer understand this without asking me?
3. Does this follow the patterns used elsewhere in the codebase?
4. Have I tested the unhappy paths?
5. Is this the simplest solution that works?

If any answer is "NO", refine the code before submitting.

---

## Remember

**Code review is not about catching bugs** (that's what tests are for).

**Code review is about**:
- Maintaining code quality and consistency
- Sharing knowledge
- Ensuring maintainability
- Preventing technical debt
- Upholding standards

**Be constructive, be thorough, be collaborative.**
