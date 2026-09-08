# Product Requirements — Israeli Labor-Law CRM

**Document status:** Working specification  
**Primary scope:** V1  
**Product type:** Web-based CRM / case-management system  
**Primary user:** Single Israeli labor-law lawyer  
**Language/UI:** Hebrew-first, RTL-first

---

# 1. Product Purpose

Build a lightweight web-based CRM and case-management system for a small Israeli labor-law office.

The office currently includes:
- one primary lawyer who is the sole regular user of the system;
- occasional cooperation with other lawyers;
- no need for enterprise-scale workflows, team management, complex role hierarchies, or large-firm administration.

The CRM should function as a practical daily work system for:
- client management;
- matter/case management;
- tasks;
- deadlines;
- important dates;
- client obligations;
- payments and amounts owed;
- case history;
- notes;
- document references;
- basic accounting organization;
- global search;
- a central dashboard.

The main product objective is:

> **Reduce administrative overhead and make entering, finding, and reviewing legal-office information faster than using scattered notes, spreadsheets, folders, and email.**

The system should feel like a **smart digital case notebook and work dashboard**, not like a generic enterprise CRM.

---

# 2. Product Design Principles

## PRIN-001 — Keep the system simple

The system is designed for one lawyer.

Do not introduce complexity merely because it may be useful to a larger law firm in the future.

Avoid unless explicitly requested:
- complex multi-user role systems;
- departments;
- teams;
- generic workflow engines;
- sales pipelines;
- relationship graphs;
- microservices;
- event buses;
- generic “entity” frameworks;
- complex approval flows.

---

## PRIN-002 — Hierarchical ownership, global visibility

The main information hierarchy is:

```text
Client
└── Matter
    ├── Matter information
    ├── Important dates
    ├── Deadlines
    ├── Case history
    ├── Notes
    ├── Documents
    └── Tasks
```

However, the user must not be forced to navigate through that hierarchy in order to see important work.

For example:
- tasks belong to Matters but must also appear globally on the Dashboard;
- deadlines belong to Matters but must also appear globally on the Dashboard;
- client obligations belong to Clients but must also appear globally on the Dashboard.

---

## PRIN-003 — Flat UI

The CRM data model may be hierarchical, but the UI should remain shallow.

Leaf information should usually be displayed directly on the relevant page in cards, lists, or sections.

Avoid navigation such as:

```text
Client
→ Finance
→ Payments
→ Payment detail
```

when the information can reasonably appear directly on the Client page.

---

## PRIN-004 — Minimal user input

Creating information should be quick.

Mandatory fields should be limited to the minimum necessary.

The user should not be required to complete long forms in order to create:
- a Client;
- a Matter;
- a Task;
- a Deadline;
- a history entry;
- a payment.

Optional information can be completed later.

---

## PRIN-005 — Hide missing optional information

In normal view mode, optional fields that contain no value should generally not be shown as empty rows or empty placeholders.

Example:

If a Client has no address, the Client page should not display:

```text
Address: —
```

unless there is a specific UX reason to do so.

The Edit form may still show the field.

---

## PRIN-006 — Hebrew-first / RTL-first

The system is intended primarily for Hebrew use.

Requirements:
- main UI language should be Hebrew;
- page layout must support RTL properly;
- forms, tables, navigation, cards, and dialogs must work naturally in RTL;
- English names, emails, URLs, file names, and legal references must still display correctly;
- Unicode/Hebrew search must work correctly.

---

## PRIN-007 — Security and privacy are foundational

Although only one lawyer currently uses the CRM, the system contains confidential legal information.

Security is not considered an optional future feature.

At minimum, V1 should include:
- authentication;
- secure sessions;
- secure storage of secrets;
- secure database access;
- appropriate transport security in deployment;
- no sensitive values exposed in client-side code;
- no confidential information unnecessarily written to logs;
- reasonable backup/recovery planning.

Do not build a complex enterprise authorization system in V1.

---

## PRIN-008 — AI may suggest, but not silently modify legal data

Future AI functionality may:
- summarize;
- classify;
- suggest;
- prepare structured data.

