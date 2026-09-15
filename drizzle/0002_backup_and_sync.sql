CREATE TABLE "reading_progress" (
	"user_id" text NOT NULL,
	"work_key" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "reading_progress_user_id_work_key_pk" PRIMARY KEY("user_id","work_key")
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"work_key" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"mode" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"words" integer NOT NULL,
	"pages" integer NOT NULL,
	"synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelf_items" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "shelf_items_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "sync_tombstones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity" text NOT NULL,
	"key" text NOT NULL,
	"deleted_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy_states" ADD COLUMN "synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "arcade_scores" ADD COLUMN "synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_documents" ADD COLUMN "synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "typing_results" ADD COLUMN "synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_tombstones" ADD CONSTRAINT "sync_tombstones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reading_progress_sync_idx" ON "reading_progress" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "reading_sessions_sync_idx" ON "reading_sessions" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "reading_sessions_user_time_idx" ON "reading_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "shelf_items_sync_idx" ON "shelf_items" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_tombstones_target_unique" ON "sync_tombstones" USING btree ("user_id","entity","key");--> statement-breakpoint
CREATE INDEX "sync_tombstones_sync_idx" ON "sync_tombstones" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "arcade_scores_sync_idx" ON "arcade_scores" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "imported_documents_sync_idx" ON "imported_documents" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "typing_results_sync_idx" ON "typing_results" USING btree ("user_id","synced_at");