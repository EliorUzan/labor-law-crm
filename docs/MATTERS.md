# V1 Matters — Thread 4 handoff

## Implemented behavior

- Create a Matter from its existing Client with **+ תיק חדש**. Only title is
  required; Client and authenticated owner are determined on the server, and
  PostgreSQL generates the internal UUID. No Client re-selection is necessary.
- One Matter dashboard page with optional case information, opposing party,
  opposing-attorney name/phone/email/firm, Matter Notes, and Case History. Empty optional
  detail rows and empty attorney sections are hidden; internal UUIDs are not
  shown as content.
- Edit every user-editable field, including clearing optional fields. Client,
  owner, and internal ID cannot be changed. Status is optional: `active` (פעיל),
  `waiting` (בהמתנה), `closed` (נסגר). The initial selection is unset. Legacy text
  statuses remain readable; editing requires selecting a supported status or unset.
- Matter Notes are separate plain multiline records with automatic creation
  timestamps. They display newest first, can be added in a content-only form and
  can be corrected without changing their original creation timestamp.
- Add and correct Case History directly on the Matter page. Date/title are
  required; description is optional. A simple list orders by `event_date ASC`,
  then creation time and ID only to break ties. A backdated event appears in the
  correct chronological position regardless of when it was entered.
- Client Matters now have links, Hebrew statuses, optional case numbers, a count,
  and a creation action. Dashboard recent Matters now link to Matter detail and
  retain the existing `updated_at DESC` ordering. Matter edits update that timestamp.
- Mutations revalidate the Matter detail/edit pages, Client page, Clients list,
  and Dashboard. History additions stay on the same Matter page with success
  feedback and refreshed history. History does not automatically rewrite Matter
  notes or alter the Matter's update timestamp.
- Hebrew/RTL forms, isolated LTR phone/email/date inputs, pending states, safe
  failure messages, and retained input on validation/save failure.

No permanent deletion, Matter transfers, global Quick Add extension, or future
module functionality is included. Tasks, Deadlines, Important Dates, Documents,
Accounting, and Global Search are outside this change.

## Routes

| Route | Purpose |
| --- | --- |
| `/clients/[clientId]/matters/new` | Create within an owned Client |
| `/matters/[matterId]` | Matter dashboard, notes and history creation/correction |
| `/matters/[matterId]/edit` | Edit Matter fields |

Matter routes have loading, error, and not-found feedback. Creation inherits the
existing Client route feedback.

## Security and schema

Every page/action independently calls the existing `requireAuthenticatedUserId`.
Zod validates editable data and route IDs on the server. Matter creation verifies
Client ownership. Matter lookup joins the owned Client and filters by the session
owner and Matter ID. Updates additionally constrain the original Client ID.
History and Note reads join both owned Matter and Client; writes verify that same
parent chain, and corrections constrain their ID, Matter ID, and owner together.
Existing composite foreign keys preserve relationship integrity. Browser components
receive form/display data and call Server Actions; CRM database access stays
server-only. Database errors are not returned to the user.

The Matter Note follow-up adds `matter_notes`, preserves each non-empty legacy
`matters.notes` value as one note using the Matter `updated_at` as the only
available legacy timestamp, then removes the legacy column. The existing nullable
Matter status text column and optional history description are retained.

## Files changed

- `src/modules/matters/actions.ts` — authenticated Matter, history and note mutations.
- `src/modules/matters/queries.ts` — owned Matter, Note and chronological history reads.
- `src/modules/matters/validation.ts` — editable field, history and Note schemas.
- `src/modules/matters/presentation.ts` — Hebrew status labels and legacy display.
- `src/modules/matters/forms.tsx` — Matter, Note and history forms.
- `src/modules/matters/matter-detail.tsx` — Matter dashboard presentation.
- `src/modules/matters/actions.test.ts`, `queries.test.ts`, `validation.test.ts`,
  `ui.test.tsx`, `history.integration.test.ts` — security, input, query, UI and
  optional PostgreSQL fixture coverage.