It must not silently modify Matters based on inferred information from emails or other unstructured inputs.

Particularly:
- AI-inferred deadlines must never become authoritative deadlines without explicit user approval.

---

# 3. Main Navigation

The primary V1 navigation should contain approximately:

```text
Dashboard
Clients
Accounting
Settings
```

Global Search and Quick Add should be accessible from the main application shell.

Matters are primarily accessed through Clients and through Dashboard/Search links.

A dedicated Matters listing may be added if it improves usability, but it is not required as a separate top-level conceptual branch.

---

# 4. Dashboard

## DASH-001 — Dashboard is the home page

After login, the Dashboard should be the primary landing page.

Its purpose is to answer:

- What do I need to do?
- What is overdue?
- What deadlines are approaching?
- What important dates are coming up?
- Which clients am I obligated to respond to or act for?
- Which Matters are currently important?
- What financial items need attention?
- What recent information should I review?

---

## DASH-002 — Task summary

The Dashboard should show relevant incomplete tasks.

At minimum:
- overdue tasks;
- tasks with near-term deadlines;
- links to the associated Matter.

Completed tasks should not dominate the Dashboard.

---

## DASH-003 — Deadline summary

Deadlines must have a highly visible Dashboard section separate from Tasks.

The user must be able to quickly identify:
- overdue deadlines;
- deadlines today;
- upcoming deadlines.

Each deadline should link to its Matter.

Deadlines must not be visually buried inside ordinary task lists.

---

## DASH-004 — Important dates

Upcoming Matter-level important dates should appear on the Dashboard.

Examples:
- hearings;
- meetings;
- court dates;
- other significant events.

---

## DASH-005 — Client obligations

Open obligations toward Clients should appear on the Dashboard.

Examples:
- return client call;
- send engagement agreement;
- request missing document;
- send settlement copy;
- update client.

---

## DASH-006 — Matter visibility

The Dashboard should provide a practical view of recent and/or important active Matters.

The exact ranking may initially be simple.

Possible factors:
- recently updated;
- upcoming deadline;
- upcoming important date;
- open tasks.

Do not build a complex scoring engine.

---

## DASH-007 — Financial summary

The Dashboard should include a simple financial overview.

Examples:
- total outstanding client balance;
- recent payments;
- amount received in a useful period such as the current month.

The exact V1 financial widgets may be refined during Dashboard implementation.

---

## DASH-008 — Future AI notifications

V2 may add AI-generated email summaries and suggested actions to the Dashboard.

This is not part of V1.

---

# 5. Client

## CLIENT-001 — Client entity

A Client represents a person.

V1 does not require a separate Organization entity.

---

## CLIENT-002 — Client fields

Required field:
- `name`

Optional fields:
- phone;
- email;
- address;
- notes;
- status.

Do not include an Israeli ID-number field.

---

## CLIENT-003 — Internal Client ID

Each Client must have an automatically generated internal identifier.

The user does not manually enter this ID.

The system may use UUIDs or another appropriate internal identifier.

The ID does not need to be prominently displayed in the normal UI.

---

## CLIENT-004 — Optional field display

All Client fields other than name are optional.

If an optional value is absent:
- do not display the field in normal Client view;
- allow the field to remain available in Edit mode.

---

## CLIENT-005 — Client status

A lightweight Client status is permitted.

Suggested values:

```text
Potential
Active
Former
```

The exact Hebrew labels can be decided during UI implementation.

Do not build a lead/sales pipeline.

---

## CLIENT-006 — Client page

The Client page should be mostly a single dashboard-style page.

It should directly show:
- basic/contact information;
- payments / fees / balance;
- open obligations;
- Matters.

Avoid deep sub-navigation.

---

# 6. No Separate Lead / Inquiry Pipeline

## LEAD-001 — No V1 inquiry system

V1 should not contain a separate CRM sales pipeline for inquiries/leads.

A person may simply be created as a Client with status such as `Potential` if necessary.

The objective is to reduce administrative overhead.

Do not introduce:
- lead scoring;
- opportunity stages;
- sales funnels;
- intake workflow engines.

---

# 7. Client Payments and Fees

## PAY-001 — Financial item ownership

