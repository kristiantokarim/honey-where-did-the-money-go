CREATE TABLE IF NOT EXISTS "transactions" (
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
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_category" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_by" ON "transactions" USING btree ("by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_date_category_by" ON "transactions" USING btree ("date","category","by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON "transactions" USING btree ("transaction_type");