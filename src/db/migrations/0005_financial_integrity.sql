ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "accounting_records" ADD CONSTRAINT "accounting_records_amount_positive" CHECK ("amount" IS NULL OR "amount" > 0);--> statement-breakpoint
ALTER TABLE "manual_income" ADD CONSTRAINT "manual_income_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "office_expenses" ADD CONSTRAINT "office_expenses_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "trust_transactions" ADD CONSTRAINT "trust_transactions_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "accounting_liabilities" ADD CONSTRAINT "accounting_liabilities_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "accounting_obligations" ADD CONSTRAINT "accounting_obligations_amount_positive" CHECK ("amount" IS NULL OR "amount" > 0);
