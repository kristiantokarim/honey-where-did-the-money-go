CREATE TABLE "scan_session_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"page_index" integer NOT NULL,
	"image_key" text NOT NULL,
	"image_url" text NOT NULL,
	"app_type" text,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	"parse_result" jsonb,
	"parse_error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_session_page" UNIQUE("session_id","page_index")
);
--> statement-breakpoint
CREATE TABLE "scan_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_page_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "scan_session_pages" ADD CONSTRAINT "scan_session_pages_session_id_scan_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."scan_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scan_session_pages_session_id" ON "scan_session_pages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_scan_session_pages_parse_status" ON "scan_session_pages" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_user_id" ON "scan_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_status" ON "scan_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_expires_at" ON "scan_sessions" USING btree ("expires_at");