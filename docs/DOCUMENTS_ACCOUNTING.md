# V1 Documents and Accounting — Thread 6

## Documents

Document References belong directly to one owned Matter. V1 stores only metadata
and a location/reference: no file upload, blobs, cloud-provider APIs, OAuth,
synchronization, OCR, parsing, or automatic classification.

The Matter page supports adding and editing a display name, required location,
optional category, optional provider, and optional notes. The existing optional
`external_id` field remains available for a future provider integration but is
not collected in the V1 form. References are newest first. Only ordinary HTTPS
URLs without embedded credentials receive a new-tab **פתח** link; local paths and
all other references remain plain text.

Every document query joins the owned Matter and Client. Document mutations
authenticate, validate the Matter and record IDs, verify Matter ownership, and
scope updates by record ID, Matter ID, and owner ID.

## Accounting

Accounting Records are office-level, owner-scoped records, distinct from Client
financial records. They do not alter Client balances and do not represent invoice
issuance, bookkeeping, VAT/tax calculation, payroll, or bank reconciliation.

The top-level Accounting page supports add/edit of required type, date, and
description, plus optional exact-decimal amount, document/reference, and notes.
Records are ordered by accounting date newest first; amounts are stored in the
existing `numeric(14,2)` column and formatted as Israeli shekels without numeric
floating-point conversion. Document references are displayed safely using the
same HTTPS-only link policy as Matter documents.

## Schema

No migration is required: the checked-in initial schema already includes
`document_references` and `accounting_records`, their ownership columns, indexes,
foreign key for Matter documents, exact `numeric(14,2)` amount type, and RLS
policies.

## Financial-control follow-up

Migration `0004_accounting_financial_control.sql` adds explicit owner-scoped
financial-control tables. Existing `accounting_records` rows are deliberately
preserved as unsorted legacy history and excluded from new totals: automatic
classification could misstate old data. VAT policy is defined once as
`VAT_RATE_PERCENT = 18`; manually entered VAT liabilities remain authoritative.
