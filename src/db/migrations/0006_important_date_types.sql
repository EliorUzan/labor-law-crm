ALTER TABLE "deadlines" ADD COLUMN "type" text DEFAULT 'submissionDeadline' NOT NULL;--> statement-breakpoint
CREATE TABLE "important_date_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "important_date_types" ADD CONSTRAINT "important_date_types_owner_key_unique" UNIQUE("owner_user_id","key");--> statement-breakpoint
CREATE INDEX "important_date_types_owner_active_idx" ON "important_date_types" USING btree ("owner_user_id","is_active");--> statement-breakpoint
ALTER TABLE "important_date_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "important_date_types_owner_access" ON "important_date_types" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
UPDATE "important_dates" SET "type" = 'courtDiscussion' WHERE "type" = 'hearing';
