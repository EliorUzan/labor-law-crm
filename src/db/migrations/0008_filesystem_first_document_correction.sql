-- Remove the V1 note-style Document References without migrating their data.
DROP TABLE IF EXISTS "document_references";--> statement-breakpoint

-- CRM 01's discarded provider/legacy model may exist in a development database.
-- Tear it down before recreating the filesystem-first tables below. Fresh installs
-- already have the corrected 0007 tables and skip this branch.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'provider_file_id'
  ) THEN
    DROP TABLE IF EXISTS "managed_drive_folders";
    DROP TABLE IF EXISTS "document_links";
    DROP TABLE IF EXISTS "documents";
    DROP TYPE IF EXISTS "document_managed_state";
    DROP TYPE IF EXISTS "document_target_type";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "document_target_type" AS ENUM('client', 'matter', 'financial_record', 'client_obligation', 'task', 'deadline', 'important_date', 'matter_history', 'matter_note', 'office_expense', 'manual_income', 'trust_transaction', 'tax_payment', 'accounting_liability', 'accounting_obligation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "relative_path" text NOT NULL,
  "mime_type" text,
  "extension" text,
  "size_bytes" bigint,
  "file_modified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "documents_owner_relative_path_unique" UNIQUE("owner_user_id", "relative_path"),
  CONSTRAINT "documents_relative_path_is_relative" CHECK ("relative_path" <> '' AND "relative_path" !~ '(^/|^[A-Za-z]:|\\\\|(^|/)\\.\\.(/|$))')
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "public"."documents"("id") ON DELETE restrict,
  "target_type" "document_target_type" NOT NULL,
  "target_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "document_links_document_target_unique" UNIQUE("document_id", "target_type", "target_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_owner_user_id_idx" ON "documents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_links_document_id_idx" ON "document_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_links_target_type_target_id_idx" ON "document_links" USING btree ("target_type", "target_id");--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "documents_owner_access" ON "documents";--> statement-breakpoint
DROP POLICY IF EXISTS "document_links_owner_access" ON "document_links";--> statement-breakpoint
CREATE POLICY "documents_owner_access" ON "documents" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "document_links_owner_access" ON "document_links" FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM "documents" WHERE "documents"."id" = "document_links"."document_id" AND "documents"."owner_user_id" = (SELECT auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM "documents" WHERE "documents"."id" = "document_links"."document_id" AND "documents"."owner_user_id" = (SELECT auth.uid())));--> statement-breakpoint
