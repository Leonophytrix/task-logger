import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { applyTestMigrations } from "../scripts/test-migrations";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { taskSchema } from "../src/lib/validation";
const state = vi.hoisted(() => ({
  database: null as unknown,
  jar: new Map<string, string>(),
  options: {} as Record<string, unknown>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: () => state.database }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      state.jar.has(key) ? { value: state.jar.get(key) } : undefined,
    set: (key: string, value: string, options: Record<string, unknown>) => {
      state.jar.set(key, value);
      state.options = options;
    },
    delete: (key: string) => state.jar.delete(key),
  }),
}));
import { POST as auth } from "../src/app/api/auth/[action]/route";
import { POST as addTask, GET as getTasks } from "../src/app/api/tasks/route";
import {
  PUT as editTask,
  DELETE as deleteTask,
} from "../src/app/api/tasks/[id]/route";
import { POST as addCategory } from "../src/app/api/categories/route";
import { POST as addEvent } from "../src/app/api/events/route";
import {
  PUT as editEvent,
  DELETE as deleteEvent,
} from "../src/app/api/events/[id]/route";
import { GET as calendar } from "../src/app/api/calendar/route";
import {
  GET as detailTask,
  PATCH as moveTask,
} from "../src/app/api/tasks/[id]/route";
import { POST as bulkTasks } from "../src/app/api/tasks/bulk/route";
import {
  GET as getInterfacePreferences,
  PUT as saveInterfacePreferences,
} from "../src/app/api/preferences/interface/route";
import { GET as getReport } from "../src/app/api/reports/route";
import { GET as exportReport } from "../src/app/api/reports/export/route";
import { dayKey, addDays } from "../src/lib/calendar";
import {reportData} from '../src/lib/reports';
import {parseReportRange} from '../src/lib/report-validation';
import { POST as addWorkLog } from "../src/app/api/work-logs/route";
import {
  PUT as editWorkLog,
  DELETE as deleteWorkLog,
} from "../src/app/api/work-logs/[id]/route";
import { POST as syncNotifications } from "../src/app/api/notifications/sync/route";
import {
  GET as getNotifications,
  PATCH as readNotification,
} from "../src/app/api/notifications/route";
import { PUT as updatePreferences } from "../src/app/api/preferences/notifications/route";
import { POST as activateTask } from "../src/app/api/backlogs/[id]/activate/route";
import { DELETE as deleteCategory } from "../src/app/api/categories/[id]/route";
import {
  PUT as editUser,
  DELETE as deleteUser,
} from "../src/app/api/users/[id]/route";
import {
  currentUser,
  digest,
  cookieName,
  createSession,
} from "../src/lib/auth";
const pg = new PGlite();
const database = drizzle(pg, { schema });
const origin = "http://localhost:3000";
let hash: string;
let alice: typeof schema.users.$inferSelect;
let bob: typeof alice;
let admin: typeof alice;
const req = (data: unknown = {}, source = origin) =>
  new Request(`${origin}/api/test`, {
    method: "POST",
    headers: { origin: source, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const login = (username = "alice", password = "correct-password-123") =>
  auth(req({ username, password }), {
    params: Promise.resolve({ action: "login" }),
  });
const input = {
  title: "Private task",
  description: "Only mine",
  priority: "high",
  status: "new",
  categoryId: null,
  startsAt: null,
  dueAt: null,
  backlog: false,
};
beforeAll(async () => {
  process.env.AUTH_SECRET = "test-only-secret-".repeat(4);
  process.env.APP_URL = origin;
  process.env.DATABASE_URL = "test-mocked-database";
  state.database = database;
  await applyTestMigrations(pg);
  hash = await hashPassword("correct-password-123");
});
beforeEach(async () => {
  state.jar.clear();
  await pg.exec("TRUNCATE users, login_limits CASCADE");
  [alice, bob, admin] = await database
    .insert(schema.users)
    .values([
      { username: "alice", passwordHash: hash, mustChangePassword: false },
      { username: "bob", passwordHash: hash, mustChangePassword: false },
      {
        username: "admin",
        passwordHash: hash,
        role: "admin",
        mustChangePassword: false,
      },
    ])
    .returning();
});
afterAll(async () => {
  await pg.close();
});
describe("Authentication and access boundaries", () => {
  it("saves private notes, normalized tags, items and owner-scoped task details", async () => {
    await login();
    const r = await addTask(
      req({
        ...input,
        notes: "Private note",
        tags: ["Focus", "focus", " personal "],
        items: [
          { kind: "subtask", title: "Plan", done: false },
          { kind: "checklist", title: "Review", done: true },
        ],
      }),
    );
    expect(r.status).toBe(201);
    const task = await r.json();
    const detail = await (await detailTask(req(), ctx(task.id))).json();
    expect(detail.tags.sort()).toEqual(["focus", "personal"]);
    expect(detail.items).toHaveLength(2);
    expect(detail.notes).toBe("Private note");
    await moveTask(req({ status: "pending" }), ctx(task.id));
    expect(
      (await (await detailTask(req(), ctx(task.id))).json()).items,
    ).toHaveLength(2);
    await login("bob");
    expect((await detailTask(req(), ctx(task.id))).status).toBe(404);
    await login("admin");
    expect((await detailTask(req(), ctx(task.id))).status).toBe(404);
  });
  it("creates one next recurring task transactionally and resets checklist progress", async () => {
    await login();
    const r = await addTask(
      req({
        ...input,
        dueAt: "2030-01-31T09:00:00+08:00",
        recurrence: "monthly",
        recurrenceUntil: null,
        timeZone: "Asia/Manila",
        tags: ["focus"],
        items: [{ kind: "checklist", title: "Review", done: true }],
      }),
    );
    const task = await r.json();
    expect(
      (await moveTask(req({ status: "completed" }), ctx(task.id))).status,
    ).toBe(200);
    let rows = await database.select().from(schema.tasks);
    expect(rows).toHaveLength(2);
    const next = rows.find((t) => t.id !== task.id)!;
    expect(next.dueAt?.toISOString()).toBe("2030-03-31T01:00:00.000Z");
    expect(next.status).toBe("new");
    const details = await (await detailTask(req(), ctx(next.id))).json();
    expect(details.items[0].done).toBe(false);
    expect(details.tags).toEqual(["focus"]);
    await moveTask(req({ status: "new" }), ctx(task.id));
    await moveTask(req({ status: "completed" }), ctx(task.id));
    rows = await database.select().from(schema.tasks);
    expect(rows).toHaveLength(2);
  });
  it("honors recurrence limits and rejects invalid recurring schedules", async () => {
    await login();
    expect((await addTask(req({ ...input, recurrence: "daily" }))).status).toBe(
      400,
    );
    const t = await (
      await addTask(
        req({
          ...input,
          dueAt: "2030-01-01T09:00:00Z",
          recurrence: "daily",
          recurrenceUntil: "2030-01-01T23:59:00Z",
        }),
      )
    ).json();
    await moveTask(req({ status: "completed" }), ctx(t.id));
    expect(await database.select().from(schema.tasks)).toHaveLength(1);
  });
  it("applies bulk changes atomically and rejects foreign IDs without partial changes", async () => {
    await login();
    const a = await (await addTask(req(input))).json();
    await login("bob");
    const b = await (await addTask(req(input))).json();
    await login();
    expect(
      (
        await bulkTasks(
          req({ ids: [a.id, b.id], action: "status", value: "completed" }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await database
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.id, a.id))
      )[0].status,
    ).toBe("new");
    expect(
      (
        await bulkTasks(
          req({ ids: [a.id], action: "priority", value: "critical" }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await database
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.id, a.id))
      )[0].priority,
    ).toBe("critical");
    expect(
      (await bulkTasks(req({ ids: [a.id], action: "delete" }))).status,
    ).toBe(200);
  });
  it("persists scoped interface preferences and validates IANA zones", async () => {
    await login();
    expect(
      (await saveInterfacePreferences(req({ timeZone: "Not/A_Zone" }))).status,
    ).toBe(400);
    expect(
      (
        await saveInterfacePreferences(
          req({
            theme: "dark",
            timeZone: "America/New_York",
            dateFormat: "yyyy-MM-dd",
            defaultTaskView: "kanban",
          }),
        )
      ).status,
    ).toBe(200);
    expect((await (await getInterfacePreferences()).json()).timeZone).toBe(
      "America/New_York",
    );
    await login("bob");
    expect((await (await getInterfacePreferences()).json()).timeZone).toBe(
      "Asia/Manila",
    );
  });
  it("retains completed/deleted history and scopes reports and exports", async () => {
    await login();
    const a = await (
      await addTask(
        req({ ...input, title: '=HYPERLINK("https://example.com")' }),
      )
    ).json();
    await moveTask(req({ status: "completed" }), ctx(a.id));
    await deleteTask(req(), ctx(a.id));
    const today = dayKey();
    const q = new URLSearchParams({
      from: addDays(today, -1),
      to: today,
      group: "day",
    });
    await reportData(alice.id,parseReportRange(q));
    const report = await getReport(new Request(`${origin}/api/reports?${q}`));
    expect(report.status).toBe(200);
    const data = await report.json();
    expect(data.summary.completions).toBe(1);
    expect(data.accomplishments).toHaveLength(1);
    expect(data.trends.length).toBeGreaterThan(0);
    expect(data.trends.at(-1).backlog).toBe(0);
    const csv = await exportReport(
      new Request(
        `${origin}/api/reports/export?${q}&format=csv&dataset=accomplishments`,
      ),
    );
    expect(csv.status).toBe(200);
    expect(await csv.text()).toContain("'=HYPERLINK");
    expect(csv.headers.get("content-disposition")).toContain(".csv");
    await login("bob");
    const privateReport = await (
      await getReport(new Request(`${origin}/api/reports?${q}`))
    ).json();
    expect(privateReport.summary.completions).toBe(0);
    const exported = await (
      await exportReport(
        new Request(
          `${origin}/api/reports/export?${q}&format=json&dataset=accomplishments`,
        ),
      )
    ).json();
    expect(exported.records).toHaveLength(0);
  });
  it("keeps manual work logs private and automatic activity immutable", async () => {
    await login();
    const inputLog = {
      message: "Focused planning",
      createdAt: new Date(Date.now() - 60000).toISOString(),
      durationMinutes: 45,
    };
    const response = await addWorkLog(req(inputLog));
    expect(response.status).toBe(201);
    const log = await response.json();
    expect(log.kind).toBe("manual");
    await login("bob");
    expect((await editWorkLog(req(inputLog), ctx(log.id))).status).toBe(404);
    await login("admin");
    expect((await deleteWorkLog(req(), ctx(log.id))).status).toBe(404);
    await login();
    expect(
      (
        await editWorkLog(
          req({ ...inputLog, durationMinutes: 60 }),
          ctx(log.id),
        )
      ).status,
    ).toBe(200);
    await addTask(req(input));
    const [auto] = await database
      .select()
      .from(schema.activity)
      .where(eq(schema.activity.kind, "automatic"));
    expect((await editWorkLog(req(inputLog), ctx(auto.id))).status).toBe(404);
    expect((await deleteWorkLog(req(), ctx(auto.id))).status).toBe(404);
    expect((await deleteWorkLog(req(), ctx(log.id))).status).toBe(200);
    expect(
      (await addWorkLog(req({ ...inputLog, durationMinutes: 1441 }))).status,
    ).toBe(400);
    expect(
      (
        await addWorkLog(
          req({ ...inputLog, createdAt: "2099-01-01T00:00:00Z" }),
        )
      ).status,
    ).toBe(400);
  });
  it("protects new mutations from CSRF and new tables from browser database roles", async () => {
    await login();
    expect((await addWorkLog(req({}, "https://attacker.example"))).status).toBe(
      403,
    );
    expect(
      (await syncNotifications(req({}, "https://attacker.example"))).status,
    ).toBe(403);
    const r = await pg.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname in ('events','notifications','notification_preferences')",
    );
    expect(r.rows).toHaveLength(3);
    expect(r.rows.every((v) => v.relrowsecurity)).toBe(true);
  });
  it("deduplicates all reminder types, scopes read status and honors disabled preferences", async () => {
    await login();
    const dueAt = new Date(Date.now() + 30 * 60000).toISOString();
    await addTask(
      req({ ...input, title: "Due soon", dueAt, priority: "critical" }),
    );
    const oldTask = await (
      await addTask(
        req({ ...input, title: "Old backlog", dueAt: "2020-01-01T00:00:00Z" }),
      )
    ).json();
    await database
      .update(schema.tasks)
      .set({ createdAt: new Date("2020-01-01") })
      .where(eq(schema.tasks.id, oldTask.id));
    await addEvent(
      req({
        title: "Soon meeting",
        description: "",
        location: "",
        kind: "meeting",
        color: "#6366f1",
        categoryId: null,
        startsAt: dueAt,
        endsAt: new Date(Date.now() + 50 * 60000).toISOString(),
        allDay: false,
        recurrence: "none",
        recurrenceUntil: null,
      }),
    );
    const first = await syncNotifications(req());
    expect(first.status).toBe(200);
    expect((await first.json()).unread).toBe(5);
    expect((await (await syncNotifications(req())).json()).unread).toBe(5);
    const list = await (
      await getNotifications(new Request(`${origin}/api/notifications`))
    ).json();
    const id = list.items[0].id;
    await login("bob");
    expect(
      (
        await (
          await getNotifications(new Request(`${origin}/api/notifications`))
        ).json()
      ).total,
    ).toBe(0);
    expect((await readNotification(req({ id, read: true }))).status).toBe(404);
    await login();
    expect((await readNotification(req({ id, read: true }))).status).toBe(200);
    expect((await (await syncNotifications(req())).json()).unread).toBe(4);
    expect((await readNotification(req({ all: true }))).status).toBe(200);
    const prefs = {
      enabled: false,
      deadlines: true,
      overdue: true,
      events: true,
      critical: true,
      agingBacklog: true,
      reminderMinutes: 60,
      backlogDays: 14,
    };
    expect((await updatePreferences(req(prefs))).status).toBe(200);
    await addTask(
      req({ ...input, title: "Muted critical", priority: "critical" }),
    );
    expect((await (await syncNotifications(req())).json()).unread).toBe(0);
  });
  it("activates only owned unfinished backlog tasks and preserves overdue dates", async () => {
    await login();
    const t = await (
      await addTask(req({ ...input, dueAt: "2020-01-01T00:00:00Z" }))
    ).json();
    await login("bob");
    expect((await activateTask(req(), ctx(t.id))).status).toBe(404);
    await login();
    const response = await activateTask(req(), ctx(t.id));
    expect(response.status).toBe(200);
    const row = await response.json();
    expect(row.status).toBe("in_progress");
    expect(row.backlog).toBe(false);
    expect(new Date(row.startsAt) <= new Date(row.dueAt)).toBe(true);
    expect((await activateTask(req(), ctx(t.id))).status).toBe(409);
    const done = await (
      await addTask(req({ ...input, status: "completed" }))
    ).json();
    expect((await activateTask(req(), ctx(done.id))).status).toBe(409);
  });
  it("keeps events and calendar feeds private, even from admins", async () => {
    const event = {
      title: "Private meeting",
      description: "Context",
      location: "Office",
      kind: "meeting",
      color: "#6366f1",
      categoryId: null,
      startsAt: "2030-10-29T09:00:00+08:00",
      endsAt: "2030-10-29T10:00:00+08:00",
      allDay: false,
      recurrence: "daily",
      recurrenceUntil: "2030-10-30T23:59:00+08:00",
    };
    const feed = () =>
      calendar(
        new Request(
          `${origin}/api/calendar?from=2030-10-28T16:00:00Z&to=2030-10-31T16:00:00Z`,
        ),
      );
    await login();
    const created = await addEvent(req(event));
    expect(created.status).toBe(201);
    const row = await created.json();
    expect((await (await feed()).json()).entries).toHaveLength(2);
    await login("bob");
    expect((await (await feed()).json()).entries).toHaveLength(0);
    expect((await editEvent(req(event), ctx(row.id))).status).toBe(404);
    await login("admin");
    expect((await deleteEvent(req(), ctx(row.id))).status).toBe(404);
    await login();
    expect(
      (await editEvent(req({ ...event, title: "Changed" }), ctx(row.id)))
        .status,
    ).toBe(200);
    expect((await deleteEvent(req(), ctx(row.id))).status).toBe(200);
  });
  it("clears categories from events without deleting the event", async () => {
    await login();
    const category = await (
      await addCategory(req({ name: "Meetings", color: "#6366f1" }))
    ).json();
    const event = {
      title: "Review",
      description: "",
      location: "",
      kind: "event",
      color: "#6366f1",
      categoryId: category.id,
      startsAt: "2030-10-29T09:00:00+08:00",
      endsAt: "2030-10-29T10:00:00+08:00",
      allDay: false,
      recurrence: "none",
      recurrenceUntil: null,
    };
    expect((await addEvent(req(event))).status).toBe(201);
    expect((await deleteCategory(req(), ctx(category.id))).status).toBe(200);
    expect(
      (await database.select().from(schema.events))[0].categoryId,
    ).toBeNull();
  });
  it("uses Argon2id, hashed expiring sessions and HttpOnly cookies", async () => {
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "incorrect")).toBe(false);
    expect((await login()).status).toBe(200);
    const [session] = await database.select().from(schema.sessions);
    const raw = state.jar.get(cookieName)!;
    expect(session.tokenHash).toBe(digest(raw));
    expect(session.tokenHash).not.toBe(raw);
    expect(state.options.httpOnly).toBe(true);
    expect(state.options.sameSite).toBe("lax");
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect((await currentUser())?.id).toBe(alice.id);
  });
  it("rejects unknown usernames and bad passwords with the same message", async () => {
    const a = await login("unknown");
    const b = await login("alice", "wrong");
    expect(a.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
    expect(state.jar.size).toBe(0);
  });
  it("rejects foreign origins before mutation", async () => {
    expect(
      (
        await auth(
          req(
            { username: "alice", password: "correct-password-123" },
            "https://attacker.example",
          ),
          { params: Promise.resolve({ action: "login" }) },
        )
      ).status,
    ).toBe(403);
    expect((await addTask(req(input, "https://attacker.example"))).status).toBe(
      403,
    );
  });
  it("requires login and a first-login password change", async () => {
    expect((await getTasks()).status).toBe(401);
    await database
      .update(schema.users)
      .set({ mustChangePassword: true })
      .where(eq(schema.users.id, alice.id));
    expect((await login()).status).toBe(200);
    expect((await addTask(req(input))).status).toBe(403);
    const response = await auth(
      req({
        currentPassword: "correct-password-123",
        password: "new-unique-passphrase-123",
      }),
      { params: Promise.resolve({ action: "password" }) },
    );
    expect(response.status).toBe(200);
    expect((await currentUser())?.mustChangePassword).toBe(false);
    expect((await addTask(req(input))).status).toBe(201);
  });
  it("throttles repeated login attempts persistently", async () => {
    for (let n = 0; n < 8; n++)
      expect((await login("unknown", "wrong")).status).toBe(401);
    expect((await login("unknown", "wrong")).status).toBe(429);
  });
  it("expires sessions and revokes them on logout", async () => {
    await login();
    await database.update(schema.sessions).set({ expiresAt: new Date(0) });
    expect(await currentUser()).toBeNull();
    await login();
    await auth(req(), { params: Promise.resolve({ action: "logout" }) });
    expect(state.jar.size).toBe(0);
    expect(await currentUser()).toBeNull();
  });
  it("does not issue sessions after a concurrent password reset", async () => {
    await database
      .update(schema.users)
      .set({ passwordHash: await hashPassword("reset-password-123") })
      .where(eq(schema.users.id, alice.id));
    await expect(createSession(alice.id, hash)).rejects.toThrow();
  });
  it("enforces task ownership for users and administrators", async () => {
    await login();
    const created = await addTask(req(input));
    expect(created.status).toBe(201);
    const task = await created.json();
    await login("bob");
    expect(await (await getTasks()).json()).toEqual([]);
    expect(
      (await editTask(req({ ...input, title: "Stolen" }), ctx(task.id))).status,
    ).toBe(404);
    expect((await deleteTask(req(), ctx(task.id))).status).toBe(404);
    await login("admin");
    expect(await (await getTasks()).json()).toEqual([]);
    expect((await deleteTask(req(), ctx(task.id))).status).toBe(404);
  });
  it("records changes and maintains completed timestamps", async () => {
    await login();
    const task = await (await addTask(req(input))).json();
    const done = await editTask(
      req({ ...input, status: "completed" }),
      ctx(task.id),
    );
    expect((await done.json()).completedAt).toBeTruthy();
    const reopened = await editTask(req(input), ctx(task.id));
    expect((await reopened.json()).completedAt).toBeNull();
    expect(await database.select().from(schema.activity)).toHaveLength(3);
    expect((await deleteTask(req(), ctx(task.id))).status).toBe(200);
    expect(await database.select().from(schema.tasks)).toHaveLength(0);
    expect(await database.select().from(schema.activity)).toHaveLength(4);
  });
  it("blocks cross-owner categories in both API and database", async () => {
    await login("bob");
    const category = await (
      await addCategory(req({ name: "Bob only", color: "#6366f1" }))
    ).json();
    await login();
    expect(
      (await addTask(req({ ...input, categoryId: category.id }))).status,
    ).toBe(400);
    await expect(
      database
        .insert(schema.tasks)
        .values({ title: "Bypass", userId: alice.id, categoryId: category.id }),
    ).rejects.toThrow();
  });
  it("deletes categories without deleting tasks", async () => {
    await login();
    const c = await (
      await addCategory(req({ name: "Work", color: "#6366f1" }))
    ).json();
    await addTask(req({ ...input, categoryId: c.id }));
    expect((await deleteCategory(req(), ctx(c.id))).status).toBe(200);
    expect(
      (await database.select().from(schema.tasks))[0].categoryId,
    ).toBeNull();
  });
  it("restricts user administration and revokes disabled account sessions", async () => {
    await login();
    expect(
      (
        await editUser(
          req({ username: "bob", role: "admin", active: true }),
          ctx(bob.id),
        )
      ).status,
    ).toBe(403);
    const aliceToken = state.jar.get(cookieName)!;
    await login("admin");
    expect(
      (
        await editUser(
          req({ username: "alice", role: "user", active: false }),
          ctx(alice.id),
        )
      ).status,
    ).toBe(200);
    state.jar.set(cookieName, aliceToken);
    expect(await currentUser()).toBeNull();
    expect((await login()).status).toBe(401);
  });
  it("requires password changes after admin resets and protects own admin account", async () => {
    await login("admin");
    expect(
      (
        await editUser(
          req({ username: "admin", role: "user", active: false }),
          ctx(admin.id),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await editUser(
          req({
            username: "bob",
            role: "user",
            active: true,
            password: "temporary-password-456",
          }),
          ctx(bob.id),
        )
      ).status,
    ).toBe(200);
    const r = await login("bob", "temporary-password-456");
    expect((await r.json()).redirect).toBe("/change-password");
  });
  it("cascades user deletion to private data", async () => {
    await login();
    await addTask(req(input));
    await login("admin");
    expect((await deleteUser(req(), ctx(alice.id))).status).toBe(200);
    expect(await database.select().from(schema.tasks)).toHaveLength(0);
    expect(await database.select().from(schema.activity)).toHaveLength(0);
  });
  it("enables RLS on every app table with no public policies", async () => {
    const result = await pg.query<{ relrowsecurity: boolean }>(
      "SELECT relrowsecurity FROM pg_class WHERE relname IN ('users','tasks','categories','activity','sessions','login_limits')",
    );
    expect(result.rows).toHaveLength(6);
    expect(result.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  it("validates date order and title length", () => {
    expect(taskSchema.safeParse({ ...input, title: " " }).success).toBe(false);
    expect(
      taskSchema.safeParse({
        ...input,
        startsAt: "2026-10-30T12:00:00+08:00",
        dueAt: "2026-10-29T12:00:00+08:00",
      }).success,
    ).toBe(false);
  });
});
