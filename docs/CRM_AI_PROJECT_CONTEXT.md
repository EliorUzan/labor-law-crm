# Israeli Labor-Law CRM — AI Project Context

> **Purpose:** Read this file at the start of any AI/Codex conversation working on this project.  
> This is a compact context file, not the full product specification.  
> When available, the detailed requirements document is the source of truth for exact feature behavior.

## 1. Product Summary

Build a **simple, Hebrew-first, web-based CRM / case-management system for a small Israeli labor-law office**.

Current office structure:
- One primary lawyer / sole regular user.
- Occasional cooperation with other lawyers.
- Do **not** design for an enterprise law firm.
- Avoid unnecessary roles, teams, permissions matrices, workflow engines, microservices, or generic CRM abstractions.

Primary design goal:

> The CRM must reduce administrative overhead. Entering and finding information should be faster than using ad-hoc notes, spreadsheets, email, or folders.

The product should feel like a **smart digital case notebook + dashboard + reminders + financial tracking**, not Salesforce.

---

## 2. Core Product Principles

1. **Keep it simple.**
2. **Single-user-first architecture.**
3. **Hierarchical ownership, global visibility.**
   - Data belongs under Client → Matter.
   - Important tasks, deadlines, obligations, etc. must also surface globally on the Dashboard.
4. **Flat UI, not deep navigation.**
   - Leaf information should appear directly in dashboard-like sections/cards.
   - Avoid pages that only lead to more pages/buttons.
5. **Minimal data entry.**
   - Most fields should be optional.
   - Do not force the lawyer to complete long forms.
6. **Hide empty optional information.**
   - If an optional Client field has no value, do not show an empty placeholder in normal viewing mode.
7. **Hebrew-first and RTL-first.**
8. **Security and privacy are foundational**, even though there is currently only one user.
9. **Do not add future/enterprise abstractions unless required by the current specification.**
10. **AI may suggest; it must not silently modify legal case data.**

---

## 3. Core CRM Hierarchy

```text
CRM
├── Dashboard
├── Clients
│   └── Client
│       ├── Basic/contact information
│       ├── Payments / fees / money owed
│       ├── Open obligations toward client
│       └── Matters
│           └── Matter
│               ├── Basic case information
│               ├── Status
│               ├── Opposing attorney details
│               ├── Important dates
│               ├── Deadlines
│               ├── Case history
│               ├── Notes
│               ├── Document references
│               └── Tasks
├── Accounting
└── Settings
```

The hierarchy above describes ownership/data organization.  
The actual UI should remain shallow.

---

## 4. Dashboard

The Dashboard is the CRM home page and should answer:

- What do I need to do?
- What deadlines are approaching?
- What important dates are coming up?
- Which obligations toward clients are still open?
- Which matters need attention?
- What financial items need attention?
- What happened recently / what should I review?

Expected dashboard sections include:
- Tasks due / overdue
- Upcoming deadlines
- Important dates
- Open client obligations
- Recent / important matters
- Basic financial summary
- Later: AI-generated email notes/notifications

---

## 5. Client Model

Required:
- `name`

Optional:
- phone
- email
- address
- notes
- status

Rules:
- **Do not store an Israeli ID-number field.**
- All fields except `name` are optional.
- Empty optional fields should be hidden in normal display.
- Internal `client_id` is generated automatically by the system.
- Client status may be simple, e.g. Potential / Active / Former.

Client page should directly show:
- client details
- payments / fees
- outstanding amount
- open obligations
- matters

### Payments / Fees

A financial item should support:
- client — required
- matter — optional
- amount
- date
- description / note as needed

Keep the financial model lightweight.

### Client Obligations

Examples:
- Return call
- Send engagement agreement
- Request documents
- Send settlement copy
- Update client

Obligation belongs to a Client and may optionally reference a Matter.

