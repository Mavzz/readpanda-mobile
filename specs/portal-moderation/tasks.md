# Portal moderation: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and the lint passes (`go vet ./...` and `go test ./...` in `api-go`,
`npm run lint` and `npm test` in `portal`).

- [x] 1. Suspension history table and backfill (R1.5, R1.7, R1.8)
  - `api-go/scripts/migrate_portal_moderation.sql`: table, indexes on
    `user_suspensions` and `content_reports`, RLS, the three backfill steps,
    re-runnable
  - mirror the table and indexes in `scripts/readpanda_schema.sql`
  - run the migration twice against a copy with seeded reports and
    suspended users, and check that counts don't change on the second run
- [x] 2. Record suspensions and reinstatements (R1.1, R1.2, R1.3, R1.4, R1.6, R1.8)
  - `setSuspended` takes `suspendAction`, inserts or closes the record in
    the same transaction
  - `SetUserActive` and `ResolveReport` accept `note` (trimmed, ≤ 500,
    else `400` before any write)
  - `internal/server/suspension_history_test.go`:
    - suspend from a report
    - suspend from the Users page
    - suspend twice
    - reinstate
    - reinstate with no open record
    - note too long
    - admin deleted keeps the record
    - reader deleted cascades
- [x] 3. Suspension list and per-user history endpoints (R2.1, R2.2, R2.3, R2.6, R3.1, R8.2)
  - `GET /admin/suspensions`, `GET /admin/users/{uuid}/suspensions` in
    `moderation_insights.go`, routes in `router.go`
  - tests: ordering (undated last), counts, paging, `401`/`403`/`404`
- [x] 4. Grouped report targets endpoint (R4.1, R4.2, R4.3, R4.6, R4.7, R5.1, R5.2, R8.2)
  - `GET /admin/reports/targets` for `type=user|room`
  - tests:
    - split by type
    - top three reasons
    - `status=open` drops fully closed targets
    - each sort
    - deleted accounts excluded
    - deleted room named from the snapshot
    - paging
- [x] 5. Queue about-filter (R6.1)
  - `about_user` / `about_room` on `GET /admin/reports`, `400` for both
  - `open_count` stays global
  - tests
- [x] 6. Moderation stats endpoint (R7.1, R7.2, R7.3, R7.4, R7.5, R7.6, R7.7, R7.8, R8.2)
  - `GET /admin/moderation/stats?weeks=`
  - tests:
    - zero-filled weeks
    - Monday-start week boundaries
    - median and p90 with a known set
    - `null` when nothing resolved
    - undated suspensions counted apart
    - bad `weeks` gives `400`
- [x] 7. Document the API (R1.1, R1.4, R4.1, R5.1, R6.1, R7.2, R8.2)
  - `api-go/ROUTES.md`: changed PATCH and resolve bodies, the new query
    params, four new routes, `user_suspensions` under Moderation
- [x] 8. Portal services and the suspend dialog (R1.4, R3.2)
  - `services/moderation.js`: the new hooks, plus `note` on
    `setUserActive` / `resolveReport`
  - `components/SuspendDialog.jsx` + `useSuspendReader()`:
    - note field with a 500 counter
    - "Admins only. The reader never sees this."
    - error kept in the dialog
    - invalidates every moderation key
  - the Queue's `suspend_user` action and the user page switch to it
- [x] 9. Suspension history on the user page (R3.1)
  - `userDetailPage.jsx`: "Suspended N times" and the history list, newest
    first
  - "See reports about them" link
- [x] 10. Tabs, URL state and the queue filter (R6.1, R6.2, R8.1, R8.2, R9.1)
  - `reportsPage.jsx` → tab list and search params
  - queue body moves to `moderation/QueueTab.jsx`
  - "All" status chip, and the "About <name>" chip with ×
  - update `reportsPage.test.jsx`, and add tab keyboard and URL tests
- [x] 11. Readers tab (R4.1, R4.2, R4.3, R4.4, R4.5, R4.6, R4.7)
  - `moderation/ReadersTab.jsx`: table, chips, sort select, Load more, row
    click → filtered queue, Suspend/Reinstate via `useSuspendReader`
  - tests
- [x] 12. Rooms tab (R5.1, R5.2, R5.3, R5.4)
  - `moderation/RoomsTab.jsx`, with no action buttons
  - tests
- [x] 13. Suspended tab (R2.1, R2.2, R2.3, R2.4, R2.5, R2.6)
  - `moderation/SuspendedTab.jsx`: Current / Previously chips with counts,
    "Before history began", Reinstate, empty states, Load more
  - tests
