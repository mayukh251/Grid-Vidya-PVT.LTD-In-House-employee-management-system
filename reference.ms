# Grid Vidya Project Reference

Last updated: 2026-03-03
Workspace: c:\Users\mayuk\Desktop\dev\spline
Project: Grid Vidya - Intelligent Workforce Management System

## 1) Project Snapshot

Grid Vidya is implemented as a Next.js App Router application with JWT auth, Prisma/PostgreSQL, role-based access, attendance tracking, task management, EOD workflow, performance scoring, calendar interactions, leaderboard, and motivational banner controls.

Core identity in code:
- Productivity tracking
- Transparency
- Performance measurement
- Engagement
- Manager insights

## 2) Stack and Installed Packages

- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- TailwindCSS 4
- Prisma 6.16.3 + @prisma/client 6.16.3
- PostgreSQL
- jsonwebtoken
- bcryptjs
- zod
- recharts
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

Key file: package.json

## 3) What Has Been Completed So Far

### Authentication and Access
- JWT login implemented: POST /api/auth/login
- Logout implemented: POST /api/auth/logout
- Session cookie: gv_token
- Middleware protects dashboard + API routes
- Role model in DB and RBAC checks in API handlers
- Manager mode toggle added in header UI

### Attendance
- Sign In / Sign Out endpoint implemented: POST /api/time/clock
- Auto-calculates:
  - hoursWorked
  - lateMinutes
  - overtimeHours
- Daily attendance timeline returned and displayed

### Tasks
- Task listing and creation: GET/POST /api/todos
- Calendar task create: POST /api/calendar/task
- Calendar task update/reassign/status: PATCH /api/calendar/task/[id]
- Task statuses used by app flow: TODO, IN_PROGRESS, DONE
- Due date stored and used for day/week calendar analytics

### EOD Workflow
- EOD create and list: POST/GET /api/eod
- One EOD per employee per date enforced by unique constraint (userId, date)
- Manager review endpoint: PATCH /api/eod/[id]/approve
- Manager comment + rating supported
- EOD comments table and review history supported
- Tasks linked to EOD via snapshot during submission

### Performance Scoring
Implemented formula in lib/workforce.ts:
Performance Score =
(hoursWorked / expectedHours * 40)
+ (taskCompletionPercent / 100 * 40)
+ (managerRating / 5 * 20)

Expected hours/day = 8
Manager rating fallback = 3 when missing

Exposed in:
- GET /api/performance/overview
- GET /api/leaderboard

### Calendar and Motivation
- Weekly calendar endpoint: GET /api/calendar/week
- Day detail endpoint: GET /api/calendar/day
- Monday to Sunday week logic implemented
- Today highlight implemented
- Day status dots implemented:
  - green: good completion/has EOD
  - yellow: partial
  - red: missing EOD
- Day click loads detail panel
- Drag and drop task reassignment implemented with dnd-kit
- Motivations endpoint: GET /api/motivations
- Motivation update endpoint: PUT /api/motivations/[id] (manager/admin)
- Motivational banner under calendar implemented

### Dashboard / Pages
Implemented pages:
- /login
- /dashboard
- /dashboard/projects
- /dashboard/tasks

UI includes:
- Left sidebar (fixed width, icon + text)
- Header (search, new task button, notifications, profile block)
- Workforce dashboard sections:
  - Calendar
  - Company overview
  - Leaderboard
  - Productivity card
  - Task completion card
  - Attendance summary card
  - AI assistant panel
  - Motivational banner under calendar

### Validation, Status Codes, Audit
- Zod validation applied on all implemented API endpoints
- Proper status code handling added (200/201/400/401/403/404/409)
- Audit logging integrated across auth/time/task/eod/calendar/performance/motivation actions

## 4) Database Models (Current)

Defined in prisma/schema.prisma:
- User
- TimeEntry
- Todo
- EodReport
- EodComment
- Motivation
- AuditLog