It may also optionally reference one Deadline from any Matter owned by that
same Client and authenticated owner; selecting that Deadline does not require
the Obligation itself to select a Matter. Multiple obligations can share one
Deadline; unlinking never deletes records. Paired
obligations read the Deadline's date instead of retaining an independent due
date; unpaired obligations keep the existing optional due-date behavior.

---

## 6. Matter Model

Internal `matter_id` is generated automatically.

Matter page should be mainly one page with direct sections, not a deep tab/tree structure.

Expected information:
- title
- client
- matter/case type
- status
- open date
- case number if relevant
- court / tribunal if relevant
- opposing party
- opposing attorney:
  - name
  - phone
  - email
  - firm
- notes
- important dates
- deadlines
- case history
- tasks
- document references

Do not introduce generalized entity/relationship models in V1.

---

## 7. Case History

Case history is **manually maintained**.

Entry fields:
- date
- title
- description

Rules:
- Very easy to add.
- Display newest → oldest according to the date entered.
- It represents important milestones, not a complete automatic event log.

Example:
- 07 Sep 2026 — Settlement proposal received
- 28 Aug 2026 — Statement of defense filed

---

## 8. Tasks, Deadlines, Important Dates

These are related but distinct concepts.

### Task

Keep Task intentionally minimal:

- title — required
- description — optional
- deadline — optional
- status — checkbox only:
  - empty square = undone
  - checked = done

Do **not** add unnecessary fields such as priority, assignee, category, workflow state, etc. unless requirements change.

### Deadline

Tasks and Deadlines are independent Matter-level entities. A Task may optionally
reference one Deadline from the same Matter using `tasks.deadline_id`. Multiple
Tasks may share it; the date stays exclusively on the Deadline.

Deadline is a standalone prominent entity/item under a Matter.

A deadline may also be referenced by / associated with a Task. The Task form
can create a new standalone Deadline directly, with its required title and
date, and link it immediately.

Deadline forms request a date first. Time is optional behind an explicit button;
an omitted time is stored as 17:00 in Israel time.

Deadlines must be highly visible:
- Matter page
- Dashboard
- overdue/upcoming views

Do not reduce deadlines to ordinary task due dates.

### Important Date

Important Dates are separate Matter-level items.

Examples:
- Hearing
- Meeting
- Court date
- Other important event

They are not necessarily actionable tasks.

---

## 9. Documents

### V1

Do **not** build full document storage.

Use **document references**:
- name
- matter
- type/category if useful
- URL or location reference
- notes

May reference:
- Google Drive URL
- Dropbox URL
- other cloud URL
- local path/reference

Browser limitations mean direct arbitrary local-machine sync is not a V1 assumption.

### V2

Plan for:
- Google Drive integration
- Dropbox integration
- clients using different storage providers
- richer document handling

Future-compatible document references may use:
- provider
- external ID
- URL
- display name

---

## 10. Accounting

Accounting is a **top-level section**, alongside Clients.

Purpose:
- office/accounting administrative records
- tax-related files/references
- expenses
- payment/accounting notes
- document links

Do **not** build a full Israeli bookkeeping / invoicing platform in V1.

Keep this module modest and organizational.

---

## 11. Global Search

Global search is approved for V1.

It should make it easy to locate:
- clients
- matters
- relevant notes/history where practical

Search should be easy to access from the main UI.

---

## 12. Quick Add

Approved for V1.

Provide a persistent `+ New` / Quick Add entry point.

Likely actions:
- Client
- Matter
- Task
- Payment
- Case-history entry
- Deadline / important date as appropriate

Forms should request only the minimum mandatory data.

Example:

```text
New Task
Task: __________
Matter: [select]
Deadline: [optional]
[Save]
```

---

## 13. V1 Scope

V1 should include:

- Authentication for the single lawyer
- Dashboard
- Clients
- Payments / fees / outstanding amounts
- Client obligations
- Matters
- Opposing attorney information
- Case status
- Important dates
- Standalone deadlines
- Case history
- Notes
- Minimal tasks
- Document references
- Basic Accounting
- Global search
- Quick Add
- Hebrew / RTL
- Appropriate security/privacy basics

