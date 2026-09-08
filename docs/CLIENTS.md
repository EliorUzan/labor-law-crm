# V1 Clients — Thread 3 handoff

## Implemented

- Owner-scoped client list and literal name search, name-only creation, detail and
  editing. Optional contact fields are hidden in normal display. Status can be
  active (the creation form default), potential, former, or unset.
- Client-level financial records use the existing `fee`, `charge`, and `payment`
  enum. Amounts are positive decimal strings within `numeric(14,2)` limits;
  invalid precision is rejected instead of rounded. A valid date is required.
- PostgreSQL calculates total charges, payments, balance, and payments for the
  Jerusalem calendar month. The Client page and Dashboard call the same
  `getFinancialSummary` function. Credits, including `-0.01`, retain their sign.
- Financial history is newest first by record date, then creation time.
- Obligations require only a title within the Client context. Description,
  date and Matter are optional. Completion is an explicit boolean update;
  completed items appear under a collapsed section and can be reopened.
- Client Matters are listed with an empty state. Existing Matters can be
  selected in financial/obligation forms. No Matter creation/detail is added.
- Mutations refresh the Client, Clients list and Dashboard. Dashboard obligations
  link to the Client's obligations section and only open obligations are queried.
- Hebrew/RTL UI, LTR contact values, responsive forms, pending/error/success
  feedback, retained input after failed submissions, loading/error/not-found UI.

## Routes

| Route | Behavior |
| --- | --- |
| `/clients` | Client list and optional `?q=` name search |
| `/clients/new` | Create Client |
| `/clients/[clientId]` | Details, finances, obligations and Matters |
| `/clients/[clientId]/edit` | Edit Client |

The existing `/` Dashboard consumes the same records and financial aggregation.

## Security and schema

Every page/action independently uses `requireAuthenticatedUserId`. Queries and
updates include the authenticated owner. Child inserts verify Client ownership
and that an optional Matter belongs to the same Client and owner; existing
composite foreign keys also enforce these relationships. Zod validates server
input and strips unrecognized identity/ownership fields. Database operations
remain server-only. No raw database errors are returned from mutations.

No schema or migration changes. No application data seeding, deletion, accounting
engine, Global Search, or Matter functionality. Full shell Quick Add is deferred.

## Files

- `src/modules/clients/actions.ts`: authenticated, validated mutations and refresh.
- `src/modules/clients/validation.ts`: Client, amount, date and obligation schemas.
- `src/modules/clients/queries.ts`: owner-scoped list/detail and relationship checks.
- `src/modules/clients/financial-summary.ts`: shared exact PostgreSQL aggregation.
- `src/modules/clients/forms.tsx`: interactive forms and completion checkboxes.
- `src/modules/clients/client-detail.tsx`: one-page Client display.
- `src/modules/clients/presentation.ts`: Hebrew labels and local styling constants.
- `src/modules/clients/{actions,queries,validation}.test.ts`: mutation, scope/query
  and validation coverage.
- `src/modules/clients/ui.test.tsx`: optional fields, collapsed completed items,
  credits, input preservation and pending/success form behavior.
- `src/modules/clients/financial-summary.integration.test.ts`: opt-in read-only
  PostgreSQL arithmetic checks, using CTE fixtures without inserting rows.
- `src/app/(app)/clients/page.tsx`: replaces the placeholder.
- `src/app/(app)/clients/new/page.tsx`, `[clientId]/page.tsx`, and
  `[clientId]/edit/page.tsx`: new routes.
- `src/app/(app)/clients/{error,loading,not-found}.tsx`: route feedback.
- `src/modules/dashboard/queries.ts`, `dashboard.tsx`: aggregation reuse and links.
- `src/modules/dashboard/format.ts`, `format.test.ts`: preserve negative fractions.
- `src/components/app-shell.tsx`: keep Clients navigation active on nested routes.
- `docs/CLIENTS.md`: this handoff and testing guide.

## Verification

Validated with Node 24.19.0 (the machine's default Node is too old):

```powershell
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Typecheck, lint and production build pass. The full run with the optional
PostgreSQL tests enabled passes **63 tests in 9 files**. To include those three
read-only integration tests, configure `.env.local` with `DATABASE_URL` and run:

```powershell
$env:CRM_READONLY_DB_TEST = '1'
pnpm run test
Remove-Item Env:CRM_READONLY_DB_TEST
```

Without that flag, the three database integration tests are intentionally
skipped; the remaining 60 tests do not require a live database. The integration
connection enforces read-only transactions. Its CTEs shadow `financial_records`
only for the SELECT, covering exact totals, owner/client isolation, monthly
boundaries, empty results, credits and large sums.

Browser verification covered the authenticated empty Client list, navigation to
the new Client form, server rejection of a missing name, cancellation, and
responsive layout at 390px/1280px with no horizontal overflow. Unauthenticated
requests redirect to `/login`. React tests cover detail display and form states.

After the user identified and authorized the connected account as a disposable
test account, the live browser acceptance cycle also passed: name-only creation,
editing every optional contact field/status, charge/payment/fee creation,
immediate totals/history, obligation creation, completion and reopening,
Dashboard updates, partial-name search, and optional Matter associations.
A 1,000.10 charge minus a 400.05 payment produced 600.05 on both pages; adding a
0.05 Matter-linked fee produced 600.10. A dated Matter-linked obligation appeared
with its date and Matter on the Dashboard. One Matter was inserted only as an
authorized test fixture; no Matter creation UI or implementation was added.

## Exact localhost acceptance steps

Use Node >=20.9 and the existing configured Supabase account/database. Start:

```powershell
pnpm run dev --hostname 127.0.0.1
```

1. Open `http://127.0.0.1:3000/login` and sign in with the provisioned account.
2. Open **לקוחות**, then **+ לקוח חדש**. Enter a real Client name only and save.
3. Confirm the Client detail loads and absent phone/email/address/notes are hidden.
   The default status is **פעיל**; it can be cleared in the form.
4. Open **עריכה**, enter actual contact information, save, and verify it appears.
   Clear an optional field and save to verify its display row disappears.
5. Expand **+ הוסף רשומה**. Choose **חיוב** or **שכר טרחה**, enter the actual amount
   and date, leave Matter unset, and save. Verify totals/history update.
6. Add an actual **תשלום**. Confirm balance equals charges minus payments. For an
   isolated test account, 1,000.10 in charges and 400.05 paid should leave 600.05.
7. Expand **+ הוסף התחייבות**, enter a title, leave optional fields blank, and save.
8. Open **לוח בקרה**. Verify the obligation appears under **התחייבויות פתוחות
   ללקוחות**, the outstanding balance updates, and current-month payments appear
   under **תשלומים שהתקבלו החודש**. Existing other records contribute to these totals.
9. Follow the obligation link to the Client and tick its checkbox. Verify it moves
   to **התחייבויות שהושלמו** and disappears from the Dashboard open list.
10. Expand completed obligations and uncheck it; verify it reappears as open.
11. Verify **אין תיקים ללקוח זה** when the Client has no Matters. Existing Matters
    are listed and can be selected for a new financial record or obligation.
12. Open **לקוחות**, search for part of the Client name and follow the result.
13. Use **התנתקות**. Revisit `/clients` and verify the login redirect.

## Completion

The disposable acceptance data was removed after verification: one Client,
three financial records, two obligations and one Matter. Cleanup was scoped to
the exact test Client ID and verified test-account ownership. No other records
were modified. The Dashboard returned to zero balances and empty obligation and
Matter lists. The deleted Client route showed the Hebrew not-found page, and
logout returned to the login screen. No known implementation failure remains.
Scope stops at Thread 3.
