# Taskflow — Task Logger

Private, multi-user productivity workspace. **Phases 1–3 are implemented.** Next.js App Router,
TypeScript, Tailwind CSS, shadcn-style Radix components, Lucide, Drizzle, PostgreSQL,
and Argon2id, with the node-postgres (`pg`) connection driver. No public registration, OAuth, email, paid APIs, or client database keys.

## Local setup

Requires Node.js 24 LTS and npm. On Windows PowerShell use `npm.cmd` / `npx.cmd` if script execution is disabled.

1. `npm ci`
2. Copy `.env.example` to `.env` (keep it out of Git).
3. Create a free Supabase PostgreSQL project. Copy its connection strings from **Connect**.
   Set `DATABASE_URL` to the transaction pooler URL, usually port 6543. Set
   `DATABASE_MIGRATION_URL` to the direct/session pooler URL, port 5432. URL-encode the password.
   Do not use a Supabase anon key: this app connects from the server using PostgreSQL.
4. Set `APP_URL=http://localhost:3000` and generate `AUTH_SECRET`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. `npm run db:migrate`
6. `npm run admin:setup` — enter a username. A random temporary password is shown once.
   Store it privately. This script refuses to bootstrap another administrator if one exists.
7. `npm run dev` — open http://localhost:3000. Sign in and replace the temporary password.

The setup page is displayed when credentials are absent. It does not create a demo user
or silently substitute a local database. Run `npm run db:verify` to check your connection,
table presence, RLS and browser-role restrictions without reading private content.

If you get `self-signed certificate in certificate chain`, download your project's CA
certificate from Supabase **Database → Settings → SSL Configuration**, save it as
`supabase-ca.crt` in this folder, and run this in each new PowerShell terminal before
starting the app, migrations, verification or admin setup:

```powershell
$env:NODE_EXTRA_CA_CERTS="D:\Github\task-logger\supabase-ca.crt"
```

Keep certificate verification enabled. Adapt the path if your project folder differs.

## Phase 1 features

- Secure username/password portal; persistent login throttling; seven-day, revocable,
  opaque sessions stored as HMAC digests; HttpOnly, SameSite cookies (Secure in production).
- Admin creates, edits, disables, deletes, resets passwords, and assigns roles.
  Password resets/role changes revoke sessions. Accounts must change temporary passwords.
  Account deletion requires an explicit confirmation and cascades private content.
- Administrators manage accounts without being able to browse other users’ tasks.
- Dashboard with clickable totals, new/in-progress/pending/completed, overdue, backlog,
  urgent tasks, completion indicator, today’s schedule and recent task activity.
- Task CRUD: title, description, category, six statuses, four priorities, start/due times,
  backlog flag, timestamps. Completion/reopening maintains the completion timestamp.
- Private category CRUD, server-side search/filters/sort, 30-task pagination.
- Mobile task cards, desktop table, collapsible sidebar, accessible mobile drawer,
  floating quick-add, scrollable keyboard-accessible dialogs, toasts and loading/error states.
- Light/Dark/System themes saved to the account; sidebar collapse is persisted per device.
- Default timezone is **Asia/Manila**. Account timezone and date format are configurable.

## Phase 2 features

- **Calendar:** month grid, week/day agenda and 30-day agenda; compact agenda below
  the month on phones. Shows scheduled tasks and deadlines, plus private meetings,
  occasions and events. Click entries for details/editing. Categories supply colors.
- **Events:** create/edit/delete, timed/all-day, descriptions, locations, custom colors,
  optional daily/weekly/monthly recurrence and repeat-until date. All-day end dates
  are inclusive in the editor and stored as exclusive next-midnight timestamps.
  Changes/deletions apply to the entire series. Monthly series skip nonexistent dates.
- **Backlogs:** unscheduled or explicitly flagged unfinished tasks; priority ordering,
  category/priority/age filters, age since creation and untouched-for-14-days highlights.
  Make active sets a start date, removes the flag and moves the task to In Progress.
  Existing overdue deadlines are preserved. Completed/cancelled tasks are excluded.
- **Notifications:** stored, deduplicated deadline/overdue/event/critical/backlog alerts,
  unread badge, read/unread controls, mark-all-read and paginated history. Settings
  control alert types, lead time and backlog threshold. History reflects alert generation
  time; linked tasks/events show current status. History expires after 90 days.
- **Browser alerts:** explicit opt-in per browser through Settings. A service worker
  displays page-triggered alerts on supported devices; there are no push subscriptions
  or offline caches. Permission and support vary by browser. HTTPS or localhost is required.
  The app checks reminders about once a minute while visible, with a 30-second server
  throttle. Notifications are **not guaranteed while the app/browser is closed**.
  Each check scans at most 100 tasks per alert type and 200 event series to bound free-tier usage.
