# Portal moderation: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and the lint passes (`go vet ./...` and `go test ./...` in `api-go`,
`npm run lint` and `npm test` in `portal`).

- [ ] 1. Suspension history table and backfill (R1.5, R1.7, R1.8)
  - `api-go/scripts/migrate_portal_moderation.sql`: table, indexes on
    `user_suspensions` and `content_reports`, RLS, the three backfill steps,
    re-runnable
  - mirror the table and indexes in `scripts/readpanda_schema.sql`
  - run the migration twice against a copy with seeded reports and
    suspended users, and check that counts don't change on the second run
- [ ] 2. Record suspensions and reinstatements (R1.1, R1.2, R1.3, R1.4, R1.6, R1.8)
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
- [ ] 3. Suspension list and per-user history endpoints (R2.1, R2.2, R2.3, R2.6, R3.1, R8.2)
  - `GET /admin/suspensions`, `GET /admin/users/{uuid}/suspensions` in
    `moderation_insights.go`, routes in `router.go`
  - tests: ordering (undated last), counts, paging, `401`/`403`/`404`
- [ ] 4. Grouped report targets endpoint (R4.1, R4.2, R4.3, R4.6, R4.7, R5.1, R5.2, R8.2)
  - `GET /admin/reports/targets` for `type=user|room`
  - tests:
    - split by type
    - top three reasons
    - `status=open` drops fully closed targets
    - each sort
    - deleted accounts excluded
    - deleted room named from the snapshot
    - paging
- [ ] 5. Queue about-filter (R6.1)
  - `about_user` / `about_room` on `GET /admin/reports`, `400` for both
  - `open_count` stays global
  - tests
- [ ] 6. Moderation stats endpoint (R7.1, R7.2, R7.3, R7.4, R7.5, R7.6, R7.7, R7.8, R8.2)
  - `GET /admin/moderation/stats?weeks=`
  - tests:
    - zero-filled weeks
    - Monday-start week boundaries
    - median and p90 with a known set
    - `null` when nothing resolved
    - undated suspensions counted apart
    - bad `weeks` gives `400`
- [ ] 7. Document the API (R1.1, R1.4, R4.1, R5.1, R6.1, R7.2, R8.2)
  - `api-go/ROUTES.md`: changed PATCH and resolve bodies, the new query
    params, four new routes, `user_suspensions` under Moderation
- [ ] 8. Portal services and the suspend dialog (R1.4, R3.2)
  - `services/moderation.js`: the new hooks, plus `note` on
    `setUserActive` / `resolveReport`
  - `components/SuspendDialog.jsx` + `useSuspendReader()`:
    - note field with a 500 counter
    - "Admins only. The reader never sees this."
    - error kept in the dialog
    - invalidates every moderation key
  - the Queue's `suspend_user` action and the user page switch to it
- [ ] 9. Suspension history on the user page (R3.1)
  - `userDetailPage.jsx`: "Suspended N times" and the history list, newest
    first
  - "See reports about them" link
- [ ] 10. Tabs, URL state and the queue filter (R6.1, R6.2, R8.1, R8.2, R9.1)
  - `reportsPage.jsx` → tab list and search params
  - queue body moves to `moderation/QueueTab.jsx`
  - "All" status chip, and the "About <name>" chip with ×
  - update `reportsPage.test.jsx`, and add tab keyboard and URL tests
- [ ] 11. Readers tab (R4.1, R4.2, R4.3, R4.4, R4.5, R4.6, R4.7)
  - `moderation/ReadersTab.jsx`: table, chips, sort select, Load more, row
    click → filtered queue, Suspend/Reinstate via `useSuspendReader`
  - tests
- [ ] 12. Rooms tab (R5.1, R5.2, R5.3, R5.4)
  - `moderation/RoomsTab.jsx`, with no action buttons
  - tests
- [ ] 13. Suspended tab (R2.1, R2.2, R2.3, R2.4, R2.5, R2.6)
  - `moderation/SuspendedTab.jsx`: Current / Previously chips with counts,
    "Before history began", Reinstate, empty states, Load more
  - tests
- [ ] 14. Stats tab (R7.1, R7.2, R7.3, R7.4, R7.5, R7.6, R7.7, R7.8, R7.9, R9.2, R9.3)
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
- [ ] R1.1 Suspending records when, who, report, note
- [ ] R1.2 Reinstating closes the open record
- [ ] R1.3 No second record when already suspended
- [ ] R1.4 Note optional, ≤ 500, else 400
- [ ] R1.5 Backfill from reports and current suspensions, re-runnable
- [ ] R1.6 Count = recorded suspensions
- [ ] R1.7 History goes with the reader, stays when the admin is deleted
- [ ] R1.8 Suspended ⇔ open record
- [ ] R2.1 Current list with count, since, by, note, report
- [ ] R2.2 Previously suspended list
- [ ] R2.3 Counts on the chips
- [ ] R2.4 Reinstate from a row moves it
- [ ] R2.5 Empty states
- [ ] R2.6 Paging
- [ ] R3.1 History on the user page
- [ ] R3.2 Note field in every suspend/reinstate dialog
- [ ] R4.1 Readers rows with totals, split, reasons, last reported
- [ ] R4.2 Has open / All chips
- [ ] R4.3 Sorts
- [ ] R4.4 Row → filtered queue
- [ ] R4.5 Suspend/Reinstate on the row
- [ ] R4.6 Deleted accounts not listed
- [ ] R4.7 Paging
- [ ] R5.1 Rooms rows, deleted room named from the snapshot
- [ ] R5.2 Chips, sort, paging
- [ ] R5.3 Row → filtered queue
- [ ] R5.4 No room actions on rows
- [ ] R6.1 About-filter with removable chip
- [ ] R6.2 Tab, status and filter in the URL, back works
- [ ] R7.1 4 / 12 / 52 weeks, default 12
- [ ] R7.2 Headline numbers
- [ ] R7.3 Reports received and resolved per week
- [ ] R7.4 Suspensions and reinstatements per week, undated noted
- [ ] R7.5 Actions and reasons
- [ ] R7.6 Zero weeks, not blank
- [ ] R7.7 Monday-start UTC weeks, "This week"
- [ ] R7.8 Median and p90 resolve time, "–" when none
- [ ] R7.9 Error banner with Try again
- [ ] R8.1 Five tabs, sidebar unchanged
- [ ] R8.2 Admin-only endpoints, writer sees the banner
- [ ] R9.1 Keyboard tab list
- [ ] R9.2 Hidden table per chart
- [ ] R9.3 Not colour alone

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
