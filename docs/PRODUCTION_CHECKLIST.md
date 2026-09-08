# Production readiness checklist

## Supabase

- [ ] Production project is separate from development.
- [ ] All checked-in Drizzle migrations have been applied.
- [ ] RLS is enabled and owner policies are present on every CRM table.
- [ ] Public sign-up is disabled.
- [ ] Production Site URL and exact redirect URLs are configured.
- [ ] Lawyer account is manually provisioned.
- [ ] Backup retention and restore procedure have been reviewed.

## Vercel

- [ ] Production project and final domain are connected.
- [ ] `DATABASE_URL` is configured as a server-only secret.
- [ ] The two Supabase `NEXT_PUBLIC_` values and `NEXT_PUBLIC_APP_URL` are configured.
- [ ] HTTPS is active and the custom security headers are present.

## Application

- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, and `pnpm run build` pass.
- [ ] A fresh, separate development database has been migrated successfully.
- [ ] The smoke test in `DEPLOYMENT.md` passes.
- [ ] No production secrets or sample legal data are committed.
- [ ] Recovery procedure and external-document backup responsibilities are understood.
- [ ] Supabase Auth rate limits and password policy have been reviewed in the dashboard.
