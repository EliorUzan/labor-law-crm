# Backup and recovery

The CRM database is hosted in Supabase PostgreSQL. Before production use, the owner must verify the backup plan and point-in-time recovery availability for the selected Supabase plan in the Supabase dashboard. Backup retention and restore options are plan-dependent; confirm them at least annually and after a plan change.

## Recovery plan

1. Stop writes and record the incident time.
2. Create a separate recovery database/project; never test a restore over the live legal database.
3. Restore the chosen Supabase backup or point in time following Supabase's documented procedure.
4. Restore Vercel environment variables from the password manager, then deploy the committed application revision.
5. Run the checked-in Drizzle migrations with `pnpm run db:migrate` only when the restored database needs migrations beyond the backup revision.
6. Provision the lawyer account in Supabase Auth if Auth data was not restored, configure production URLs, and perform the production smoke test in `DEPLOYMENT.md`.

Drizzle migrations in `src/db/migrations/` are the schema source of truth. Keep them in version control and apply them to a separate development database before production. Never rely on unrecorded dashboard schema changes.

## Scope and limitations

The database backup includes CRM records and document references. It does **not** back up the actual documents at Google Drive, Dropbox, a local machine, or any other referenced location. Those services and devices require their own backup and recovery plans.

V1 currently has no automated production-data seed and no automatic database-export endpoint. For an emergency portability export, use a Supabase database export performed by the owner from the Supabase dashboard or approved PostgreSQL tooling, store it encrypted, and never include passwords, sessions, API keys, or `.env` files in an export.
