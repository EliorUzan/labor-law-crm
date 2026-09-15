# Production deployment: Vercel and Supabase

## 1. Supabase production project

Create a production Supabase project separate from development. In Authentication settings, set the production Site URL to the final HTTPS domain, add the exact production redirect URL(s), and disable public sign-up. Provision the sole lawyer account manually in the Supabase dashboard or an approved admin process; the application intentionally has no registration or user-management UI.

Apply the committed migrations from a trusted machine with the production `DATABASE_URL` configured only for that command:

```bash
pnpm run db:migrate
```

Confirm every CRM table has RLS enabled and its owner policy applied. The application accesses CRM tables server-side using Drizzle and scopes every query with the verified Supabase user ID. A direct PostgreSQL connection may use a database role that bypasses RLS, so those application ownership predicates are mandatory and must not be removed. RLS remains defence in depth for Supabase Data API access: every policy restricts rows to `auth.uid() = owner_user_id`. Do not place a service-role key in Vercel or browser code; it is not required by this application.

## 2. Vercel project

Import this repository, set the Node version from `.node-version`, and configure these production environment variables:

| Variable | Classification | Value |
| --- | --- | --- |
| `DATABASE_URL` | Server-only secret | Supabase PostgreSQL connection string with TLS |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Production Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Production Supabase publishable key |
| `NEXT_PUBLIC_APP_URL` | Browser-safe | Final `https://` application URL |
| `GOOGLE_DRIVE_CLIENT_ID` | Server-only | Google OAuth Web application client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Server-only secret | Matching Google OAuth client secret |
| `DOCUMENT_TOKEN_ENCRYPTION_KEY` | Server-only secret | Stable random 32-byte key, encoded as exactly 64 hexadecimal characters |

Use production HTTPS only. Vercel and Supabase provide TLS; do not configure a plain-HTTP production domain. Never prefix `DATABASE_URL` or privileged database credentials with `NEXT_PUBLIC_`.

### Google Drive production setup

The Google Drive connection is configured independently in each deployment
environment. Values in `.env.local` are available only to the local development
server; they are never uploaded to Vercel.

In Vercel → Project → Settings → Environment Variables, add the three server-only
Drive values above for the **Production** environment. Set `NEXT_PUBLIC_APP_URL`
to the exact public URL, for example `https://labor-law-crm.vercel.app`. Create a
new stable encryption value for production with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Store it in the deployment's secret manager and retain it for future deployments.
Changing it later prevents the server from reading previously saved Drive tokens
and temporary verification cookies.

In Google Cloud → Google Auth Platform → Clients, add the exact authorized redirect
URI for the production URL:

```text
https://labor-law-crm.vercel.app/api/documents/google/callback
```

In Google Auth Platform → Audience, choose **External** when office users have
personal Gmail accounts. While the OAuth app remains in Testing, add every CRM
user who should connect Drive as a Google test user. The OAuth client credentials
remain shared deployment configuration; each user authorizes their own Drive
account later in CRM Settings.

Then redeploy Vercel. After deployment, visit Settings and connect Drive again;
the production deployment stores its own encrypted connection and folder choice.
Do not paste client secrets into chat, source control, or browser-accessible
environment variables.

Deploy after `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, and `pnpm run build` pass. The app sends security headers including a CSP, frame denial, MIME-sniffing protection, referrer policy, and a restrictive permissions policy.

## 3. Smoke test

1. Visit a protected URL while logged out and verify redirect to `/login`.
2. Sign in using the manually provisioned lawyer account; verify the Dashboard loads.
3. Create a test Client and Matter, then a Deadline and linked Task.
4. Add a Client charge and payment; verify the balance and monthly income differ correctly.
5. Add a Trust receipt, then a valid release; confirm trust money is excluded from income and client balance.
6. Log out and verify the protected URL is inaccessible.

Keep development and production in separate Supabase projects/databases. Never run migrations or automated tests against live legal-office data.
