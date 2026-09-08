# Initial V1 data model

This is a domain-model agreement for later focused implementation threads, not a
database migration. Names are illustrative and can be adjusted while preserving
the documented meanings. All records will receive generated internal identifiers;
the user never supplies a Client or Matter identifier.

## Ownership map

```text
Authenticated user
  └── Clients
       ├── Client obligations
       ├── Financial records
       └── Matters
            ├── Case-history entries
            ├── Tasks
            ├── Deadlines
            ├── Important dates
            └── Document references

Accounting records are office-level records.
```

Every application-owned record has generated UUID `id`, `owner_user_id`,
`created_at`, and `updated_at`. `owner_user_id` is the authenticated Supabase user
UUID; application code must source it from the verified server session and scope
all reads/writes by it. It remains single-user-first without assuming one user is
authorized to see another user's records.

## Entities

| Entity | Required fields | Optional / notable fields | Relationships |
| --- | --- | --- | --- |
| `profiles` | authenticated user reference | display/preferences only when needed | One profile per Supabase Auth user; do not hard-code a user. |
| `clients` | name | phone, email, address, notes, status (`potential`, `active`, `former`) | Has many Matters, Financial records, Client obligations. Never stores an Israeli ID number. |
| `matters` | client reference, title | case type, status, open date, case number, court/tribunal, opposing party, opposing-attorney name/phone/email/firm | Belongs to one Client; has related work/history/notes/documents. Opposing attorney fields stay simple Matter leaf data, not a contact graph. |
| `client_obligations` | client reference, title, completion state | matter reference, deadline reference, description, independent due date only when unpaired | Belongs to Client; a linked Deadline belongs to the same Client and may be linked without separately selecting its Matter; appears globally while open. |
| `financial_records` | client reference, record type, amount, date | matter reference, description/note | Belongs to Client; may reference Matter. Record type distinguishes fee/charge/payment and supports a lightweight balance, not bookkeeping. |
| `tasks` | matter reference, title, done flag | description, deadline reference (`deadline_id`) | Belongs to Matter. A Task may reference one standalone Deadline from the same Matter; it has no separate due-date field. Only done/undone status—no priority, assignee, labels, or workflow state. |
| `deadlines` | matter reference, title, due date | description | Standalone and prominent legal deadline. It does not store a Task reference and is not a Task due date. |
| `important_dates` | matter reference, title, event date | description/type | Matter-level event date, distinct from a Deadline and Task. |
| `matter_notes` | matter reference, content | generated creation/update timestamps | Informal working note. Displayed newest first by `created_at`; no title, tags, category, priority, or author selector. |
| `matter_history` | matter reference, event date, title | description | Manually maintained milestone; displayed oldest first by `event_date`, then creation time for ties. |
| `document_references` | matter reference, display name, location/URL | category, notes, provider, external ID | V1 metadata/reference only; no file storage or synchronization. |
| `accounting_records` | type, date, description | amount, document/link, notes | Office-level lightweight organizational record; not a tax/invoicing engine. |

## Relationship and integrity rules

- A Matter cannot exist without its Client.
- A financial record and client obligation always belong to a Client; their Matter
  reference is optional and, if set, must belong to the same Client.
- Client Obligations remain Client-level entities. An Obligation may optionally
  reference a Matter and may independently reference a Deadline owned by the
  same Client. Nullable `client_obligations.deadline_id` supports zero or many
  obligations per Deadline. The owner/Client/Matter FK protects an explicitly
  selected Matter; the owner/Deadline FK and server lookup protect the Deadline's
  owner and Client. A CHECK forbids independent `due_date` alongside a Deadline. Choosing a
  Deadline explicitly replaces that optional date; existing unpaired dates are
  untouched by migration. Unpairing clears only the association, never records.
- Tasks, Deadlines, Important Dates, history entries, and document references
  always belong to a Matter.
- A Task’s optional `deadline_id` must reference a Deadline from the same Matter.
  This is the only Task ↔ Deadline association; `deadlines` has no `task_id`, and
  Tasks have no separate due-date field. A Task form may create that standalone
  Deadline and its association together.
- Matter Notes belong to a Matter in `matter_notes`. Each has required content,
  an owner and generated timestamps; ordinary notes do not have a user-entered
  date. They display newest first by `created_at`. Dated milestones belong in
  `matter_history`, which displays oldest first by `event_date`.
- Thread 4 Matter forms accept optional status `active`, `waiting`, or `closed`
  (Hebrew: פעיל, בהמתנה, נסגר), or unset. The existing nullable text column is
  retained; no migration is needed. Legacy free-text values remain visible and
  require an explicit selection when editing. Only the title is required in the
  Matter form. The Client and authenticated owner are supplied by server context.
- Case History requires an event date and title; description is optional. Entries
  are ordered by event date ascending, with creation time and ID only breaking
  ties. Corrections update date/title/description; no deletion is exposed.
- Amounts should use an exact decimal/numeric database type, never a floating
  point number. Currency defaults/formatting can be decided with the financial UI;
  do not create multi-currency support without a requirement.
- The initial migration uses restrictive foreign keys. A Client, Matter, Deadline,
  or other referenced record cannot be deleted while its legal/financial history
  remains. There is intentionally no cascade deletion.
- Composite foreign keys enforce Client/Matter ownership consistency, including a
  linked Client obligation or Financial record Matter and a Task Deadline when
  those optional references are set. Future server writes must still use the
  authenticated owner value and validate input at their boundary.

## Thread 5 work-management semantics

- The existing schema is retained without a migration: `tasks.deadline_id` is
  nullable, references a Deadline in the same owned Matter, and is the only
  Task/Deadline relationship. Tasks have no independent due date.
- `deadlines.deadline_at` and `important_dates.event_at` are existing
  `timestamptz` columns. Forms explicitly request Israeli date/time; the server
  interprets wall time using `Asia/Jerusalem`, and displays use `he-IL`.
  Actual date-only fields such as Case History `event_date` remain date-only.
- Nonexistent spring DST times are rejected. A newly entered repeated autumn
  hour uses its first occurrence. Editing a record without changing its local
  date/time preserves the original instant (including a second-occurrence time
  or sub-second precision).
- Important Date type stays nullable free text. The suggested Hebrew types map
  to `hearing`, `meeting`, `mediation`, and `other`; custom/legacy text remains
  supported.
- Completion belongs solely to Tasks. It does not complete, delete, or hide a
  standalone Deadline. All past Deadlines and Important Dates stay on the Matter.
  Upcoming Important Dates are filtered by their actual instant on Dashboard.
- See `docs/WORK.md` for actions, queries, UI, tests, and local acceptance steps.

## Thread 5 follow-up: optional pairing

Migration `0002_obligation_deadline_pairing.sql` adds the nullable obligation
Deadline column, composite FK, two CHECKs and a supporting reverse-lookup index.
It changes no existing rows. Task pairing/schema remains unchanged.

Client forms clear Deadline selection when Matter changes or is removed. Server
actions reject forged/stale cross-Matter combinations rather than silently
reassigning a Deadline. Client and Dashboard reads join the current Deadline.
Deadline cards show their linked Tasks and Client Obligations; completing either
does not modify the Deadline. Mutations revalidate affected Client/Matter pages
and Dashboard, including the original Matter after an obligation moves.

See `docs/DEADLINE_PAIRING.md` for verification and exact local acceptance steps.

## Explicit exclusions

No V1 schema is planned for teams, roles, organizations, leads, pipelines,
generic entities/relations, inbox/email synchronization, AI suggestions, file
blobs, OCR, cloud-provider sync tokens, client portals, or bookkeeping/invoices.
