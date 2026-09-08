CREATE TABLE "matter_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matter_notes" ADD CONSTRAINT "matter_notes_owner_user_id_matter_id_matters_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","matter_id") REFERENCES "public"."matters"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matter_notes_owner_user_id_matter_id_created_at_idx" ON "matter_notes" USING btree ("owner_user_id","matter_id","created_at");--> statement-breakpoint
INSERT INTO "matter_notes" ("owner_user_id", "matter_id", "content", "created_at", "updated_at")
SELECT "owner_user_id", "id", "notes", "updated_at", "updated_at"
FROM "matters"
WHERE "notes" IS NOT NULL AND btrim("notes") <> '';--> statement-breakpoint
ALTER TABLE "matter_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "matter_notes_owner_access" ON "matter_notes" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
ALTER TABLE "matters" DROP COLUMN "notes";