- **Work logs:** chronological automatic task/event activity and private manual entries,
  optional duration (0–1440 minutes), daily/weekly/monthly views, search/type filters
  and pagination. Weeks start Sunday. Only manual entries can be edited/deleted.
  Completion totals count tasks currently marked completed within the selected period.

Calendar responses are limited to 500 task/event sources each and 2,000 occurrences.
Details are transmitted once per source; choose a shorter view when a limit is reached.

## Phase 3 features

- **Kanban:** six status columns with touch/pointer drag handles, keyboard sensors and
  native status selectors as an accessible alternative. Swipe the board horizontally on
  phones. Search and priority filters; up to 50 cards per status, with full matching counts.
- **Task details:** private notes, up to 20 normalized tags, up to 40 subtasks/checklist
  items, checked progress, and recent activity. Tags, items and task history load when opened.
  List search supports an exact tag filter. Requests are capped at 64 KiB.
- **Bulk actions:** choose tasks on the current list page and change status, priority,
  backlog flag or delete with confirmation. Up to 50 IDs per atomic request; any foreign
  ID aborts the entire operation. Status-only actions do not overwrite unrelated details.
- **Recurring tasks:** daily, weekly or monthly, with an optional final date. Completing
  one instance creates one next scheduled instance, copies notes/tags/items, and resets
  checked progress. A unique series/occurrence key prevents duplicate scheduled copies.
  Monthly schedules retain the original anchor and skip absent dates; nonexistent
  daylight-saving wall times are skipped. There is no background recurrence scheduler.
  A missed instance remains overdue until handled. Editing dates/rule/timezone starts
  a new series from that instance; already-created instances are not modified or removed.
- **Analytics:** lazy-loaded Recharts dashboard and report charts with accessible data
  tables. Daily/weekly/monthly completion grouping, status/category/priority distribution,
  overdue/backlog state trends and completion rates. Current day is a partial period.
- **Reports:** custom ranges up to 366 days, daily/weekly/monthly shortcuts, up to 500
  accomplishment rows and a print stylesheet. Report grouping weeks start Monday;
  calendar/work-log weeks start Sunday and are labeled separately.
- **Exports:** CSV/JSON for accomplishments, tasks created in the chosen range (including
  notes/tags/items), or work logs in range; up to 10,000 records per request. Downloads are
  private and never include credentials or session data. CSV escapes formula prefixes.
- **Preferences:** server-side Light/Dark/System theme, IANA timezone, date format and
  default task view. Task/event series retain their own scheduling timezone; calendar
  display, reports and logs use the viewer's saved timezone. Local input rejects invalid
  spring-forward times; ambiguous fall-back times follow date-fns-tz's default resolution.

Historical trends use private task state snapshots recorded at mutations. The Phase 3
migration captures a single baseline of existing tasks; **earlier states are not invented**.
Pre-migration completion history can include only tasks still completed at migration time.
Later completion/deletion records remain in the user's history after the task is removed.
Account deletion cascades that history. Completion totals count completion events,
including re-completions; created-task completion rates use current statuses of tasks
created in the range, excluding cancelled tasks. Trend rates use all tracked tasks at
period end. The report explains these denominators next to its controls.

Production audit, broader performance testing and deployment remain Phase 4.

## Updating an existing workspace

Keep your existing `.env`, database and administrator. In a terminal with the CA
certificate configured, run `npm ci`, then `npm run db:migrate` and `npm run db:verify`.
Restart `npm run dev` and refresh the browser. **Do not bootstrap another admin.**
Additive migrations create event/reminder/detail/preferences/history tables and extend
tasks/activity logs; existing tasks/accounts are kept. The driver changed to `pg` to avoid the concurrent
query-pipelining issue documented for postgres.js with transaction poolers.
Runtime queries use unnamed statements and a small connection pool.

