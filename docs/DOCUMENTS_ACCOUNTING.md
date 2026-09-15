# Accounting — Thread 6

## Document correction

The V1 Matter document-reference CRUD feature was removed and is not a document
migration source. V2 uses filesystem-first `documents` and `document_links`; see
[DOCUMENT_MODEL.md](DOCUMENT_MODEL.md). Existing accounting `document_link`
fields remain ordinary optional HTTPS references until a V2 Document is explicitly
linked to the relevant accounting record.

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
