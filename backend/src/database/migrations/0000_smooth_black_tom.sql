CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"expense" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer DEFAULT 1,
	"total" integer NOT NULL,
	"payment" text NOT NULL,
	"by" text NOT NULL,
	"to" text NOT NULL,
	"remarks" text,
	"payment_correction" text,
	"image_url" text,
	"is_excluded" boolean DEFAULT false,
	"transaction_type" text DEFAULT 'expense',
	"linked_transfer_id" integer,
	"forwarded_transaction_id" integer,
	"forwarded_from_app" text,
	"household_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
	"user_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_page_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"last_retry_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"email_verification_expires_at" timestamp,
	"password_reset_token" text,
	"password_reset_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "household_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "household_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_household_member" UNIQUE("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_session_pages" ADD CONSTRAINT "scan_session_pages_session_id_scan_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."scan_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_transactions_category" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_transactions_by" ON "transactions" USING btree ("by");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_category_by" ON "transactions" USING btree ("date","category","by");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_transactions_household_id" ON "transactions" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_scan_session_pages_session_id" ON "scan_session_pages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_scan_session_pages_parse_status" ON "scan_session_pages" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_user_id" ON "scan_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_household_id" ON "scan_sessions" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_status" ON "scan_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scan_sessions_expires_at" ON "scan_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_household_invitations_token" ON "household_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_household_members_household_id" ON "household_members" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_household_members_user_id" ON "household_members" USING btree ("user_id");