A payment/fee record must belong to a Client.

It may optionally reference a Matter.

Conceptually:

```text
client_id — required
matter_id — optional
```

---

## PAY-002 — Purpose of optional Matter reference

A Client may have multiple Matters.

A payment or fee may:
- apply generally to the Client; or
- relate to one specific Matter.

The user should be able to record either case.

---

## PAY-003 — Minimum financial fields

The financial model should remain lightweight.

Likely fields:
- client;
- matter — optional;
- amount;
- date;
- description or note — optional;
- record type if required to distinguish payment / fee / charge.

The exact schema may be refined during implementation, but avoid building a full accounting engine.

---

## PAY-004 — Client-level financial summary

The Client page should make it easy to understand:
- total paid;
- current amount owed / outstanding;
- relevant payment/fee records.

---

# 8. Client Obligations

## OBL-001 — Client obligation entity

The system must support open obligations toward a Client.

Examples:
- return call;
- send agreement;
- request documents;
- send settlement copy;
- update client.

---

## OBL-002 — Ownership

Each obligation must belong to a Client.

It may optionally reference a Matter.

---

## OBL-003 — Visibility

Open obligations should be visible:
- on the Client page;
- on the Dashboard.

---

## OBL-004 — Simplicity

Keep the obligation model simple.

Do not turn obligations into a complex workflow engine.

If implementation can safely reuse Task infrastructure internally without confusing the UI/domain model, that may be considered, but the user-facing concept should remain clear.

---

# 9. Matter

## MAT-001 — Matter entity

A Matter represents a legal case or legal matter belonging to one Client.

---

## MAT-002 — Internal Matter ID

Each Matter must receive an automatically generated internal identifier.

The user does not manually provide it.

The internal ID does not need to be prominently displayed.

---

## MAT-003 — Matter page philosophy

The Matter page should primarily be one page with directly visible sections.

Avoid a deep tab structure unless a tab becomes necessary because the page becomes unusably long.

---

## MAT-004 — Matter information

Expected Matter information includes:
- title;
- Client;
- matter/case type;
- status;
- open date;
- case number, where applicable;
- court/tribunal, where applicable;
- opposing party;
- opposing attorney details;
- notes;
- important dates;
- deadlines;
- case history;
- tasks;
- document references.

Not every field must be mandatory.

---

## MAT-005 — Opposing attorney

The Matter should contain a simple opposing-attorney information section.

Possible fields:
- name;
- phone;
- email;
- firm.

This is leaf information on the Matter.

Do not create a generalized contact/entity relationship system in V1.

---

## MAT-006 — Matter status

Matter status should be simple and useful for a single lawyer.

The exact allowed values should be defined during the Matter module design.

Avoid workflow-engine complexity.

---

# 10. Case History

## HIST-001 — Purpose

Case History records important manually maintained milestones in a Matter.

It is not intended to be a complete automatic audit timeline.

---

## HIST-002 — History entry fields

Each Case History entry contains:

- date;
- title;
- description.

---

## HIST-003 — Adding history

Adding a Case History entry should be very quick.

Use a simple form with:
- Date
- Title
- Description
- Save

---

## HIST-004 — Ordering

History entries must be displayed:
- oldest first;
- based on the user-entered event date.

Do not sort primarily by record creation time; use creation time only as a stable
ascending tie-breaker for entries on the same event date.

---

## HIST-005 — Example

```text
28 Aug 2026
Statement of defense filed
Filed before the regional labor court.

07 Sep 2026
Settlement proposal received
Opposing counsel proposed ₪85,000 plus costs.
```

---

# 11. Matter Notes

## NOTE-001 — Notes

A Matter has multiple simple notes entries for free-text information that does not
necessarily represent a dated Case History milestone. Each note contains required
content and an automatically generated creation timestamp. Notes display newest
first by creation time. Notes have no title, category, priority, tags, author
selector, or rich workflow state.

Notes are distinct from Case History: Case History uses a user-entered event date,
title and optional description for significant milestones, and displays oldest
first by event date.

---

# 12. Tasks

## TASK-001 — Task purpose

Tasks represent actionable work associated with a Matter.