- [x] 14. Stats tab (R7.1, R7.2, R7.3, R7.4, R7.5, R7.6, R7.7, R7.8, R7.9, R9.2, R9.3)
  - add `recharts`, `moderation/chartTheme.js`, `moderation/StatsTab.jsx`
  - range chips, headline cards, two weekly bar charts with hidden tables
    and legends, "This week" label, the undated-suspensions line, action
    and reason lists, error banner
  - load the dataviz skill first
  - tests: empty range renders zero weeks, "–" resolve times

## Acceptance
<!-- Checked one requirement at a time once every task is done, before the
commit. One line per criterion: "- [x] R1.1 <short> — how it was checked".
A partial or waived one stays unticked with the reason. -->
- [x] R1.1 Suspending records when, who, report, note — Go TestSuspensionHistoryFromReport / …FromUsersPage
- [x] R1.2 Reinstating closes the open record — Go TestSuspensionHistoryFromUsersPage
- [x] R1.3 No second record when already suspended — Go: suspending twice in both history tests
- [x] R1.4 Note optional, ≤ 500, else 400 — Go TestSuspensionNoteTooLong; portal SuspendDialog tests
- [x] R1.5 Backfill from reports and current suspensions, re-runnable — migration run 3 times on seeded data, plus the dev DB backfill
- [x] R1.6 Count = recorded suspensions — Go: count of 2 in TestSuspensionHistoryFromUsersPage
- [x] R1.7 History goes with the reader, stays when the admin is deleted — Go TestSuspensionHistoryOnDelete
- [x] R1.8 Suspended ⇔ open record — Go: historyMatchesAccounts in every history test
- [x] R2.1 Current list with count, since, by, note, report — Go TestSuspensionsList; portal SuspendedTab.test.jsx; device: checked by you, 2026-11-15
- [x] R2.2 Previously suspended list — Go TestSuspensionsList; portal SuspendedTab.test.jsx; device: checked by you, 2026-11-15
- [x] R2.3 Counts on the chips — Go TestSuspensionsList; portal SuspendedTab.test.jsx; device: checked by you, 2026-11-15
- [x] R2.4 Reinstate from a row moves it — Go TestSuspensionsList; portal SuspendedTab.test.jsx; device: checked by you, 2026-11-15
- [x] R2.5 Empty states — Go TestSuspensionsList; portal SuspendedTab.test.jsx; device: checked by you, 2026-11-15
- [x] R2.6 Paging — Go TestSuspensionsList; portal SuspendedTab.test.jsx; device: checked by you, 2026-11-15
- [x] R3.1 History on the user page — Go TestUserSuspensions; portal userDetailPage/SuspendDialog tests; device: checked by you, 2026-11-15
- [x] R3.2 Note field in every suspend/reinstate dialog — Go TestUserSuspensions; portal userDetailPage/SuspendDialog tests; device: checked by you, 2026-11-15
- [x] R4.1 Readers rows with totals, split, reasons, last reported — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R4.2 Has open / All chips — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R4.3 Sorts — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R4.4 Row → filtered queue — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R4.5 Suspend/Reinstate on the row — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R4.6 Deleted accounts not listed — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R4.7 Paging — Go TestReportedReaders; portal ReadersTab.test.jsx; device: checked by you, 2026-11-15
- [x] R5.1 Rooms rows, deleted room named from the snapshot — Go TestReportedRooms; portal RoomsTab.test.jsx; device: checked by you, 2026-11-15
- [x] R5.2 Chips, sort, paging — Go TestReportedRooms; portal RoomsTab.test.jsx; device: checked by you, 2026-11-15
- [x] R5.3 Row → filtered queue — Go TestReportedRooms; portal RoomsTab.test.jsx; device: checked by you, 2026-11-15
- [x] R5.4 No room actions on rows — Go TestReportedRooms; portal RoomsTab.test.jsx; device: checked by you, 2026-11-15
- [x] R6.1 About-filter with removable chip — Go TestQueueAboutFilter; portal queue-filter tests; device: checked by you, 2026-11-15
- [x] R6.2 Tab, status and filter in the URL, back works — portal URL tests; Back button device: checked by you, 2026-11-15
- [x] R7.1 4 / 12 / 52 weeks, default 12 — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.2 Headline numbers — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.3 Reports received and resolved per week — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.4 Suspensions and reinstatements per week, undated noted — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.5 Actions and reasons — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.6 Zero weeks, not blank — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.7 Monday-start UTC weeks, "This week" — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.8 Median and p90 resolve time, "–" when none — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R7.9 Error banner with Try again — Go TestModerationStats / …Empty; portal StatsTab.test.jsx; headless screenshots; device: checked by you, 2026-11-15
- [x] R8.1 Five tabs, sidebar unchanged — portal tab test; device: checked by you, 2026-11-15
- [x] R8.2 Admin-only endpoints, writer sees the banner — Go 401/403 in every endpoint test; portal writer-banner tests
- [x] R9.1 Keyboard tab list — portal keyboard test; device: checked by you, 2026-11-15
- [x] R9.2 Hidden table per chart — portal hidden-table tests
- [x] R9.3 Not colour alone — portal legend test; screenshots

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
- Task 1: backfill inserts every record closed, then reopens the latest one only for a suspended reader with no open record, because inserting several open records per reader breaks `user_suspensions_open_once`. The result is the same as the design, and it stays safe to re-run once live records exist.
- Task 1: a report group already recorded is skipped when any report in the group has a record, not just the earliest, because a live `suspend_user` records the report the admin acted on, which may not be the earliest.
- Task 1: checked by loading the old schema plus seeded data into a local Postgres 18 and running the migration three times. `go vet` and `go test ./...` pass on the new schema.
- Task 3: `suspended_by` / `reinstated_by` are `{ id, username }` or null, not a bare username, so the portal can link to the admin.
- Task 3: "newest first" puts the open suspension first, then the rest by date with undated ones last, so a reader whose only open record is a backfilled undated one still shows it first.
- Task 4: totals and top reasons count every report on the target, whatever its status. `status=open` only decides which rows are listed. A room's `admin` carries `suspended` as well, like the Queue's people.
- Task 6: weeks are cut from `localtimestamp`, in the database session's zone, because the API stores `now()` in that zone. That's UTC on Supabase, so R7.7 holds in production. A local Postgres in another zone cuts weeks in its own zone.
- Task 6: `week_start` and `range_start` are dates (`2026-11-09`), not timestamps. `actions` and `reasons` are maps with every key at zero or more. `actions` counts reports closed in the range, and `reasons` counts reports received in it.
- Task 8: the hook lives in `components/useSuspendReader.jsx`, apart from `SuspendDialog.jsx`, as `useConfirm` is apart from `ConfirmProvider` (react-refresh). It returns `{ suspendReader, dialog }`, and each page renders `{dialog}`, so `main.jsx` gets no new provider.
- Task 8: on Node 26 the portal tests need `NODE_OPTIONS=--no-experimental-webstorage`, because Node's own `localStorage` hides jsdom's. This affects every test, not only these.
- Task 9: the Deleted reader's page has no history section, since it's inactive by design (R1.8). "From a report" links to the reader's filtered queue, because there's no route to a single report.
- Task 10: the name in "About <name>" comes from the filtered reports (the target's username, or the room's name or stored copy), falling back to "this reader" / "this room", because the URL carries only the id.
- Task 10: on a filtered queue, the Open chip leaves out the open count, since `open_count` is the whole queue's. The "All" chip shows only when filtered or already chosen, so the default queue looks as it did.
- Task 10: switching tab starts that tab fresh (only `tab` in the URL). The Readers, Rooms, Suspended and Stats tabs show "Coming soon" until tasks 11–14.
- Task 11: the Readers and Rooms tabs share `moderation/targets.jsx` (chips, sort, table, Load more) and `moderation/useOpenRow.js`. Each row also has a "Profile" link to the user page, besides the click-through to the queue. The default filter and sort are left out of the URL.
- Task 13: Previously suspended rows have no button. Suspending again goes through the user page or the Readers tab, since the spec only asks for Reinstate here (R2.4).
- Task 14: the series colours are `--rp-series-1` `#c98500` (a darker gold step) and `--rp-series-2` `#3987e5`, not `--rp-gold` / `--rp-link`. The brand gold is too light for a mark on surface-1 by the dataviz validator. The pair passes every check: CVD ΔE 27, normal-vision ΔE 31, and 3:1 contrast. Recharts is pinned at 3.10.1.
- Task 14: the actions and reasons lists print their numbers, so they need no hidden table. The two weekly charts have one each. Checked by screenshotting 12 and 52 weeks and a 390px-wide phone in headless Chrome.
