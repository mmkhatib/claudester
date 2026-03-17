# Claudester Platform

**AI-Powered Autonomous Development Platform**

Claudester transforms business requirements into working software through autonomous, spec-driven development powered by Claude AI.

## Overview

Claudester enables non-technical stakeholders (product managers, business users) to input requirements and receive fully tested, production-ready software without manual development intervention. The platform uses Claude AI agents to autonomously implement features following a rigorous spec-driven development methodology.

### Key Features

- 🤖 **Fully Autonomous Development** - Claude AI agents work independently without approval for individual commands
- 📋 **Spec-Driven Methodology** - Four-phase approval process (Requirements → Design → Tasks → Implementation)
- 👀 **Real-Time Monitoring** - Watch code being written live as agents work
- 🧪 **Integrated Testing** - Automated test generation, execution, and coverage tracking
- 🎯 **Business-Friendly UI** - Plain English interface with optional technical view
- 🔄 **Multi-Agent Orchestration** - Parallel task execution with intelligent dependency management
- ✅ **Phase Gate Approval** - Stakeholder review and approval at each phase
- 🔒 **Spec Dependency Enforcement** - Specs are hard-blocked (UI + API) until all dependency specs are complete; tasks are blocked until their prerequisite tasks finish; specs auto-complete when all tasks are done

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                    Claudester Platform                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Next.js 14)                                  │
│  ├─ Dashboard                                           │
│  ├─ Spec Management                                     │
│  ├─ Real-Time Monitoring                                │
│  └─ Testing Interface                                   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Backend (Node.js 20)                                   │
│  ├─ REST API (Next.js API Routes)                       │
│  ├─ WebSocket Server (Socket.io)                        │
│  ├─ Spec Engine (Claude API Integration)                │
│  └─ Agent Pool Manager                                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Agent System (Child Processes)                         │
│  ├─ Task Queue (Bull + Redis)                           │
│  ├─ Parallel Agent Execution                            │
│  ├─ Workspace Isolation                                 │
│  └─ Progress Event Publishing                           │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Data Layer                                             │
│  ├─ MongoDB (Mongoose)                                  │
│  ├─ Redis (Queue + Pub/Sub)                             │
│  └─ File Storage (Local/S3)                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (State Management)
- Socket.io Client (Real-time)

**Backend**
- Node.js 20
- TypeScript
- Next.js API Routes
- Socket.io Server
- Bull (Task Queue)
- Mongoose (MongoDB ODM)

**Infrastructure**
- MongoDB 7
- Redis 7
- Claude API (Anthropic)
- Clerk (Authentication)

**Testing**
- Vitest (Unit Tests)
- React Testing Library
- V8 Coverage Provider

## Project Status

**Current Phase**: Phase 10 - Polish & Deployment
**Progress**: 90% (Implementation Complete)
**Next**: Production Deployment

### Completed Phases

- ✅ Phase 1: Foundation & Setup (Completed 2025-11-16)
- ✅ Phase 2: Database & Authentication (Completed 2025-11-16)
- ✅ Phase 3: Backend API (Completed 2025-11-16)
- ✅ Phase 4: Agent System (Completed 2025-11-16)
- ✅ Phase 5: Spec Engine (Completed 2025-11-16)
- ✅ Phase 6: Frontend - Core UI (Completed 2025-11-16)
- ✅ Phase 7: Frontend - Real-Time Features (Completed 2025-11-17)
- ✅ Phase 8: Testing Interface (Completed 2025-11-17)
- ✅ Phase 9: Testing & Quality Assurance (Completed 2025-11-17)
- 🔄 Phase 10: Polish & Deployment (In Progress)

### Implementation Stats

- **28 Tests Passing** - Comprehensive test coverage for UI components and utilities
- **67 Tasks Completed** across 10 phases
- **Full-Stack Implementation** - Frontend + Backend + AI Agents
- **Real-Time Features** - WebSocket-powered live monitoring
- **Spec Dependency Enforcement** - AI-analyzed layers, hard-blocked execution, auto-completion

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7+
- Redis 7+
- Anthropic API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/mmkhatib/claudester.git
cd claudester

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start MongoDB and Redis (if using local instances)
# Via Docker:
# docker run -d -p 27017:27017 --name mongodb mongo:latest
# docker run -d -p 6379:6379 --name redis redis:latest

# Or use cloud services:
# - MongoDB Atlas: https://cloud.mongodb.com
# - Redis Cloud: https://redis.com/cloud

# Run database migrations (if needed)
# npm run db:migrate

# Build agent TypeScript files
npm run build:agents

# Run development server
npm run dev

# Access the application
# - Demo mode (no auth): http://localhost:3000/demo
# - Full app (requires Clerk): http://localhost:3000
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=your_claude_api_key
MONGODB_URI=mongodb://localhost:27017/claudester
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Optional
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How It Works

### 1. Requirements Input

Business users describe what they want to build in plain English:

```
"I need a user authentication system with email/password login,
OAuth integration (Google, GitHub), password reset functionality,
and role-based access control for Admin, User, and Guest roles."
```

### 2. Spec Generation

Claudester uses Claude AI to analyze requirements and generate:
- Detailed requirements document
- Technical design specification
- Implementation task breakdown with estimates

### 3. Phase Approval

