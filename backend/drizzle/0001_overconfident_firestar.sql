CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_transactions_category" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_transactions_by" ON "transactions" USING btree ("by");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_category_by" ON "transactions" USING btree ("date","category","by");