---

## TASK-002 — Minimal Task model

A Task should contain only:

- title — required;
- description — optional;
- deadline — optional;
- status — done / undone.

Do not add by default:
- priority;
- assignee;
- category;
- labels;
- workflow status;
- estimated effort;
- subtasks.

---

## TASK-003 — Task completion UI

Status should be represented as a simple checkbox:

```text
☐ Undone
☑ Done
```

The normal interaction should allow fast completion/uncompletion.

---

## TASK-004 — Task deadline

A Task may optionally reference or contain a deadline.

However, standalone Matter Deadlines are a separate important concept and must remain separately visible.

---

## TASK-005 — Completed tasks

Completed tasks should remain available for historical review.

The Matter UI should distinguish:
- pending tasks;
- completed tasks.

Pending tasks should be more prominent.

---

# 13. Deadlines

## DEAD-001 — Deadline is a standalone Matter-level item

A Deadline is not merely a Task due date.

It must exist as a standalone prominent item associated with a Matter.

---

## DEAD-002 — Task association

A Deadline may optionally be associated with a Task.

Examples:

```text
Deadline:
File response by 14 Sep

Task:
Prepare and file response
→ associated with the 14 Sep deadline
```

A Deadline does not require a Task.

---

## DEAD-003 — Visibility

Deadlines must be highly visible:
- on the Matter page;
- on the Dashboard;
- in overdue/upcoming views.

---

## DEAD-004 — Prominence

The UI must visually distinguish Deadlines from ordinary Tasks.

Legal deadlines should not be easy to overlook.

---

## DEAD-005 — AI safety

Future AI features may suggest a Deadline.

AI must never silently create or modify an authoritative legal Deadline from an email or document without lawyer confirmation.

---

# 14. Important Dates

## DATE-001 — Matter-level Important Dates

A Matter can have Important Dates separate from Tasks and Deadlines.

Examples:
- hearing;
- meeting;
- court appearance;
- conference;
- other significant event.

---

## DATE-002 — Purpose

An Important Date represents an event or date that should be visible even when no action/task is required.

---

## DATE-003 — Dashboard visibility

Upcoming Important Dates should appear on the Dashboard.

---

# 15. Documents

## DOC-001 — V1 uses document references

V1 should not build a complete legal-document storage platform.

Instead, the CRM stores references to files.

---

## DOC-002 — Document reference fields

A document reference may include:
- display name;
- Matter;
- category/type — optional;
- URL or location reference;
- notes — optional.

---

## DOC-003 — Supported V1 reference types

A reference may point to:
- Google Drive;
- Dropbox;
- another cloud service;
- a local path/reference.

The CRM does not need to synchronize the underlying file in V1.

---

## DOC-004 — Local-machine limitation

A normal web browser cannot safely receive arbitrary continuous access to local filesystem folders.

Therefore:
- V1 must not assume transparent local-folder synchronization;
- local file references may be stored as metadata/reference only where practical.

---

## DOC-005 — V2 cloud integration

V2 should support real integration with:
- Google Drive;
- Dropbox.

Some Clients may use different storage providers, so the design should not assume one provider only.

Future-compatible metadata may include:

```text
provider
external_id
url
display_name
```

Do not implement this integration in V1.

---

# 16. Accounting

## ACC-001 — Top-level Accounting section

Accounting should exist as a top-level section alongside Clients.

---

## ACC-002 — Purpose

Accounting is intended for organizing law-office administrative/accounting information such as:
- tax-related files;
- expenses;
- accounting documents/references;
- payment/accounting notes;
- document links.

---

## ACC-003 — Not a bookkeeping engine

Do not build a full Israeli accounting, invoicing, VAT, or tax-reporting platform.

The CRM may organize references and lightweight records.

External accounting software can remain authoritative where appropriate.

---

## ACC-004 — Basic Accounting record

A simple record may contain:
- type;
- date;
- description;
- amount — optional depending on type;
- document/link — optional;
- notes — optional.

Exact fields should be refined when implementing the module.

---

# 17. Global Search

## SEARCH-001 — Global search

Global Search is required in V1.

It should be easily accessible from the application shell.

