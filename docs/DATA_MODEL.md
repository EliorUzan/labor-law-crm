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
| `matters` | client reference, title | case type, status, open date, case number, court/tribunal, opposing party, opposing-attorney name/phone/email/firm, notes | Belongs to one Client; has related work/history/documents. Opposing attorney fields stay simple Matter leaf data, not a contact graph. |
| `client_obligations` | client reference, title, completion state | matter reference, description, due date | Belongs to Client; may reference Matter; appears globally while open. |
| `financial_records` | client reference, record type, amount, date | matter reference, description/note | Belongs to Client; may reference Matter. Record type distinguishes fee/charge/payment and supports a lightweight balance, not bookkeeping. |
| `tasks` | matter reference, title, done flag | description, deadline reference (`deadline_id`) | Belongs to Matter. A Task may reference one standalone Deadline from the same Matter; it has no separate due-date field. Only done/undone status—no priority, assignee, labels, or workflow state. |
| `deadlines` | matter reference, title, due date | description | Standalone and prominent legal deadline. It does not store a Task reference and is not a Task due date. |
| `important_dates` | matter reference, title, event date | description/type | Matter-level event date, distinct from a Deadline and Task. |
| `matter_history` | matter reference, event date, title | description | Manually maintained milestone; displayed newest first by `event_date`, not creation time. |
| `document_references` | matter reference, display name, location/URL | category, notes, provider, external ID | V1 metadata/reference only; no file storage or synchronization. |
| `accounting_records` | type, date, description | amount, document/link, notes | Office-level lightweight organizational record; not a tax/invoicing engine. |

## Relationship and integrity rules

- A Matter cannot exist without its Client.
- A financial record and client obligation always belong to a Client; their Matter
  reference is optional and, if set, must belong to the same Client.
- Tasks, Deadlines, Important Dates, history entries, and document references
  always belong to a Matter.
- A Task’s optional `deadline_id` must reference a Deadline from the same Matter.
  This is the only Task ↔ Deadline association; `deadlines` has no `task_id`, and
  Tasks have no separate due-date field.
- Matter notes are one optional free-text field on `matters`; there is no
  `matter_notes` table. Dated milestones belong in `matter_history`.
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

## Explicit exclusions

No V1 schema is planned for teams, roles, organizations, leads, pipelines,
generic entities/relations, inbox/email synchronization, AI suggestions, file
blobs, OCR, cloud-provider sync tokens, client portals, or bookkeeping/invoices.
