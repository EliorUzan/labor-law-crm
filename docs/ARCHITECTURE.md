# Architecture

## Chosen stack

The CRM is a **Next.js modular monolith** using the App Router, TypeScript in
strict mode, Tailwind CSS, PostgreSQL, Zod, Supabase, and Drizzle ORM.

- **Next.js + TypeScript** keeps the web UI and server-side application code in
  one understandable repository and deployment.
- **Supabase** is the managed PostgreSQL and authentication provider. It reduces
  operational work while providing hosted backups, TLS, secure auth sessions, and
  a clear path to managed database access.
- **Drizzle ORM** is the database access and migration tool. Its SQL-like typed
  schemas and generated migrations are small, explicit, and easy to review. It
  avoids the ceremony of a larger data-access layer while retaining typed queries.
- **Tailwind CSS** provides a small, local styling foundation without committing
  the product to a component framework before real UI patterns exist.
- **Zod** validates all external inputs at server boundaries. It is also suitable
  for future AI proposal validation, but no AI functionality is implemented now.

This combination is preferred over a self-hosted database/auth stack because the
product has one primary user and benefits more from low maintenance than from
infrastructure flexibility. It is preferred over direct browser database access
because confidential legal data remains behind server-side application logic.

## Application structure

```text
src/
  app/          # Next.js routes, layouts, and route-specific UI
  components/   # Shared presentation components, introduced only when needed
  db/           # Drizzle client, schemas, and migration configuration
  lib/          # Small shared utilities and environment validation
  modules/      # V1 domain modules; see modules/README.md
docs/           # Product, architecture, and domain-model decisions
```

Modules will be added in focused implementation threads: dashboard, clients,
matters, work (tasks/deadlines/important dates), accounting, documents, search,
and settings. The hierarchy remains Client → Matter. Dashboard and search consume
those domain records without changing their ownership.

## Frontend and backend boundary

React Server Components are the default. UI that needs browser interaction will
be a small Client Component. Database queries, writes, environment validation for
secrets, authorization checks, and input validation stay on the server, using
server actions or route handlers as appropriate. Browser code may receive only
the minimum display data required for its screen.

There is no separate API service, microservice fleet, event bus, or generic
repository/service abstraction. Route/module code may call focused server-side
application functions directly.

## Database access and schema changes

`src/db/client.ts` contains the server-only Drizzle connection factory and
`src/db/schema.ts` contains the V1 schema. Checked-in SQL migrations live in
`src/db/migrations`; `pnpm db:generate` creates a migration and `pnpm db:migrate`
applies it. Every schema change must have a reviewed migration; no production
schema editing through an ad-hoc dashboard is the source of truth. Database
credentials remain server-only in `DATABASE_URL`.

All application records carry `owner_user_id`, the UUID from Supabase Auth.
Server-side code obtains it only through the verified auth helper and scopes each
Drizzle query or write with it. The initial migration also enables RLS with
matching authenticated-owner policies as defence in depth; CRM data is still not
queried from browser code.

## Authentication and data protection

Supabase Auth provides email/password sign-in, cookie-backed session handling, and
an `auth.users` identity. V1 has one regular lawyer user and no public user
registration: the lawyer account is provisioned manually through Supabase. The
application uses that authenticated identity for normal access checks; it does not
hard-code a lawyer identity. A small internal profile record may be added only if
application preferences require it.

V1 has no teams, role matrix, or per-matter permissions. `src/proxy.ts` refreshes
the Supabase session and redirects unauthenticated traffic to `/login`; protected
pages independently verify claims through `requireAuthenticatedUserId`. Do not
build user management or invitation flows. Sensitive values are never placed in
`NEXT_PUBLIC_*` variables, logs, or client bundles (the Supabase URL and
publishable key are intentionally public). Production deployment must use HTTPS
and Supabase backup/recovery settings should be reviewed before live data is
imported.

## Deployment

Deploy the Next.js application to Vercel (or another managed Next.js host) and
use a managed Supabase project for PostgreSQL/Auth. Store production environment
variables in the host’s secret manager. Apply Drizzle migrations through a
controlled deployment/CI step before a compatible application release. A simple
single environment plus a separate development project is sufficient initially;
do not introduce staging infrastructure unless actual use warrants it.

## Documents and desktop

The optional Electron shell loads the same Next.js CRM. Node integration remains
disabled, with context isolation, sandboxing, and exact-origin/main-frame IPC
validation. Its narrow native bridge chooses/verifies a Google Drive root,
selects files, accepts native drops, and opens validated local document paths.
Absolute paths remain machine-local and scoped by CRM origin, user and cloud root.

Owner-scoped Documents and finite parent links retain durable CRM UUIDs. They now
store Drive IDs/web URLs alongside canonical relative paths. Google OAuth/API
access resolves web identities, verifies cloud ancestry and creates new files
under CRM / Client / Matter. Desktop sync remains Google's responsibility.
Existing files stay in place; outside files and symlink/path escapes fail closed.

Refresh tokens are encrypted in a server-only table with RLS and no Data API
grants. The root verification uses a temporary cloud file synchronized to the
candidate desktop folder. See DOCUMENT_MODEL.md and V2_DOCUMENTS_AND_DESKTOP.md.

## Future email and AI integrations

Email and AI integrations are deferred. When implemented, they will be an
optional module at the server boundary: an integration fetches external input,
creates a validated *proposal*, and presents it to the lawyer. Normal application
code validates and persists only explicitly approved changes in a transaction.
No AI code receives arbitrary database access; inferred deadlines can never become
authoritative without human confirmation.
