# Portal moderation: Design

## Approach
All suspensions already go through one function, `setSuspended` in
`packages/api-go/internal/handlers/moderation_admin.go`. Both `ResolveReport`
(`suspend_user`) and `SetUserActive` (the Users page) call it. It is the
only code that writes `users.isactive` after signup, and the Database page
can only insert and delete rows, not update them. So the history is a new
table, `user_suspensions`, written inside `setSuspended` in the same
transaction as the `isactive` change. That keeps R1.8 true: suspended
exactly when an open record exists.

The grouped views and stats are read-only aggregate queries over
`content_reports` and `user_suspensions`, behind three new admin endpoints.
Nothing about how reports are filed or resolved changes, except that the
optional note can be sent.

In the portal, `reportsPage.jsx` becomes a tabbed page. Today's queue stays
as the Queue tab, gaining the about-filter, and each new tab is its own file
in `src/pages/moderation/`. Tab, status and filter live in the URL search
params (R6.2). A shared `SuspendDialog` replaces the plain confirm for
suspend and reinstate, because the confirm modal has no input (R3.2).

## Files
| File | Change |
|------|--------|
| `api-go/scripts/migrate_portal_moderation.sql` | new: `user_suspensions`, indexes, RLS, backfill (R1.5) |
| `api-go/scripts/readpanda_schema.sql` | modified: add `user_suspensions`, which the tests build from |
| `api-go/internal/handlers/moderation_admin.go` | modified: `setSuspended(tx, userID, suspended, suspendAction)` writes and closes records; `SetUserActive` and `ResolveReport` take `note`; `ListReports` takes `about_user` / `about_room` |
| `api-go/internal/handlers/moderation_insights.go` | new: `ListReportTargets`, `ListSuspensions`, `GetUserSuspensions`, `ModerationStats` |
| `api-go/internal/server/router.go` | modified: four routes |
| `api-go/internal/server/suspension_history_test.go` | new: R1, R2, R3 API behaviour |
| `api-go/internal/server/moderation_insights_test.go` | new: targets, queue filter, stats |
| `api-go/ROUTES.md` | modified: document the new and changed routes |
| `portal/package.json` | modified: add `recharts` (3.x, which supports React 19) |
| `portal/src/services/moderation.js` | modified: `useReportTargets`, `useSuspensions`, `useUserSuspensions`, `useModerationStats`; `setUserActive(uuid, isactive, note)`; `resolveReport(id, action, note)`; `useReports(status, about)` |
| `portal/src/components/SuspendDialog.jsx` | new: confirm modal with optional note and counter; `useSuspendReader()` hook for every suspend and reinstate |
| `portal/src/pages/reportsPage.jsx` | modified: tab list and URL state; the queue moves into `QueueTab` with the about-filter |
| `portal/src/pages/moderation/QueueTab.jsx` | new: today's queue body, plus R6 |
| `portal/src/pages/moderation/ReadersTab.jsx` | new: R4 |
| `portal/src/pages/moderation/RoomsTab.jsx` | new: R5 |
| `portal/src/pages/moderation/SuspendedTab.jsx` | new: R2 |
| `portal/src/pages/moderation/StatsTab.jsx` | new: R7, with Recharts |
| `portal/src/pages/moderation/chartTheme.js` | new: chart colours read from the `--rp-*` CSS variables |
| `portal/src/pages/userDetailPage.jsx` | modified: Suspension history section (R3.1), uses `useSuspendReader` |
| `portal/src/pages/*.test.jsx` | new and modified: tabs, filter, dialog, stats empty state |

## Data and state

### `user_suspensions`
```sql
CREATE TABLE IF NOT EXISTS public.user_suspensions (
    id character varying(50) NOT NULL,             -- 'su_' + uuid
    user_id uuid NOT NULL,                         -- FK users ON DELETE CASCADE (R1.7)
    suspended_at timestamp without time zone,      -- NULL: before history began (backfill)
    suspended_by uuid,                             -- FK users ON DELETE SET NULL (R1.7)
    report_id character varying(50),               -- FK content_reports ON DELETE SET NULL
    note text,                                     -- ≤ 500
    ended boolean DEFAULT false NOT NULL,
    reinstated_at timestamp without time zone,     -- NULL with ended = true: date unknown
    reinstated_by uuid,                            -- FK users ON DELETE SET NULL
    reinstate_note text,                           -- ≤ 500
    source character varying(10) NOT NULL,         -- 'report' | 'users' | 'backfill'
    CONSTRAINT user_suspensions_pkey PRIMARY KEY (id)
    -- + CHECKs on note lengths and source
);
-- One open suspension per reader (R1.3, R1.8).
CREATE UNIQUE INDEX user_suspensions_open_once ON user_suspensions (user_id) WHERE NOT ended;
CREATE INDEX user_suspensions_user_idx ON user_suspensions (user_id, suspended_at DESC NULLS LAST);
CREATE INDEX user_suspensions_suspended_at_idx ON user_suspensions (suspended_at);
CREATE INDEX user_suspensions_reinstated_at_idx ON user_suspensions (reinstated_at);
-- and on content_reports, for grouping and stats:
CREATE INDEX content_reports_target_user_idx ON content_reports (target_user_id, created_at DESC);
CREATE INDEX content_reports_room_target_idx ON content_reports (target_id) WHERE target_type = 'room';
CREATE INDEX content_reports_resolved_at_idx ON content_reports (resolved_at);
```
`ended` is separate from `reinstated_at` because backfilled suspensions can
be over without a known date. RLS is enabled like every other table.

