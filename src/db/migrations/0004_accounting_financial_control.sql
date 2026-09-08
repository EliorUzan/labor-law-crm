CREATE TYPE "public"."trust_transaction_type" AS ENUM('receipt', 'release');--> statement-breakpoint
CREATE TYPE "public"."tax_payment_kind" AS ENUM('tax', 'vat');--> statement-breakpoint
CREATE TYPE "public"."accounting_liability_type" AS ENUM('tax', 'vat');--> statement-breakpoint
CREATE TYPE "public"."accounting_liability_status" AS ENUM('open', 'paid');--> statement-breakpoint
CREATE TABLE "manual_income" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "owner_user_id" uuid NOT NULL, "record_date" date NOT NULL, "description" text NOT NULL, "amount" numeric(14,2) NOT NULL, "notes" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "office_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "owner_user_id" uuid NOT NULL, "record_date" date NOT NULL, "description" text NOT NULL, "amount" numeric(14,2) NOT NULL, "category" text, "document_link" text, "notes" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "trust_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "owner_user_id" uuid NOT NULL, "client_id" uuid NOT NULL, "matter_id" uuid, "transaction_type" "trust_transaction_type" NOT NULL, "record_date" date NOT NULL, "amount" numeric(14,2) NOT NULL, "description" text, "document_link" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "accounting_liabilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "owner_user_id" uuid NOT NULL, "liability_type" "accounting_liability_type" NOT NULL, "status" "accounting_liability_status" DEFAULT 'open' NOT NULL, "amount" numeric(14,2) NOT NULL, "due_date" date, "period" text, "description" text, "notes" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "tax_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "owner_user_id" uuid NOT NULL, "payment_kind" "tax_payment_kind" NOT NULL, "tax_type" text, "liability_id" uuid, "record_date" date NOT NULL, "amount" numeric(14,2) NOT NULL, "period" text, "description" text, "document_link" text, "notes" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "accounting_obligations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "owner_user_id" uuid NOT NULL, "title" text NOT NULL, "done" boolean DEFAULT false NOT NULL, "due_date" date, "type" text, "period" text, "amount" numeric(14,2), "description" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "accounting_liabilities" ADD CONSTRAINT "accounting_liabilities_owner_user_id_id_unique" UNIQUE("owner_user_id","id");--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_owner_user_id_client_id_clients_owner_user_id_id_fk" FOREIGN KEY ("owner_user_id","client_id") REFERENCES "public"."clients"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_owner_user_id_client_id_matter_id_matters_fk" FOREIGN KEY ("owner_user_id","client_id","matter_id") REFERENCES "public"."matters"("owner_user_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_owner_user_id_liability_id_accounting_liabilities_fk" FOREIGN KEY ("owner_user_id","liability_id") REFERENCES "public"."accounting_liabilities"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manual_income_owner_user_id_record_date_idx" ON "manual_income" USING btree ("owner_user_id","record_date");--> statement-breakpoint
CREATE INDEX "office_expenses_owner_user_id_record_date_idx" ON "office_expenses" USING btree ("owner_user_id","record_date");--> statement-breakpoint
CREATE INDEX "trust_transactions_owner_user_id_record_date_idx" ON "trust_transactions" USING btree ("owner_user_id","record_date");--> statement-breakpoint
CREATE INDEX "trust_transactions_owner_user_id_client_id_idx" ON "trust_transactions" USING btree ("owner_user_id","client_id");--> statement-breakpoint
CREATE INDEX "accounting_liabilities_owner_user_id_status_idx" ON "accounting_liabilities" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "tax_payments_owner_user_id_record_date_idx" ON "tax_payments" USING btree ("owner_user_id","record_date");--> statement-breakpoint
CREATE INDEX "tax_payments_owner_user_id_liability_id_idx" ON "tax_payments" USING btree ("owner_user_id","liability_id");--> statement-breakpoint
CREATE INDEX "accounting_obligations_owner_user_id_done_due_date_idx" ON "accounting_obligations" USING btree ("owner_user_id","done","due_date");--> statement-breakpoint
ALTER TABLE "manual_income" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "office_expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trust_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounting_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tax_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounting_obligations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "manual_income_owner_access" ON "manual_income" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "office_expenses_owner_access" ON "office_expenses" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "trust_transactions_owner_access" ON "trust_transactions" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "accounting_liabilities_owner_access" ON "accounting_liabilities" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "tax_payments_owner_access" ON "tax_payments" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");--> statement-breakpoint
CREATE POLICY "accounting_obligations_owner_access" ON "accounting_obligations" FOR ALL TO authenticated USING ((SELECT auth.uid()) = "owner_user_id") WITH CHECK ((SELECT auth.uid()) = "owner_user_id");
