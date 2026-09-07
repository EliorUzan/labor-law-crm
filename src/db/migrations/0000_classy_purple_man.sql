CREATE TYPE "public"."client_status" AS ENUM('potential', 'active', 'former');--> statement-breakpoint
CREATE TYPE "public"."financial_record_type" AS ENUM('fee', 'charge', 'payment');--> statement-breakpoint
CREATE TABLE "accounting_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"record_date" date NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2),
	"document_link" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"matter_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"done" boolean DEFAULT false NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"status" "client_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_owner_user_id_id_unique" UNIQUE("owner_user_id","id")
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deadlines_owner_user_id_matter_id_id_unique" UNIQUE("owner_user_id","matter_id","id")
);
--> statement-breakpoint
CREATE TABLE "document_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"location" text NOT NULL,
	"category" text,
	"notes" text,
	"provider" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"matter_id" uuid,
	"type" "financial_record_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"record_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "important_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"event_at" timestamp with time zone NOT NULL,
	"type" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"event_date" date NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"case_type" text,
	"status" text,
	"open_date" date,
	"case_number" text,
	"court_or_tribunal" text,
	"opposing_party" text,
	"opposing_attorney_name" text,
	"opposing_attorney_phone" text,
	"opposing_attorney_email" text,
	"opposing_attorney_firm" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matters_owner_user_id_id_unique" UNIQUE("owner_user_id","id"),
	CONSTRAINT "matters_owner_user_id_client_id_id_unique" UNIQUE("owner_user_id","client_id","id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"deadline_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_obligations" ADD CONSTRAINT "client_obligations_owner_user_id_client_id_clients_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","client_id") REFERENCES "public"."clients"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_obligations" ADD CONSTRAINT "client_obligations_owner_user_id_client_id_matter_id_matters_fk" FOREIGN KEY ("owner_user_id","client_id","matter_id") REFERENCES "public"."matters"("owner_user_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_owner_user_id_matter_id_matters_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","matter_id") REFERENCES "public"."matters"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_owner_user_id_matter_id_matters_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","matter_id") REFERENCES "public"."matters"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_owner_user_id_client_id_clients_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","client_id") REFERENCES "public"."clients"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_owner_user_id_client_id_matter_id_matters_fk" FOREIGN KEY ("owner_user_id","client_id","matter_id") REFERENCES "public"."matters"("owner_user_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_owner_user_id_matter_id_matters_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","matter_id") REFERENCES "public"."matters"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_history" ADD CONSTRAINT "matter_history_owner_user_id_matter_id_matters_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","matter_id") REFERENCES "public"."matters"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_owner_user_id_client_id_clients_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","client_id") REFERENCES "public"."clients"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_matter_id_matters_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","matter_id") REFERENCES "public"."matters"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_matter_id_deadline_id_deadlines_fk" FOREIGN KEY ("owner_user_id","matter_id","deadline_id") REFERENCES "public"."deadlines"("owner_user_id","matter_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounting_records_owner_user_id_record_date_idx" ON "accounting_records" USING btree ("owner_user_id","record_date");--> statement-breakpoint
CREATE INDEX "client_obligations_owner_user_id_client_id_idx" ON "client_obligations" USING btree ("owner_user_id","client_id");--> statement-breakpoint
CREATE INDEX "client_obligations_owner_user_id_done_due_date_idx" ON "client_obligations" USING btree ("owner_user_id","done","due_date");--> statement-breakpoint
CREATE INDEX "clients_owner_user_id_idx" ON "clients" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "deadlines_owner_user_id_deadline_at_idx" ON "deadlines" USING btree ("owner_user_id","deadline_at");--> statement-breakpoint
CREATE INDEX "document_references_owner_user_id_matter_id_idx" ON "document_references" USING btree ("owner_user_id","matter_id");--> statement-breakpoint
CREATE INDEX "financial_records_owner_user_id_client_id_record_date_idx" ON "financial_records" USING btree ("owner_user_id","client_id","record_date");--> statement-breakpoint
CREATE INDEX "important_dates_owner_user_id_event_at_idx" ON "important_dates" USING btree ("owner_user_id","event_at");--> statement-breakpoint
CREATE INDEX "matter_history_owner_user_id_matter_id_event_date_idx" ON "matter_history" USING btree ("owner_user_id","matter_id","event_date");--> statement-breakpoint
CREATE INDEX "matters_owner_user_id_idx" ON "matters" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "matters_owner_user_id_client_id_idx" ON "matters" USING btree ("owner_user_id","client_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_user_id_done_idx" ON "tasks" USING btree ("owner_user_id","done");--> statement-breakpoint
CREATE INDEX "tasks_owner_user_id_matter_id_idx" ON "tasks" USING btree ("owner_user_id","matter_id");
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_obligations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "matters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "matter_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deadlines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "important_dates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounting_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "clients_owner_access" ON "clients" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "client_obligations_owner_access" ON "client_obligations" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "financial_records_owner_access" ON "financial_records" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "matters_owner_access" ON "matters" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "matter_history_owner_access" ON "matter_history" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "deadlines_owner_access" ON "deadlines" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "tasks_owner_access" ON "tasks" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "important_dates_owner_access" ON "important_dates" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "document_references_owner_access" ON "document_references" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "accounting_records_owner_access" ON "accounting_records" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");
