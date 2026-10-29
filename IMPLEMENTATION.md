# Phase 1 checklist

- [x] Initialize Next.js, TypeScript, Tailwind, reusable shadcn-style primitives
- [x] PostgreSQL schema, migrations, indexes, environment template
- [x] Argon2id authentication, expiring hashed sessions, database rate limits
- [x] First-login password change and admin account management
- [x] Private dashboard, categories, task CRUD, search/filter/sort
- [x] Responsive navigation, mobile quick add, light/dark/system themes
- [x] Automated checks, responsive verification, setup and backup instructions

Architecture: Next.js App Router with server components and same-origin route handlers;
Zod validation and a server-only Drizzle data layer. Supabase PostgreSQL is the only
required service. No Supabase Auth, browser database credentials, public registration,
email, or paid APIs. Default timezone: Asia/Manila.

## Phase 2 checklist

- [x] Calendar, private events, month/week/day/agenda, bounded recurring events
- [x] Backlogs, age/priority/category filters, neglected highlights, activate action
- [x] Persistent notification center, reminders, preferences and browser opt-in
- [x] Daily/weekly/monthly work logs, automatic activity, manual duration entries
- [x] Ownership/security tests, six-width browser checks, build and migration instructions

## Phase 3 checklist

- [x] Kanban with touch drag handles and accessible move controls
- [x] Task notes, tags, subtasks/checklists, recurring tasks and bulk actions
- [x] Dashboard/report charts, date ranges, historical state tracking
- [x] CSV/JSON exports and printable accomplishment reports
- [x] Saved interface preferences, timezone and date-format support
- [x] Security, regression and six-width browser verification; additive migration

Phase 4 remains deferred.

Verification: lint/typecheck/build, 41 automated checks, and 21 Playwright
scenarios at 320/375/430/768/1024/1440px plus landscape and first-login/admin flows.
Phase 3 migration applied to configured Supabase; metadata verification checks thirteen
private tables, RLS enabled, no browser-role access, and four recorded migrations.
No user content was read by verification. Deployment remains deferred.