## Commands and verification

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run db:verify
npx playwright install chromium
npm run test:e2e
npm audit
```

Unit/integration tests execute the actual route handlers against in-memory PGlite PostgreSQL,
with request-cookie adapters mocked. They cover session lifecycle, password gates, rate limits,
CSRF, role/ownership boundaries, category foreign keys, task activity and RLS configuration.

Browser tests start a disposable loopback-only database on port 55439 and Next.js on port 3100. No Supabase credentials or existing database are used. Chromium checks login,
dashboard, task create/edit/delete, navigation, settings, themes and overflow at
**320, 375, 430, 768, 1024 and 1440px**, plus landscape, first-login and admin flows.
The Phase 2 browser scenarios also exercise event recurrence/CRUD, backlog activation,
notification read state/preferences, manual work-log CRUD and weekly/monthly views at
all six widths. The test server uses `.next-e2e` so it can coexist with the normal dev server.
Phase 3 scenarios cover notes/tags/checklists, recurring completions, Kanban moves,
bulk changes, reports/charts, real file downloads, print styles and saved preferences.
The PGlite TCP bridge is development-only and must never be exposed on a public interface.
Test passwords belong only to this disposable database.

## Database and security

- `src/db/schema.ts`: normalized users, sessions, rate limits, categories, tasks, activity,
  events, notifications, reminder/interface preferences, task items/tags and task history;
  foreign keys, checks and indexes. Category/task ownership is also a composite foreign key.
- `drizzle/`: generated schema migration plus a reviewed security migration. Use
  `db:generate` after schema changes; review SQL before `db:migrate`. Do not use `db:push`
  against production: the security migration contains explicit grants/RLS restrictions.
- Every private read and mutation authenticates and scopes ownership on the server.
  No Supabase Auth policies are used. RLS without public policies and explicit revoked
  privileges deny browser Data API access. The server uses the owner database connection;
  this makes server authorization essential. Never expose that connection to a browser.
- Zod validates inputs; Drizzle parameterizes queries; React escapes text. Mutations require
  an exact `Origin` matching `APP_URL`. No CORS allowances or public registration endpoints.
- Argon2id uses 19 MiB memory, two iterations, one lane. Passwords are never returned by APIs.
- Login limits: eight attempts per normalized account per 15-minute window, plus 200 shared
  attempts unless a trusted IP header is configured (then 60/IP). Only configure
  `TRUSTED_IP_HEADER` if your hosting proxy **overwrites** it and prevents direct origin access.
  Shared limits deliberately protect installs without a trusted client-IP source.
- Sessions expire after seven days. Logout removes the current session; resets, disabling,
  account deletion, and password changes revoke existing sessions. Expired sessions/limits
  are cleaned after successful logins. Periodic SQL cleanup can be added later.
- Security headers deny framing, object embedding and camera/microphone access.
  CSP allows inline scripts/styles required by the current Next.js/theme setup. A nonce-based
  CSP and a full production security/performance audit are planned for Phase 4.
- Activity stores text, timestamps, entry type and optional duration. Consider a retention policy as usage grows.

## Free-tier deployment preparation

Deploy this Node.js application to a host supporting Next.js route handlers and the native
Argon2 package (Node runtime, **not Edge/static export**). Use Supabase’s free database tier;
check current provider quotas and acceptable-use rules before selecting hosting.
Set the environment variables on the host and use your exact HTTPS origin for `APP_URL`.
Production database connections verify TLS. Do not disable certificate verification.
Apply migrations and bootstrap admin from a trusted local terminal. Use separate staging
and production databases and rotate leaked credentials immediately.

`npm run build` then `npm start` starts production mode. HTTPS is required for Secure session
cookies. `DB_POOL_MAX` defaults to 3, capped at 5; reduce to 1–2 if your connection budget requires it.
The `pg` driver uses unnamed statements compatible with transaction poolers. No cron or storage bucket is required.
Deployment has not been performed by this implementation.

## Backup and recovery

Use PostgreSQL’s free command-line utilities with the **direct/session** connection string:

```text
pg_dump --dbname="<DIRECT_CONNECTION_URL>" --format=custom --no-owner --no-acl --file=taskflow-backup.dump
pg_restore --dbname="<NEW_EMPTY_DATABASE_URL>" --no-owner --no-acl taskflow-backup.dump
```

Store backups encrypted and outside the repository. They contain usernames, password hashes,
private tasks and session digests. Do not put credentials in committed scripts or shared shell
history. Restore to a new disposable database first; verify account/task counts and test login.
After restoring, run `DELETE FROM sessions;` to invalidate restored sessions, and reapply the
RLS/grant restrictions because ACLs were excluded. On Supabase, revoke browser-role grants
on all thirteen private tables before serving the restored database:

```sql
REVOKE ALL ON users, sessions, login_limits, tasks, categories, activity,
  events, notification_preferences, notifications, interface_preferences,
  task_items, task_tags, task_history FROM PUBLIC, anon, authenticated;
```

Run `npm run db:verify` after restoring. Do not rerun the full Phase 2 creation migration
as a permissions repair on an already restored schema.
Use the same `AUTH_SECRET` only when intentionally preserving rate-limit HMACs; rotating it
also invalidates all sessions. Application CSV/JSON exports are available in Reports;
they complement full database backups and do not replace them.

Architecture follows [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
and [Drizzle’s PostgreSQL integration](https://orm.drizzle.team/docs/get-started-postgresql).
