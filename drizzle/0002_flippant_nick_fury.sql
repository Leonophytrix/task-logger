CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"categoryId" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'event' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"startsAt" timestamp with time zone NOT NULL,
	"endsAt" timestamp with time zone NOT NULL,
	"allDay" boolean DEFAULT false NOT NULL,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"recurrenceUntil" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_dates" CHECK ("events"."endsAt" > "events"."startsAt"),
	CONSTRAINT "event_kind" CHECK ("events"."kind" in ('event','meeting','occasion')),
	CONSTRAINT "event_recurrence" CHECK ("events"."recurrence" in ('none','daily','weekly','monthly')),
	CONSTRAINT "event_title" CHECK (length(trim("events"."title")) between 1 and 180)
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"deadlines" boolean DEFAULT true NOT NULL,
	"overdue" boolean DEFAULT true NOT NULL,
	"events" boolean DEFAULT true NOT NULL,
	"critical" boolean DEFAULT true NOT NULL,
	"agingBacklog" boolean DEFAULT true NOT NULL,
	"reminderMinutes" integer DEFAULT 60 NOT NULL,
	"backlogDays" integer DEFAULT 14 NOT NULL,
	"lastCheckedAt" timestamp with time zone,
	CONSTRAINT "reminder_interval" CHECK ("notification_preferences"."reminderMinutes" between 5 and 10080),
	CONSTRAINT "backlog_interval" CHECK ("notification_preferences"."backlogDays" between 1 and 365)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"href" text NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_owner_key" UNIQUE("userId","key")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "kind" text DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "durationMinutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_categoryId_userId_categories_id_userId_fk" FOREIGN KEY ("categoryId","userId") REFERENCES "public"."categories"("id","userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_owner_start_idx" ON "events" USING btree ("userId","startsAt");--> statement-breakpoint
CREATE INDEX "notifications_owner_date_idx" ON "notifications" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "notifications_owner_read_idx" ON "notifications" USING btree ("userId","readAt");--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_duration" CHECK ("activity"."durationMinutes" between 0 and 1440);--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_kind" CHECK ("activity"."kind" in ('automatic','manual'));
--> statement-breakpoint
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON events, notification_preferences, notifications FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON events, notification_preferences, notifications FROM anon;
 END IF;
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON events, notification_preferences, notifications FROM authenticated;
 END IF;
END $$;
