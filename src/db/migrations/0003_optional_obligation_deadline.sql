ALTER TABLE "client_obligations" DROP CONSTRAINT "client_obligations_owner_matter_deadline_fk";--> statement-breakpoint
ALTER TABLE "client_obligations" DROP CONSTRAINT "client_obligations_deadline_requires_matter";--> statement-breakpoint
DROP INDEX "client_obligations_owner_matter_deadline_idx";--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_owner_user_id_id_unique" UNIQUE("owner_user_id","id");--> statement-breakpoint
ALTER TABLE "client_obligations" ADD CONSTRAINT "client_obligations_owner_deadline_fk" FOREIGN KEY ("owner_user_id","deadline_id") REFERENCES "public"."deadlines"("owner_user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_obligations_owner_deadline_idx" ON "client_obligations" USING btree ("owner_user_id","deadline_id");
