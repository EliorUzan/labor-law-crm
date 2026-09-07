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
            ├── Matter notes
            ├── Tasks
            ├── Deadlines
            ├── Important dates
            └── Document references

Accounting records are office-level records.
```

Every application-owned record has `id`, `created_at`, and `updated_at` unless a
record’s append-only behavior makes `updated_at` unnecessary. IDs should be UUIDs
or another generated opaque identifier. A future schema should attach data to the
authenticated account/profile as needed for safe server-side scoping, while still
remaining single-user-first.

## Entities

| Entity | Required fields | Optional / notable fields | Relationships |
| --- | --- | --- | --- |
| `profiles` | authenticated user reference | display/preferences only when needed | One profile per Supabase Auth user; do not hard-code a user. |
| `clients` | name | phone, email, address, notes, status (`potential`, `active`, `former`) | Has many Matters, Financial records, Client obligations. Never stores an Israeli ID number. |
| `matters` | client reference, title | case type, status, open date, case number, court/tribunal, opposing party, opposing-attorney name/phone/email/firm, notes | Belongs to one Client; has related work/history/documents. Opposing attorney fields stay simple Matter leaf data, not a contact graph. |
| `client_obligations` | client reference, title, completion state | matter reference, description, due date | Belongs to Client; may reference Matter; appears globally while open. |
| `financial_records` | client reference, record type, amount, date | matter reference, description/note | Belongs to Client; may reference Matter. Record type distinguishes fee/charge/payment and supports a lightweight balance, not bookkeeping. |
| `tasks` | matter reference, title, done flag | description, due date, deadline reference | Belongs to Matter. Only done/undone status—no priority, assignee, labels, or workflow state. |
| `deadlines` | matter reference, title, due date | description, task reference | Standalone and prominent legal deadline; may reference a Task but is not a Task due date. |
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
- A Deadline’s optional Task association must reference a Task from the same
  Matter.
- Amounts should use an exact decimal/numeric database type, never a floating
  point number. Currency defaults/formatting can be decided with the financial UI;
  do not create multi-currency support without a requirement.
- Deletion behavior will be selected alongside actual UI and retention needs;
  do not silently cascade-delete legal history or financial records.

## Explicit exclusions

No V1 schema is planned for teams, roles, organizations, leads, pipelines,
generic entities/relations, inbox/email synchronization, AI suggestions, file
blobs, OCR, cloud-provider sync tokens, client portals, or bookkeeping/invoices.