---

## SEARCH-002 — Minimum searchable entities

At minimum, search should find:
- Clients;
- Matters.

Where practical, also search:
- Matter notes;
- Case History titles/descriptions.

---

## SEARCH-003 — Search behavior

Search should be optimized for quick navigation.

The user should be able to type a name or meaningful case term and quickly reach the relevant Client or Matter.

Avoid building an advanced enterprise search engine in V1.

---

# 18. Quick Add

## QA-001 — Persistent Quick Add

The application should provide a persistent `+ New` / Quick Add action.

---

## QA-002 — Quick Add targets

Likely Quick Add options:

- Client;
- Matter;
- Task;
- Payment;
- Case History entry;
- Deadline;
- Important Date.

The exact menu can be refined based on usage.

---

## QA-003 — Minimal forms

Quick Add forms should request only necessary fields.

Example:

```text
New Task

Title: ________
Matter: [select]
Deadline: [optional]

[Save]
```

The user should not need to navigate deeply before entering common information.

---

# 19. Authentication and User Model

## AUTH-001 — Single-user-first

The system is currently intended for one lawyer.

---

## AUTH-002 — Authentication

V1 must require secure authentication.

Do not expose CRM data publicly.

---

## AUTH-003 — Internal user model

Even though there is one current user, the application should use a normal internal user/account model rather than hardcoding one identity directly into application logic.

---

## AUTH-004 — No complex RBAC

V1 does not require:
- multiple staff roles;
- permission matrices;
- departments;
- teams;
- per-Matter access control.

Do not implement these unless requirements change.

---

# 20. Settings

## SET-001 — Settings section

A simple Settings area should exist for configuration that does not belong to case/client data.

Possible items:
- account/profile;
- application preferences;
- future integrations.

Keep V1 minimal.

---

# 21. V1 Scope Summary

V1 includes:

- secure authentication;
- Hebrew-first / RTL-first app shell;
- Dashboard;
- Clients;
- Client status;
- Client payments/fees and outstanding balances;
- Client obligations;
- Matters;
- opposing attorney information;
- Matter status;
- Important Dates;
- standalone Deadlines;
- Case History;
- Matter notes;
- minimal Tasks;
- Document References;
- basic Accounting;
- Global Search;
- Quick Add;
- foundational security/privacy practices.

---

# 22. Explicitly Out of Scope for V1

Do not implement in V1 unless the product requirements are explicitly revised:

- Gmail/email synchronization;
- AI email summaries;
- automatic AI case modification;
- Google Drive API synchronization;
- Dropbox API synchronization;
- automatic local filesystem synchronization;
- full document-management system;
- OCR pipeline;
- AI legal assistant;
- free-text AI case creation;
- client portal;
- complex multi-user permissions;
- relationship/entity graph;
- organization/contact hierarchy;
- lead/sales pipeline;
- workflow engine;
- full Israeli accounting/bookkeeping engine;
- microservices architecture;
- event bus;
- native mobile application.

---

# 23. V2 — Email Integration and AI Assistance

## V2-EMAIL-001 — Email synchronization

V2 may synchronize new emails from the lawyer's email account.

---

## V2-EMAIL-002 — AI email analysis

An AI agent may:
- determine the likely relevant Client;
- determine the likely relevant Matter;
- summarize the email;
- prepare a suggested note;
- suggest a Case History entry;
- suggest Tasks;
- show a Dashboard notification.

---

## V2-EMAIL-003 — Human approval

AI-created suggestions must be presented for review.

The AI must not silently modify a Matter.

---

## V2-EMAIL-004 — Deadline protection

An AI-inferred date or deadline must not automatically become an authoritative Matter Deadline.

The lawyer must explicitly approve it.

---

# 24. V2 — Google Drive and Dropbox

## V2-DOC-001

Add Google Drive integration.

## V2-DOC-002

Add Dropbox integration.

## V2-DOC-003

Support different storage providers because different Clients may share documents using different tools.

## V2-DOC-004

Maintain a provider-neutral internal document-reference design where practical.

---

# 25. V3+ — Free-Text AI Case Creation

