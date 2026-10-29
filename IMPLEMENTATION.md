# Phase 1 checklist

- [ ] Initialize Next.js, TypeScript, Tailwind, reusable shadcn-style primitives
- [ ] PostgreSQL schema, migrations, indexes, environment template
- [ ] Argon2id authentication, expiring hashed sessions, database rate limits
- [ ] First-login password change and admin account management
- [ ] Private dashboard, categories, task CRUD, search/filter/sort
- [ ] Responsive navigation, mobile quick add, light/dark/system themes
- [ ] Automated checks, responsive verification, setup and backup instructions

Architecture: Next.js App Router with server components and same-origin route handlers;
Zod validation and a server-only Drizzle data layer. Supabase PostgreSQL is the only
required service. No Supabase Auth, browser database credentials, public registration,
email, or paid APIs. Default timezone: Asia/Manila.

Phase 2 (calendar, backlogs, notifications, work logs) and Phase 3 are deferred.