Explicitly **not V1**:
- Email sync
- Google Drive API sync
- Dropbox API sync
- AI legal assistant
- OCR pipeline
- Full document-management system
- Client portal
- Complex multi-user permissions
- Workflow engine
- Relationship/entity graph
- Full accounting/bookkeeping engine

---

## 14. V2 Direction

Planned later:

### Email Sync + AI Notes

New emails may be synchronized.

AI can:
- identify likely relevant Client / Matter
- summarize the email
- create a proposed note / dashboard notification
- suggest tasks

Critical rule:

> **AI must not automatically modify a Matter based on email content.**

The lawyer reviews/accepts suggestions.

Deadlines inferred by AI must never silently become authoritative legal deadlines.

### Cloud Storage

- Google Drive integration
- Dropbox integration
- support for clients sharing files through different providers

---

## 15. V3+ Direction

### Free-Text → Structured Case Creation Agent

The lawyer will describe a new case in natural language.

AI produces **well-defined JSON**, e.g.:
- client
- matter
- opposing attorney
- important dates
- deadlines
- tasks
- notes/history as appropriate

Flow:

```text
Free text
→ AI
→ strict JSON schema
→ validation
→ preview
→ lawyer approval
→ normal application code writes DB transaction
```

The AI must **not** execute arbitrary database commands directly.

---

## 16. Architecture Direction

Current preference:
- simple modular monolith
- web application
- TypeScript
- likely Next.js
- PostgreSQL
- managed infrastructure where practical

Exact stack may still be finalized.

Avoid:
- microservices
- event-driven complexity
- excessive generic abstractions
- premature scaling architecture

Optimize for:
- maintainability
- understandable code
- low operational overhead
- efficient Codex use

---

## 17. Codex / AI Working Rules

When working on this repository:

1. Read this file and relevant detailed docs before coding.
2. Inspect existing code before proposing structural changes.
3. Reuse existing components, patterns, and conventions.
4. Make the **smallest coherent change** that satisfies the requested scope.
5. Do not implement V2/V3 features unless explicitly asked.
6. Do not add enterprise abstractions “for future flexibility.”
7. Preserve the simple Client → Matter ownership model.
8. Preserve separate Tasks / Deadlines / Important Dates.
9. Keep Hebrew/RTL support in mind for all UI work.
10. Keep forms minimal and optional fields optional.
11. Hide empty optional Client fields in display mode.
12. Treat security/privacy changes conservatively.
13. Run relevant tests/type checks/lint after implementation.
14. Summarize:
    - files changed
    - schema/migration changes
    - tests run
    - unresolved concerns
15. If requirements conflict, prefer the latest explicit product decision and flag the conflict.

---

## 18. Suggested AI/Codex Thread Split

Use focused threads rather than one giant conversation.

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

Each new thread should receive a dedicated kickoff prompt defining:
- scope
- required docs to read
- what to implement
- what not to implement
- validation/tests
- expected output

---

## 19. Token-Efficiency Rules

To save AI/Codex tokens:

- Keep durable project facts in repository docs.
- Do not paste the entire project history into every prompt.
- Reference this file + exact relevant requirement docs.
- One thread = one bounded domain/problem.
- Ask for implementation rather than long generic analysis unless architecture is actually undecided.
- Let Codex inspect the repository rather than pasting large source files.
- Use stronger reasoning only for architecture, schema, security, migrations, or difficult debugging.
- Keep project guidance concise; move detailed requirements to dedicated docs.

---

## 20. Current Product Philosophy in One Sentence

> **A lightweight, Hebrew-first personal legal case-management CRM for one labor-law lawyer: Client → Matter → Tasks/Deadlines, with a powerful Dashboard, minimal data entry, clear financial/client obligations, and future AI/integration capabilities added only after the core system is solid.**
