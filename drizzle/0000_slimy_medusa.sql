CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"taskId" uuid,
	"message" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	CONSTRAINT "category_owner_id" UNIQUE("id","userId"),
	CONSTRAINT "category_owner_name" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE "login_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"resetAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"tokenHash" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"categoryId" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"startsAt" timestamp with time zone,
	"dueAt" timestamp with time zone,
	"backlog" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "valid_priority" CHECK ("tasks"."priority" in ('low','medium','high','critical')),
	CONSTRAINT "valid_status" CHECK ("tasks"."status" in ('new','in_progress','pending','on_hold','completed','cancelled')),
	CONSTRAINT "valid_dates" CHECK ("tasks"."startsAt" is null or "tasks"."dueAt" is null or "tasks"."dueAt" >= "tasks"."startsAt"),
	CONSTRAINT "valid_title" CHECK (length(trim("tasks"."title")) between 1 and 180)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"mustChangePassword" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "valid_role" CHECK ("users"."role" in ('admin', 'user')),
	CONSTRAINT "normalized_username" CHECK ("users"."username" ~ '^[a-z0-9_.-]{3,32}$')
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_categoryId_userId_categories_id_userId_fk" FOREIGN KEY ("categoryId","userId") REFERENCES "public"."categories"("id","userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_owner_date_idx" ON "activity" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "limits_expiry_idx" ON "login_limits" USING btree ("resetAt");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "tasks_owner_status_idx" ON "tasks" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "tasks_owner_due_idx" ON "tasks" USING btree ("userId","dueAt");--> statement-breakpoint
CREATE INDEX "tasks_owner_category_idx" ON "tasks" USING btree ("userId","categoryId");