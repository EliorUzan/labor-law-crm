ALTER TABLE "documents" ADD COLUMN "drive_file_id" text;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "web_url" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "documents_owner_drive_file_unique" ON "documents" ("owner_user_id", "drive_file_id") WHERE "drive_file_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "document_drive_connections" (
  "owner_user_id" uuid PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  "refresh_token" text NOT NULL,
  "google_account_id" text NOT NULL,
  "root_id" text,
  "root_name" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "document_drive_connections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "document_drive_connections" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
-- Connections are accessed exclusively through the authenticated application
-- server's database role. No token-bearing rows are exposed through Data API.