Enums:
- Role: EMPLOYEE, MANAGER, ADMIN
- TimeEntryType: SIGNIN, SIGNOUT
- TodoStatus: PENDING, IN_PROGRESS, COMPLETED, TODO, DONE
- TodoPriority: LOW, MEDIUM, HIGH, CRITICAL
- TodoOrigin: ASSIGNED, PERSONAL, CALENDAR
- EodStatus: PENDING, APPROVED, REJECTED

Important note:
- TodoStatus contains legacy + current values for migration compatibility.
- App logic currently operates mainly with TODO/IN_PROGRESS/DONE.

## 5) Seed Data and Test Accounts

Seed script: prisma/seed.ts
Creates users, tasks, attendance entries, EOD sample, motivations, audit entries.

Credentials (all use same password):
- admin@gridvidya.local / Pass@123
- manager@gridvidya.local / Pass@123
- employee@gridvidya.local / Pass@123
- analyst@gridvidya.local / Pass@123

## 6) Environment Variables

From .env.example:
- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN

Also validated in lib/env.ts:
- NODE_ENV

## 7) Key Project Structure (High Value Paths)

app/
- api/
  - auth/login/route.ts
  - auth/logout/route.ts
  - time/clock/route.ts
  - todos/route.ts
  - eod/route.ts
  - eod/[id]/approve/route.ts
  - calendar/week/route.ts
  - calendar/day/route.ts
  - calendar/task/route.ts
  - calendar/task/[id]/route.ts
  - performance/overview/route.ts
  - leaderboard/route.ts
  - motivations/route.ts
  - motivations/[id]/route.ts
- dashboard/
  - page.tsx
  - projects/page.tsx
  - tasks/page.tsx
  - layout.tsx
- login/page.tsx
- layout.tsx
- globals.css

components/
- auth/login-form.tsx
- dashboard/header.tsx
- dashboard/sidebar.tsx
- dashboard/manager-mode.ts
- workforce/workforce-dashboard.tsx
- projects/eod-review-board.tsx
- tasks/task-center.tsx

lib/
- auth.ts
- api-auth.ts
- workforce.ts
- validation.ts
- audit.ts
- prisma.ts
- env.ts
- constants.ts

prisma/
- schema.prisma
- seed.ts
- migrations/

## 8) Build and Migration Status

Most recently validated successfully with:
- npm install
- npx prisma generate
- npx prisma migrate dev
- npm run build

Known non-blocking warning previously observed:
- Next.js middleware naming warning (proxy convention notice)

## 9) Known Gaps / Future Work Backlog

### High Priority
- Replace legacy TodoStatus enum values if no longer needed, then cleanup DB + API typing.
- Add websocket/SSE for true real-time online count (currently polling based).
- Add full CRUD for manager-created motivations (currently update existing records).
- Add stronger manager-mode behavior across dashboard data filtering (toggle is present, behavior is partial).
- Add automated tests:
  - unit tests for workforce scoring
  - API contract tests for auth/time/eod/calendar/performance
  - role access tests

### Medium Priority
- Resolve text encoding artifacts in some seeded/UI strings (characters rendered like "â€¢" or "â€").
- Replace placeholder navigation pages (Chats, Documents, Receipts, Settings, Help) with real routes.
- Improve AI assistant panel from static content to actual backend assistant workflow.
- Add optimistic updates and better error surface for drag-and-drop failures.

### Ops and Release
- Add Docker Compose for Postgres + app local bootstrap.
- Add CI pipeline for lint, typecheck, prisma migrate check, build.
- Add production env template and deployment notes.

## 10) Quick Start Commands

- npm install
- npx prisma generate
- npx prisma migrate dev
- npx prisma db seed
- npm run dev

Production check:
- npm run build

## 11) Handoff Note

This file is the single reference for current implementation state and pending work. Update this document after every major change so future implementation stays aligned.
