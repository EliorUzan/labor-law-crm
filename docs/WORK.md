# V1 Tasks, Deadlines, Important Dates — Thread 5

The focused follow-up in `docs/DEADLINE_PAIRING.md` adds optional Client
Obligation pairing and reverse references on Deadline cards. The original
Thread 5 results below are retained as historical handoff notes.

## Implemented behavior

- **Tasks:** create/edit title, optional description and optional Deadline. The
  form can also create a new standalone Deadline directly and pair it immediately.
  New Tasks start undone. A checkbox persists completion/uncompletion immediately,
  disables repeat clicks while saving, rolls back on error and announces errors.
  Open Tasks are prominent; completed Tasks remain below on the Matter.
- **Deadlines:** standalone creation/editing with title, Israeli date and
  optional description. Time appears only after selecting **+ הוספת שעה**;
  otherwise 17:00 Israel time is stored. All remain on the Matter in chronological order; past
  dates appear first and carry a red overdue label. No Task is required.
- **Important Dates:** create/edit title, Israeli date/time, optional description
  and optional lightweight type. Suggested Hebrew values and custom text are
  supported. Chronological Matter display retains past events.
- **Relationship:** the selector offers only Deadlines in the current Matter.
  Server validation rejects another Matter's Deadline even for the same owner.
  Task reads join the current Deadline, so its corrected title/time appears
  without duplicated Task dates. Completing a Task leaves the Deadline intact.
- **Matter page:** distinct Deadlines, Tasks, and Important Dates sections follow
  the existing case/attorney details, before Notes and Case History. All add/edit
  forms expand in place. Existing Notes and History behavior is preserved.
- **Dashboard:** real standalone Deadlines, only undone Tasks (dated work first,
  undated last), and only upcoming Important Dates. Each row links to its Matter
  section. Deadlines have separate limits of eight overdue and eight upcoming,
  preventing a backlog from hiding upcoming deadlines. Tasks and Important Dates
  retain the existing eight-row limit. There were no operational summary counts
  to update; financial summary and Client Obligations remain separate.
- Every successful work mutation revalidates both the Matter and Dashboard.
  Blank optional display values are hidden. Forms retain entered values on
  failure and prevent repeated submission while pending.

No permanent deletion, automatic Case History, global Quick Add expansion,
Documents, Accounting, Search, reminders, or external integrations were added.
Global Quick Add is deferred to the later UX task; Matter add buttons work.

## Security and date semantics

All actions independently require the verified authenticated user ID, validate
IDs and editable input with Zod, and check the parent Matter/Client ownership
using the existing authorization helper. Updates constrain record ID, Matter ID
and owner ID together and reject zero-row writes. Reads join owned Matters and
Clients; Task/Deadline joins also constrain Matter ownership. The existing
composite foreign keys and RLS remain in force. DB errors are not disclosed.
CRM reads/writes remain server-side through Drizzle.

**No date-only column was introduced.** Deadline timestamps remain timezone-aware
for reliable ordering and overdue checks; date-only entry uses 17:00 Israel time
when no optional time is supplied. Important Dates keep their explicit Israeli
date/time form.

The server resolves Israeli local input independently of the browser/server
timezone, including summer/winter offsets. Invalid dates and nonexistent spring
DST times are rejected. New inputs in the repeated autumn hour use the first
occurrence. An edit that retains the local time preserves the stored instant,
including the second occurrence of that hour and fractional seconds.

## Files changed

| File | Purpose |
| --- | --- |
| `src/modules/work/actions.ts` | Authenticated create/edit actions and explicit done/undone mutation |
| `src/modules/work/queries.ts` | Owned Matter work lists and Deadline association lookup |
| `src/modules/work/validation.ts` | Minimal editable schemas, IDs, timestamps, optional types |
| `src/modules/work/time.ts` | Israeli wall-time conversion and overdue calculation |
| `src/modules/work/presentation.ts` | Hebrew Important Date labels |
| `src/modules/work/forms.tsx` | Inline forms, checkbox, pending/error feedback |
| `src/modules/work/matter-work.tsx` | Three distinct Matter sections |
| `src/modules/work/actions.test.ts` | Creation, edits, completion, ownership and safe errors |
| `src/modules/work/queries.test.ts` | SQL ownership, relationship, ordering and Dashboard filters |
| `src/modules/work/validation.test.ts` | Minimal schema, optional fields, Israeli/DST date semantics |
| `src/modules/work/ui.test.tsx` | Distinct sections, forms, state preservation, checkbox and links |
| `src/modules/work/work.integration.test.ts` | Actual PostgreSQL queries over isolated read-only fixtures |
| `src/app/(app)/matters/[matterId]/page.tsx` | Load owned work and integrate into Matter route |
| `src/modules/matters/matter-detail.tsx` | Place work sections within existing Matter layout |
| `src/modules/dashboard/queries.ts` | Navigable IDs, parent ownership, separate deadline limits |
| `src/modules/dashboard/dashboard.tsx` | Work links, Hebrew types, responsive rows |
| `src/modules/clients/queries.test.ts` | Adjust Dashboard query-count expectation for separate deadline lists |
| `docs/DATA_MODEL.md` | Document existing timestamp schema and work semantics |
| `docs/WORK.md` | This handoff and local testing procedure |