Stakeholders review and approve each phase:
- ✅ Requirements Phase
- ✅ Design Phase
- ✅ Tasks Phase

### 4. Autonomous Development

Once tasks are approved, Claude AI agents:
- Execute tasks in parallel based on dependencies
- Write code following TDD principles
- Run automated tests
- Make git commits
- Handle errors and retries automatically

### 5. Real-Time Monitoring

Watch development happen live:
- See code being written in real-time
- Monitor test execution and results
- Track task progress
- View git commits as they happen

### 6. Testing & Validation

Test the built features:
- Automated test results
- Code coverage visualization
- Live preview of built features
- Manual testing guides
- Issue reporting (auto-creates bug fix specs)

## Development Workflow

### Spec-Driven Development Process

```
1. Create Spec
   ↓
2. Requirements Phase → Approve
   ↓
3. Design Phase → Approve
   ↓
4. Tasks Phase → Approve
   ↓
5. Click "Start Development"
   ↓
6. Agents Execute Tasks Autonomously
   ↓
7. Monitor Progress in Real-Time
   ↓
8. Test & Validate Built Features
   ↓
9. Mark Complete or Report Issues
```

### Phase Gates

The platform enforces phase gates to ensure quality:
- ❌ Cannot skip phases
- ✅ Each phase requires explicit approval
- ⚠️ Major changes require re-approval

## Key Concepts

### Multi-Agent Orchestration

Claudester spawns multiple Claude AI agents as Node.js child processes:
- **Parallel Execution**: Multiple agents work on independent tasks simultaneously
- **Dependency Management**: Agents wait for prerequisite tasks to complete
- **Workspace Isolation**: Each spec gets its own workspace directory
- **Resource Management**: Configurable limits (max 5 concurrent agents by default)

### Real-Time Communication

WebSocket-based real-time updates:
- Agent status changes
- Code updates (see code being typed)
- Test results streaming
- Task progress updates
- Git commits

### Test-Driven Development

All agents follow TDD principles:
1. Write tests first
2. Implement functionality
3. Ensure all tests pass
4. Commit changes

## Project Structure

```
claudester/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── specs/             # Spec management
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utility functions
├── backend/               # Backend services
│   ├── models/           # Mongoose models
│   ├── services/         # Business logic
│   ├── queues/           # Bull queue processors
│   └── websocket/        # Socket.io server
├── public/               # Static assets
├── spec/                 # Spec documents (gitignored)
├── mockups/              # UI mockups (gitignored)
└── .claude/              # Claude Code config (gitignored)
```

## Documentation

- **Requirements**: `spec/002-claudester-platform/requirements.md` (local)
- **Design**: `spec/002-claudester-platform/design.md` (local)
- **Tasks**: `spec/002-claudester-platform/tasks.md` (local)
- **UI Mockups**: `mockups/` (local)

> Note: Spec documents are kept local for development and not committed to git.

## Contributing

This project follows a spec-driven development methodology. All changes should:
1. Create a spec in the `spec/` directory
2. Follow the four-phase approval process
3. Implement according to approved tasks
4. Maintain test coverage >80%

## Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Project setup
- Database & Redis configuration
- Authentication integration
- Base UI components

### Phase 2: Core Backend (Weeks 3-5)
- API endpoints
- Spec Engine (Claude integration)
- Task queue system
- WebSocket server

### Phase 3: Agent System (Weeks 6-8)
- Agent pool manager
- Workspace management
- Task execution
- Progress tracking

### Phase 4-6: Frontend & Testing (Weeks 9-12)
- Dashboard & spec management
- Real-time monitoring UI
- Testing interface

### Phase 7-8: Testing & Deployment (Weeks 13-15)
- Comprehensive test suite
- Performance optimization
- Production deployment

## License

[To be determined]

## Contact

- **Project Owner**: Mostafa Elkhatib
- **Repository**: https://github.com/mmkhatib/claudester

---

**Status**: Implementation Complete - Ready for Deployment
**Last Updated**: 2026-03-16

## Features Implemented

### ✅ Core Platform
- Project and spec management
- Real-time agent monitoring
- Task queue system with Bull
- WebSocket server for live updates
- Authentication (Clerk) with demo mode
- Spec dependency analysis (AI-powered, auto-runs on generation)
- Spec layer grouping (Foundation / Recommended / Optional) with priority tiers (P0–P3)
- Hard-enforced spec dependency blocking — UI + API level
- Task-level dependency blocking with per-task lock indicators
- Specs auto-complete when all their tasks finish

### ✅ Frontend
- Dashboard with stats and activity
- Projects, Specs, Tasks, Agents pages
- Real-time monitoring dashboard
- Comprehensive testing interface
- Dark mode support
- Responsive design

### ✅ Backend
- REST API endpoints
- MongoDB integration
- Redis pub/sub
- Agent pool manager
- Spec processor
- Task queue system

### ✅ Testing
- 28 comprehensive tests
- Vitest setup with jsdom
- Coverage reporting (V8)
- Component and utility tests

## Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x450?text=Dashboard+Screenshot)

### Real-Time Monitor
![Monitor](https://via.placeholder.com/800x450?text=Monitor+Screenshot)

### Testing Interface
![Testing](https://via.placeholder.com/800x450?text=Testing+Screenshot)