## AI-CASE-001 — Natural-language input

The lawyer will be able to describe a new Client/Matter in free text.

Example:

> Open a new matter for David Cohen, phone ..., against ABC Ltd. The opposing attorney is Sarah Levy. Hearing is on November 3. Review the employment agreement by September 15 and call David tomorrow.

---

## AI-CASE-002 — Structured output

The AI must return a well-defined structured object, preferably strict JSON.

Possible structure:

```json
{
  "client": {},
  "matter": {},
  "opposingAttorney": {},
  "importantDates": [],
  "deadlines": [],
  "tasks": [],
  "history": [],
  "notes": []
}
```

---

## AI-CASE-003 — Validation

The AI output must be validated against an application-controlled schema.

Invalid output must not be written to the database.

---

## AI-CASE-004 — Preview and approval

Flow:

```text
Free text
→ AI
→ JSON
→ schema validation
→ preview
→ lawyer approval
→ application code writes database records
```

---

## AI-CASE-005 — No arbitrary database access

The AI agent must not generate and directly execute arbitrary database operations.

Normal application code should convert approved structured data into a controlled database transaction.

---

# 26. Suggested Data Model Direction

This is a conceptual starting point, not a final schema.

Expected V1 entities may include approximately:

```text
users

clients
client_obligations

payments

matters
matter_history
matter_notes
matter_dates
deadlines

tasks

documents

accounting_records
```

Exact table structure should be finalized in `docs/DATA_MODEL.md`.

Avoid adding generic enterprise entities without a concrete V1 requirement.

---

# 27. Architecture Direction

The intended architecture is a simple web-based modular monolith.

Preferred direction:

```text
Browser
   ↓
Next.js / TypeScript application
   ↓
Application/domain logic
   ↓
PostgreSQL
```

Managed services may be used to reduce infrastructure and maintenance burden.

Current preferred technologies to evaluate/finalize:
- Next.js;
- TypeScript;
- PostgreSQL;
- Tailwind CSS;
- Zod or equivalent;
- a suitable PostgreSQL ORM;
- managed auth/database solution, with Supabase as a strong candidate.

Do not introduce microservices without a concrete requirement.

---

# 28. Codex Development Strategy

Development should be divided into focused threads.

Suggested sequence:

```text
Thread 0 — Bootstrap + Architecture
Thread 1 — Database + Authentication
Thread 2 — Application Shell + Dashboard
Thread 3 — Clients + Payments + Obligations
Thread 4 — Matters + Case History + Notes
Thread 5 — Tasks + Deadlines + Important Dates
Thread 6 — Documents + Accounting
Thread 7 — Global Search + UX + Hebrew/RTL
Thread 8 — Security + Tests + Deployment
```

Later:

```text
V2 — Email Integration
V2 — AI Email Processing
V2 — Google Drive / Dropbox
V3+ — AI Case Creation
```

---

# 29. Codex Working Rules

Any AI/Codex thread working on the project should:

1. Read `CRM_AI_PROJECT_CONTEXT.md`.
2. Read this `PRODUCT_REQUIREMENTS.md`.
3. Read `AGENTS.md`.
4. Read module-specific architecture/data-model docs where relevant.
5. Inspect existing code before changing it.
6. Reuse established components and conventions.
7. Implement only the requested bounded scope.
8. Avoid unrelated refactors.
9. Avoid adding future features prematurely.
10. Preserve Client → Matter ownership.
11. Preserve separate Task / Deadline / Important Date concepts.
12. Keep forms minimal.
13. Preserve Hebrew/RTL support.
14. Use migrations for database schema changes.
15. Keep secrets outside source control.
16. Run relevant:
    - type checks;
    - lint;
    - tests;
    - build validation.
17. Report:
    - files changed;
    - migrations/schema changes;
    - tests run;
    - unresolved issues.

---

# 30. Product Philosophy Summary

> **A lightweight, Hebrew-first personal legal case-management CRM for one labor-law lawyer: Client → Matter → Tasks/Deadlines, with a powerful Dashboard, minimal data entry, clear client/financial obligations, easy Case History, and future AI/cloud integrations added only after the core CRM is stable.**