## Verification

Using the installed Node 24 runtime:

| Check | Result |
| --- | --- |
| `pnpm run typecheck` | Passed |
| `pnpm run lint` | Passed |
| `pnpm run test` with `CRM_READONLY_DB_TEST=1` | 167 passed in 20 files |
| `pnpm run build` | Passed; Matter and Dashboard remain dynamic routes |
| `git diff --check` | Passed |

The default suite skips the optional database cases (15 tests); enabling the
environment flag exercises all of them. PostgreSQL tests require network access
and the existing database configuration. An initial sandboxed run could not
connect; the run with network access passed.

The new database suite executes actual Drizzle SELECTs over CTE fixtures that
shadow the tables. It validates ordering, upcoming/overdue filtering, standalone
Deadlines, ownership through both parents, completion visibility and propagation
of Deadline corrections. It evaluates the actual timestamp UPDATE expressions
as SELECTs over synthetic timestamps to verify DST correction behavior.
Connections are read-only; these tests do not read or insert stored CRM records.

Existing Client/financial/obligation, Matter/Note/History and schema tests pass.
Case History still sorts oldest first, Notes newest first. Browser navigation to
localhost while signed out correctly reached login. Authenticated browser write
acceptance and responsive visual inspection remain unverified because the
available browser session was signed out. No live work records were created.

## Exact localhost acceptance steps

With Node >=20.9 and the existing `.env.local` configuration, run:

```powershell
pnpm run dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/login` (or the already-running
`http://localhost:3000/login`) and use the provisioned account. Stay on the same
hostname because the sign-in cookie is host-specific.

1. Open **לקוחות**, choose an existing test Client and open a Matter.
2. Under **משימות פתוחות**, expand **+ הוסף משימה**. Enter
   **להתקשר ללקוח**, leave **ללא דדליין**, and save.
3. Verify the Task appears under open Tasks. Go to **לוח בקרה** and verify it
   appears there; its link should return to the Matter's Tasks section.
4. Click the Task checkbox. Verify it moves to **משימות שהושלמו** and disappears
   from Dashboard open Tasks. Uncheck it and verify the reverse behavior.
5. Expand **+ הוסף דדליין**. Enter **מועד אחרון להגשת תגובה**, choose a date several
   days ahead with time **23:59** (Israel), optionally add a description, and save.
6. Verify the standalone Deadline is prominent on Matter and Dashboard without
   any linked Task. Follow its Dashboard link back to the Matter.
7. Add **להכין כתב תגובה**, select the new Deadline, and save. Verify the Task shows
   its current title/date/time. Open Task editing to correct the description.
8. Use **עריכת דדליין**, move its date by one day, and save. Verify both the
   standalone Deadline and linked Task show the new date on Matter and Dashboard.
9. Edit the Task, choose **ללא דדליין**, and save. Verify the association disappears
   while the standalone Deadline stays visible. Reassociate it if desired.
10. Add another Deadline dated yesterday. Verify **באיחור — המועד עבר** on Matter
    and **באיחור** on Dashboard; reload to confirm it remains.
11. Expand **+ הוסף תאריך חשוב**. Enter **דיון**, choose a future date/time and
    optionally type **דיון** in the type field. Save and verify Matter/Dashboard.
    Edit its title, time, description and type; clear optional values and save.
12. Add a past Important Date. It must remain on Matter and be absent from the
    upcoming Dashboard section. No automatic Case History entry should appear.
13. Verify a second Matter's Deadline never appears in the Task selector. The
    automated server/SQL tests also cover attempts to forge other-Matter IDs.
14. Revisit Client financial records and open obligations. Verify existing values
    still display. On Matter, add/correct Notes and manual history if needed;
    verify Notes newest first and backdated history oldest first.
15. Repeat work forms and checkbox use at narrow mobile width. Verify Hebrew RTL,
    readable LTR dates, wrapped long titles, and no horizontal page scrolling.
16. Click **התנתקות** and reopen the Matter URL. Expect the sign-in page.

## Remaining limits

No known automated check failures. The authenticated browser flow above still
needs a signed-in local test session. Dashboard lists are bounded as described;
Matter lists retain all records. Global Quick Add and deletion are intentionally
deferred. Thread 5 ends here.
