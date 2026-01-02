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
	"created_at" timestamp DEFAULT now()
);
