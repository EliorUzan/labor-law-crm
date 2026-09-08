# Thread 5 follow-up — Optional Deadline Pairing

## Schema and migration

Drizzle generated `0002_obligation_deadline_pairing.sql` and its snapshot/journal
entry. Migration `0003_optional_obligation_deadline` replaces the Matter-bound
Deadline FK with a restrictive `(owner_user_id, deadline_id)` FK, adds the
supporting Deadline owner/ID uniqueness and reverse-lookup index, and retains
the CHECK excluding an independent due date alongside a Deadline.

The existing owner/Client/Matter FK remains in force for an explicitly selected
Matter. Server validation verifies that a selected Deadline belongs to the same
Client and owner, including when no Matter is selected. No triggers, table
recreation, deletion or existing-row rewrites were introduced.

The configured database's first two migration hashes were verified against the
checked-in files. Only 0002 was pending. `pnpm run db:migrate` applied it
successfully; a read-only check confirmed three applied migrations and the new
FK/CHECK constraints. Other environments must apply the same checked-in migration
before running this version.

## Task pairing

The existing nullable `tasks.deadline_id` relationship remains. Tasks can be
standalone, pair/unpair, switch Deadline, share one Deadline with other Tasks,
or create and link a new standalone Deadline directly in the Task form. Direct
creation stores title and date only, with no description. All references remain
within the same Matter. No Task due-date copy or reverse `deadlines.task_id`
field exists.

Deadline cards now list linked Tasks with navigation to their Task rows and a
completion indication. A Deadline remains valid when neither Tasks nor
Obligations reference it.

## Client Obligation pairing and UI

The Client page supports creating and editing obligations in all three states:

- Client only, with no Matter or Deadline.
- Client + Matter, without a Deadline.
- Client + Deadline, with no separately selected Matter.
- Client + Matter + one of that Matter's Deadlines.

Without a selected Matter, the Deadline selector lists all of the Client's
Deadlines. With a Matter, it lists that Matter's Deadlines. Changing Matter
clears its selection.
The form can also create and link a new standalone Deadline directly. It asks
for the Deadline's required Matter, title and date; this Matter is independent
of the optional Matter selected for the Obligation itself. The new Deadline has
no description and defaults to 17:00 Israel time unless the optional time field
is enabled.
Removing Deadline alone retains Matter. Pairing, unpairing and switching links do
not delete entities. Multiple obligations may share a Deadline.

Existing independent obligation due dates remain available for unpaired
obligations. Choosing a Deadline replaces that independent date, as explained in
the form; the server stores `due_date = null` for paired obligations. Unpairing
does not restore or copy a date. This avoids competing sources of truth while
preserving all pre-existing due dates during migration.

Client obligation rows show a navigable Matter context and, when paired, the
current Deadline title and Israeli date. Completed obligations remain
available under the existing collapsed section and can still be reopened.
Inline edit forms retain input/selection on errors and reset new forms only
after successful saves.

Deadline cards list linked Client Obligations with Client-page links and their
completion state. Their primary management UI remains on the Client page.

## Dashboard and refresh

The existing open-obligations section still filters `done = false`. It displays
Client context, optional Matter context, and the joined Deadline's current
title/date/time when paired. Standalone and Matter-only obligations remain valid.
Tasks, standalone Deadlines and Important Dates retain their existing behavior.

Obligation mutations refresh the Client and Dashboard plus affected Matter pages.
Moving an obligation refreshes both the previous and selected Matter. Deadline
edits refresh the owning Client as well as Matter and Dashboard, so all linked
Tasks and Obligations show the same corrected date.

## Integrity and security

- Every action independently obtains the verified authenticated owner.
- Zod validates IDs and editable fields; Client ownership cannot be mass-assigned.
- Existing `ownsClientMatter` checks Client ownership and that selected Matter
  belongs to that Client. `getClientDeadline` validates the Deadline through its
  owning Matter and Client, whether or not the Obligation selects that Matter.
- Another Client's Deadline, stale cross-Matter combinations, another Client's
  Matter and another owner's records are rejected at the server boundary.
- Obligation edits constrain record ID, Client ID and owner ID together, check
  affected rows and leave completion unchanged.
- Database FKs/CHECKs preserve integrity during concurrent writes and prevent
  bypass through direct SQL. Existing RLS remains enabled.