### Backfill (R1.5), each step guarded so it is re-runnable
1. For each distinct `(target_user_id, resolved_at, resolved_by)` among
   `content_reports` with `action = 'suspend_user'`, where the user still
   exists, insert `source = 'backfill'`:
   - `suspended_at = resolved_at`
   - `report_id` = the earliest report in that group

   Skip it when a record with that `report_id` already exists.
2. For each user with `isactive = false`, except `deleted.reader`, who has
   no record: insert one with `suspended_at = NULL`.
3. Mark `ended = true` on every backfill record except, for a user with
   `isactive = false`, their latest one (`suspended_at DESC NULLS FIRST`, so
   the undated "suspended now" record wins).

### `setSuspended(tx, userID, suspended, act suspendAction)`
`suspendAction{adminID, reportID, note, source}`.
- Suspend: `UPDATE users SET isactive = false`, then insert a record
  `ON CONFLICT (user_id) WHERE NOT ended DO NOTHING` (R1.3), then delete
  refresh tokens as today.
- Reinstate: `UPDATE users SET isactive = true`, then
  `UPDATE user_suspensions SET ended = true, reinstated_at = now(), reinstated_by, reinstate_note WHERE user_id = $1 AND NOT ended`.
  If no open record exists (only possible with hand-edited data), it
  doesn't fail.

The note is trimmed. Over 500 characters answers
`400 "Keep the note to 500 characters"` before anything is written (R1.4).

### Changed endpoints
- `PATCH /admin/users/{uuid}` body `{ isactive, note? }`.
- `POST /admin/reports/{id}/resolve` body `{ action, note? }`. The note is
  used only for `suspend_user`, and ignored otherwise.
- `GET /admin/reports` adds `about_user=<uuid>` (matches `target_user_id`)
  or `about_room=<id>` (`target_type = 'room' AND target_id = $`). Both
  together give `400`. `open_count` stays global, for the nav badge.

### New endpoints (all `RequireAdmin`, R8.2)
- `GET /admin/reports/targets?type=user|room&status=open|all&sort=open|total|latest&limit=&offset=`
  → `{ targets[], has_more }`
  - `type=user`, one target per reader:
    - `{ user: { id, username, suspended, suspension_count }, total, open }`
    - `by_type: { user, comment, room }`
    - `top_reasons: [{ reason, count }]` (top 3, ties by reason name)
    - `last_reported_at`
    - grouped on `target_user_id IS NOT NULL` (R4.6)
  - `type=room`, one target per room:
    - `{ room: { id, name, state }, admin: person|null, total, open, top_reasons, last_reported_at }`
    - `name` comes from `rooms` when the room is live, otherwise from the
      first line of the latest report's `snapshot`, and `state` is `gone`
    - `admin` is the latest report's `target_user_id`
  - `status=open` keeps targets with `open > 0` (R4.2). `limit` ≤ 100, default 50.
- `GET /admin/suspensions?state=current|previous&limit=&offset=`
  → `{ readers[], has_more, current_count, previous_count }`
  - each reader: `{ id, username, suspension_count, last: { suspended_at, suspended_by, note, report_id, reinstated_at, ended } }`
  - `current` means `isactive = false` and is ordered by `suspended_at DESC NULLS LAST`
  - `previous` means active with at least one record, ordered by
    `reinstated_at DESC NULLS LAST`
- `GET /admin/users/{uuid}/suspensions` → `{ count, suspensions[] }`, newest
  first, each row with admin usernames resolved. `404` for an unknown user.
