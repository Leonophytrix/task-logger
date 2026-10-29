CREATE TABLE "interface_preferences" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"timeZone" text DEFAULT 'Asia/Manila' NOT NULL,
	"dateFormat" text DEFAULT 'medium' NOT NULL,
	"defaultTaskView" text DEFAULT 'list' NOT NULL,
	CONSTRAINT "preference_theme" CHECK ("interface_preferences"."theme" in ('light','dark','system')),
	CONSTRAINT "preference_view" CHECK ("interface_preferences"."defaultTaskView" in ('list','kanban','calendar')),
	CONSTRAINT "preference_date_format" CHECK ("interface_preferences"."dateFormat" in ('medium','dd/MM/yyyy','MM/dd/yyyy','yyyy-MM-dd'))
);
--> statement-breakpoint
CREATE TABLE "task_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"taskKey" uuid NOT NULL,
	"taskTitle" text NOT NULL,
	"action" text NOT NULL,
	"recordedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"taskCreatedAt" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"categoryName" text,
	"startsAt" timestamp with time zone,
	"dueAt" timestamp with time zone,
	"backlog" boolean NOT NULL,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taskId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "item_kind" CHECK ("task_items"."kind" in ('subtask','checklist')),
	CONSTRAINT "item_title" CHECK (length(trim("task_items"."title")) between 1 and 300)
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taskId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "task_tag_unique" UNIQUE("taskId","name")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "timeZone" text DEFAULT 'Asia/Manila' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrenceUntil" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrenceAnchor" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "seriesId" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "occurrence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "timeZone" text DEFAULT 'Asia/Manila' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id" UNIQUE("id","userId");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_series_occurrence" UNIQUE("seriesId","occurrence");--> statement-breakpoint
ALTER TABLE "interface_preferences" ADD CONSTRAINT "interface_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_items" ADD CONSTRAINT "task_items_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_items" ADD CONSTRAINT "task_items_taskId_userId_tasks_id_userId_fk" FOREIGN KEY ("taskId","userId") REFERENCES "public"."tasks"("id","userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_taskId_userId_tasks_id_userId_fk" FOREIGN KEY ("taskId","userId") REFERENCES "public"."tasks"("id","userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_history_owner_time_idx" ON "task_history" USING btree ("userId","recordedAt");--> statement-breakpoint
CREATE INDEX "task_history_owner_task_idx" ON "task_history" USING btree ("userId","taskKey","recordedAt");--> statement-breakpoint
CREATE INDEX "task_items_owner_task_idx" ON "task_items" USING btree ("userId","taskId");--> statement-breakpoint
CREATE INDEX "task_tags_owner_name_idx" ON "task_tags" USING btree ("userId","name");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "task_recurrence" CHECK ("tasks"."recurrence" in ('none','daily','weekly','monthly'));
--> statement-breakpoint
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE interface_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON task_items,task_tags,task_history,interface_preferences FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON task_items,task_tags,task_history,interface_preferences FROM anon; END IF;
 IF EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON task_items,task_tags,task_history,interface_preferences FROM authenticated; END IF;
END $$;
--> statement-breakpoint
INSERT INTO task_history ("userId","taskKey","taskTitle",action,"taskCreatedAt",status,priority,"categoryName","startsAt","dueAt",backlog,"completedAt")
 SELECT t."userId",t.id,t.title,'baseline',t."createdAt",t.status,t.priority,c.name,t."startsAt",t."dueAt",t.backlog,t."completedAt" FROM tasks t LEFT JOIN categories c ON c.id=t."categoryId" AND c."userId"=t."userId";