- Client/Deadline/Dashboard reads stay on the server and join the current
  Deadline; dates are never copied into referencing records.

## Documentation updated

The focused pairing rules were added to `docs/PRODUCT_REQUIREMENTS.md`,
`docs/DATA_MODEL.md` and `CRM_AI_PROJECT_CONTEXT.md`. The root product
requirements and documentation copy of project context were kept consistent.
`docs/WORK.md` links to this follow-up while retaining its original handoff.

## Verification

Final results: **192 tests passed in 23 files** with both database flags enabled.
`typecheck`, `lint`, `build` and `git diff --check` passed. The migration was
applied and its installed constraints verified as described above.

Run with the installed Node 24 runtime:

```powershell
pnpm run typecheck
pnpm run lint
$env:CRM_READONLY_DB_TEST = '1'
$env:CRM_DB_CONSTRAINT_TEST = '1'
pnpm run test
Remove-Item Env:CRM_READONLY_DB_TEST
Remove-Item Env:CRM_DB_CONSTRAINT_TEST
pnpm run build
```

The query integration tests use read-only connections and CTE fixtures, not
stored CRM records. The separate constraint flag enables a test using only
session-local temporary tables, dropped automatically at transaction completion.
It applies the generated migration to those copies, verifies preservation of
legacy due dates, and exercises both valid and invalid FK/CHECK combinations.

Coverage includes optional relationships, pair/unpair/switch, multiple references,
ownership, original-Matter refresh, completion, input preservation and dropdown
reset behavior, reverse links and four references observing a corrected Deadline.
Existing Client, financial, obligation, Matter, Notes, History, work and
authentication-related regression coverage remains in the suite.

Live browser checks on the signed-in local application verified Dashboard/Client
loading after migration, disabled Deadline selection without Matter, enabling it
after Matter selection, preserving Matter after server rejection of a blank title,
and disabling Deadline again when Matter is cleared. The expanded form was
visually checked at 390px; document width stayed within the viewport at both
390px and 1280px. No application records were created during browser checks;
successful pairing/unpairing and shared-date propagation were exercised by the
automated action, UI and PostgreSQL fixture tests.

## Exact localhost verification

Use the configured account and existing local environment:

```powershell
pnpm run db:migrate
pnpm run dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/login`, or use the already-running
`http://localhost:3000`. Keep the same hostname throughout login and testing.
The configured database already has 0002; rerunning the migrator there is a no-op.

1. Open an existing Client with two Matters, A and B. In each Matter create a
   standalone Deadline with a future Israeli date/time.
2. In Matter A create a Task with **ללא דדליין**. Edit it, select A's Deadline,
   save, then edit again and remove the pairing. Confirm the Deadline remains.
3. Pair that Task and a second Task with A's Deadline. Confirm both appear under
   **משימות מקושרות** on the Deadline.
4. Return to the Client and expand **+ הוסף התחייבות**. Enter only a title and
   save. Verify it works without Matter; Deadline selection is disabled.
5. Add another obligation with Matter A and **ללא דדליין**. Verify the Matter
   reference on the Client page and Dashboard.
6. Expand **עריכת התחייבות**, choose A's Deadline, and save. Verify Client
   context, Matter link and Deadline title/date on Client and Dashboard.
7. Edit the obligation and switch Matter to B. The old Deadline must clear and
   the selector must contain only B's Deadlines. Select B's Deadline and save.
8. Edit again and choose **ללא תיק**. The Deadline must clear and disable. Save
   and verify the standalone obligation remains.
9. Choose Matter A plus its Deadline again. Remove only Deadline and save;
   Matter must remain. Re-pair if desired.
10. Pair two Client Obligations and the two Tasks from step 3 with A's Deadline.
    Its card must list all four references.
11. Edit A's Deadline date/time. Verify both Tasks and both Obligations show the
    corrected date on their primary pages and Dashboard.
12. Complete one paired Obligation. It must disappear from Dashboard open
    obligations, remain under completed obligations on Client, and show completed
    on its Deadline card. Reopen it and confirm it returns.
13. Submit an invalid/blank title after selecting Matter and Deadline. Verify
    the error is shown and the selections remain. Correct and save.
14. Check the form at mobile width, then revisit financial records, Notes and
    Case History. Their existing behavior/order should be unchanged.

Live test data need not be created to run the automated suite. It uses isolated
fixtures and does not insert application Tasks, Obligations or Deadlines.
