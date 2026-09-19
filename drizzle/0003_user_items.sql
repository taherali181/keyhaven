CREATE TABLE "user_items" (
	"user_id" text NOT NULL,
	"entity" text NOT NULL,
	"key" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "user_items_user_id_entity_key_pk" PRIMARY KEY("user_id","entity","key")
);
--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_items_sync_idx" ON "user_items" USING btree ("user_id","entity","synced_at");