- `src/app/(app)/clients/[clientId]/matters/new/page.tsx` — creation route.
- `src/app/(app)/matters/[matterId]/page.tsx`, `[matterId]/edit/page.tsx`,
  `error.tsx`, `loading.tsx`, `not-found.tsx` — Matter routes and feedback.
- `src/modules/clients/client-detail.tsx`, `ui.test.tsx` — Matter count, creation
  link, detail navigation, status labels, and updated empty-state expectation.
- `src/modules/dashboard/queries.ts`, `dashboard.tsx` — recent Matter IDs, links,
  and Hebrew status labels.
- `docs/DATA_MODEL.md`, `docs/MATTERS.md` — model decision and this handoff.

## Verification

Using the installed Node 24.19.0 runtime:

| Check | Result |
| --- | --- |
| `pnpm run typecheck` | Passed |
| `pnpm run lint` | Passed |
| `pnpm run test` | 100 passed; 6 optional database tests skipped |
| Tests with `CRM_READONLY_DB_TEST=1` | 106 passed in 14 files |
| `pnpm run build` | Passed; all three Matter routes generated as dynamic routes |

The optional database tests use CTE fixtures that shadow the referenced tables
within each SELECT and enforce a read-only connection. They neither read stored
CRM rows nor insert test records. History coverage verifies reverse insertion
order, user-entered event ordering, other-owner/other-Matter exclusion, and both
Client and Matter ownership joins. Mutation tests inspect generated SQL and
verify rejected parent lookups cannot write; UI tests cover hidden values, notes
escaping, links, required fields, input preservation, and submission states.

Browser verification covers the existing authenticated Client page, the Matter
count/creation link, the contextual creation form, rejection of an empty title,
and responsive form layout at 390px and 1280px without horizontal overflow.
Full live creation/edit/history acceptance remains
to be exercised with the steps below; no Matter or history records were inserted
during this verification.

## Exact localhost acceptance steps

Use Node >=20.9 and the existing `.env.local` configuration, then start:

```powershell
pnpm run dev --hostname 127.0.0.1
```

1. Open `http://127.0.0.1:3000/login` and sign in with the provisioned account.
2. Open **לקוחות** and an existing Client.
3. Click **+ תיק חדש**; verify the Client name is already shown.
4. Enter only a title and click **שמור**. Expect the new Matter dashboard.
5. Follow the Client name link; verify the new Matter and updated count.
6. Open that Matter and click **עריכה**.
7. Add a case type, status, opening date, case number, court/tribunal, and opposing
   party as needed. Save and verify all supplied information is visible.
8. Edit again, add opposing-attorney name/phone/email/firm, and save. Verify
   phone/email remain readable left-to-right.
9. Expand **+ הוסף הערה**, enter one note and save. Add a second note and verify
   the newer note appears first. Expand **עריכת הערה** to correct a note while
   retaining its original displayed creation time.
10. Expand **+ הוסף אירוע להיסטוריה**. Enter date `2026-09-07`, title and optional
    description; save. Verify it appears immediately on the same Matter page.
11. Add a second event dated `2026-08-28` after the first.
12. Verify `28.08.2026` appears before `07.09.2026` despite insertion order.
13. Expand **עריכת אירוע** on the earlier event. Correct its date/title/description
    and save; verify the list reflects its new chronological position.
14. Edit the Matter, clear optional case/court/attorney fields, save, and verify
    their display rows disappear. The internal UUID, owner, and Client are never
    editable. Set **נסגר** when closing a Matter.
15. Return to **לוח בקרה** and find the Matter under **תיקים אחרונים**. Follow its
    link and verify the latest title/status.
16. Return to the Client and verify the Matter remains listed and navigable.
17. Repeat navigation/form checks at a narrow mobile width; confirm no horizontal
    page scrolling and readable Hebrew labels/LTR contact values.
18. Click **התנתקות**. Reopening the Matter URL should require sign-in.

## Remaining limits

No known implementation failures. Full live write acceptance is not claimed.
The optional database tests require network access and the configured database
connection. Global Quick Add and deletion are deliberately omitted for Thread 4.