- `GET /admin/moderation/stats?weeks=4|12|52` (anything else `400`) →
  - `range_start`
  - `weeks[]`: `{ week_start, received, resolved, suspended, reinstated }`,
    one entry per week from `date_trunc('week', …)`, `generate_series`
    filling the gaps (R7.6)
  - `totals`: `{ received, resolved, suspended, reinstated }`
  - `open_now`, `oldest_open_at`
  - `actions` per action, and `reasons` per reason
  - `resolve_hours: { median, p90 }`, via
    `percentile_cont(...) WITHIN GROUP (ORDER BY resolved_at - created_at)`
    over reports resolved in range, or `null` if none (R7.8)
  - `undated_suspensions`: the count with `suspended_at IS NULL` (R7.4)

  `range_start` is the Monday that is `weeks - 1` weeks before this week's
  Monday, in UTC (R7.7). The API's timestamps are `timestamp without time
  zone`, written in UTC by the server.

### Portal state
React Query keys sit under the existing `REPORTS_KEY`
(`['admin-reports', …]`), plus `['admin-suspensions', …]`,
`['admin-user-suspensions', uuid]` and `['admin-moderation-stats', weeks]`.
Every suspend, reinstate or resolve invalidates all of them, along with
`['admin-user', uuid]` and `['admin-rows']`. Nothing is persisted locally.

### Charts
- Recharts `BarChart` for the two weekly series (R7.3, R7.4), grouped bars.
  The colours are `--rp-gold` and `--rp-link`, with a `--rp-ink-holder` axis
  and no grid lines (the no-line rule).
- Actions and reasons are horizontal bar lists drawn with plain markup, not
  charts. They're short, labelled lists.
- `chartTheme.js` reads the CSS variables at render, so the hex values stay
  in `index.css`.
- Each chart is wrapped in a `figure` with a visually hidden `<table>` of
  its numbers (R9.2) and a text legend (R9.3).
- Load the dataviz skill when building the Stats tab.

## Navigation
- Same route, `/reports`, with search params:
  - `tab=queue|readers|rooms|suspended|stats` (default `queue`)
  - `status=open|actioned|dismissed|all` (Queue)
  - `about_user=<uuid>` or `about_room=<id>` (Queue)
  - `filter=open|all`, `sort=open|total|latest` (Readers and Rooms)
  - `state=current|previous` (Suspended)
  - `weeks=4|12|52` (Stats)
- Changing tab pushes a history entry, and changing a filter replaces it.
  Clicking a reader or room row navigates to
  `?tab=queue&status=all&about_user=…`, so the back button returns to the
  grouped list (R6.2).
- The user page links to `/reports?tab=queue&status=all&about_user=<uuid>`
  ("See reports about them"), and each suspension's report link goes to that
  same filtered queue. There is no single-report route, and the filtered
  queue shows the report among the reader's others.
- The sidebar is unchanged (R8.1).

## Edge cases
- **Already suspended, suspended again** (a report on a suspended reader,
  through an old tab): no new record, and the report closes (R1.3). The
  portal already hides the button when `target_user.suspended`.
- **Two admins reinstating at once:** the second `UPDATE` finds no open
  record. It's a no-op that answers 200.
- **Deleted reader / self:** the same `400` as today, before any history
  write.
- **The suspended reader deletes their account:** their records cascade
  away (R1.7). Their reports stay with a null target and drop off the
  Readers tab (R4.6).
- **A deleted room** keeps its group, because `target_id` stays in the
  reports. The name comes from the snapshot, and the state is `gone`.
- **A room report whose `target_user_id` is the room's admin when reported:**
  if the room's admin changed later, the Rooms tab shows the latest report's
  admin. That's good enough for spotting patterns.
- **Large ranges:** 52 weeks of `content_reports` is one indexed scan, and
  stats aren't cached. The table is small (30/day per reporter at most).
- **API error / offline:** each tab shows `Banner` with Try again, like the
  Queue. A failed suspend or reinstate keeps the dialog open with the error,
  so the note isn't lost.
- **Empty states:**
  - no reported readers: "Nobody has been reported" / "No open reports about anyone"
  - no rooms: the same idea
  - suspended lists: "Nobody is suspended" / "Nobody has been reinstated yet"
  - Stats shows zeros, not an empty state (R7.6)
- **Writer without the admin role:** every tab gets `403`, and the banner
  shows the API's message, as the Queue does now (R8.2).
- **Notes containing HTML:** rendered as text, like report snapshots.

## Alternatives considered
- **A counter column on `users`:** cheaper, but it loses the when, who and
  why that R3.1 needs, and can drift from `isactive`.
- **Deriving history from `content_reports` only:** misses Users-page
  suspensions and every reinstatement.
- **Separate sidebar pages:** the user chose tabs. Everything about
  moderation stays in one place behind the badge.
- **Hand-drawn SVG charts:** no new dependency, but the user chose a chart
  library for tooltips and axes.
- **Room actions on the Rooms tab:** closing and deleting send the creator a
  report's reason (report-block R9.8). A row covers many reports with
  different reasons, so acting stays on a single report (R5.4).
