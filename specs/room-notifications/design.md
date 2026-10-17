# Room Notifications: Design

## Approach
Everything builds on `internal/notify` in `readpanda/packages/api-go`. It already writes an inbox row per recipient and then pushes to their devices. Three handlers gain a call into it after their write succeeds:

- `CreateComment`: replies (R1) and room comments (R2)
- `JoinRoom`: joins (R3)
- `SetRoomReading`: the room's book (R4)

**Replies, joins and room books** use a new `notify.Send`, which behaves like `ToUsers` but drops recipients whose switch is off before writing anything (R5.3) and waits for the pushes (R5.6).

**Room comments are bundled in the inbox row itself.** `notifications` gains `room_id`, `event_count`, `last_pushed_at` and `updated_at`. For each recipient, `notify.RoomComment` upserts *the* unread `ROOM_COMMENTS` row for (user, room):
- no unread row → insert one with `event_count = 1` and push it now (R2.6);
- an unread row → `event_count + 1`, body becomes "{n} new comments", `updated_at = now`. Push only if `last_pushed_at` is older than the bundling window (R2.5).

The window is `Config.RoomCommentWindow`, read from `NOTIFY_ROOM_COMMENT_WINDOW` (a Go duration such as `30m`) and defaulting to 30 minutes, so it can change with `gcloud run services update --update-env-vars` and no code change.

The throttle needs no scheduler or timer: its state is the row. The trade-off is that a burst ending inside the window only pushes when the next comment arrives after it. The inbox and the badge are still right the whole time, because the row is updated on every comment.

**Switched-off recipients get nothing.** Every recipient query (including `ToAllUsersExcept` for NEW_BOOK) left-joins `notification_settings` and keeps only readers whose switch for that type is on, or who have no row. So a switched-off reader gets neither an inbox row nor a push (R5.3), and the fan-out stays one statement.

**Spoilers are decided per recipient, in SQL.** The recipients query joins `room_members` to `reading_progress` for the comment's book and returns each member's `furthest_page`. A reply's page is already its root's page, because `CreateComment` copies it from the root. If `page > furthest_page` (or there is no progress row), the body is "{username} commented on p. {page}". Otherwise it's "{username}: {text}". Bundled bodies never contain text (R2.4), so a row that started unlocked can't leak anything later.

**Pushes finish before the response.** Cloud Run runs `readpanda-backend` with CPU throttling on (`run.googleapis.com/cpu-throttling: true`), so a goroutine still sending after the response may be starved. Event pushes are sent synchronously with a 5-second total timeout. Recipients are room members (a handful), but each can have many devices: one reader in QA had 25 registered tokens, mostly old installs, some rejected by APNs. So `pushToDevices` sends to the devices in parallel, at most 10 at a time, all under the one deadline, rather than one after another; a slow or failing token then costs one slot, not the whole budget. Account deletion revokes the Apple token before replying for the same reason. The NEW_BOOK broadcast keeps its goroutine (out of scope; noted below).

**The app** gets one `openNotification(notification, navigationRef)` used by both a tapped push and a tapped inbox row, so they can't drift apart (R6). A new Notifications screen sits behind the existing Settings row (R7).

## Files

### Backend (`readpanda/packages/api-go`)
| File | Change |
|------|--------|
| `scripts/migrate_notification_events.sql` | new: `notifications` + `room_id` (FK `rooms` ON DELETE CASCADE), `event_count int NOT NULL DEFAULT 1`, `last_pushed_at timestamp`, `updated_at timestamp DEFAULT now()`; a partial unique index on (`user_id`, `room_id`) WHERE `type = 'ROOM_COMMENTS' AND NOT is_read`; new `notification_settings` table. Re-runnable. |
| `scripts/readpanda_schema.sql` | modified: the same columns, index and table |
| `internal/models/models.go` | modified: `NotificationTypeReply`, `…RoomComments`, `…RoomJoin`, `…RoomBook`; `Notification` JSON gains `room_id`, `count`, `updated_at` |
| `internal/notify/notify.go` | modified: `Notification` gains `RoomID`, `RoomName`; new `Send` (synchronous, setting-aware); new `RoomComment` (upsert + throttle + spoiler body); `ToAllUsersExcept` skips readers with New books off; shared `pushToDevices` takes a context and returns once sent |
| `internal/notify/settings.go` | new: `Settings` struct, the type → switch column mapping, the SQL filter fragment used by every recipient query |
| `internal/config/config.go` | modified: `RoomCommentWindow` from `NOTIFY_ROOM_COMMENT_WINDOW`, default 30m |
| `.env.local.example`, `DEPLOYMENT.md` | modified: document `NOTIFY_ROOM_COMMENT_WINDOW` (optional) |
| `internal/utils/push.go` (the file with `SendPush`) | modified: `Apns: {Payload: {aps: {sound: "default"}}}` on every message (R5.4) |
| `internal/handlers/comments.go` | modified: after the insert, if the returned id is the new id (not a `client_id` replay, R2.7), call `notify.Send` for the root's author (R1) and `notify.RoomComment` for everyone else (R2) |
| `internal/handlers/rooms.go` | modified: `JoinRoom` notifies `admin_id` after the insert (R3); `SetRoomReading` reads the old `current_book_id` first and notifies members when it changes to a new, non-null book (R4) |
| `internal/handlers/notifications.go` | modified: `GetUserNotifications` orders by `updated_at` and returns the new fields; new `GetNotificationSettings`, `UpdateNotificationSettings` |
| `internal/server/router.go` | modified: `GET` / `PUT /users/me/notification-settings` |
| `internal/server/notifications_test.go` | new: see tasks |
| `ROUTES.md` | modified: the two routes, and the new notification fields |

### App
| File | Change |
|------|--------|
| `src/services/notificationService.js` | modified: `toNotification` maps `room_id` → `roomId`, `count`, `updated_at` → `timestamp`; `getSettings()`, `updateSettings(patch)` |
| `src/stores/notificationStore.js` | modified: `settings`, `fetchSettings`, `setSetting(key, on)` (optimistic, rolled back on failure) |
| `src/utils/openNotification.js` | new: the type → destination routing for R6, used by push and inbox |
| `src/hooks/usePushNotifications.js` | modified: `handleOpened` builds a notification from `remoteMessage.data` and calls `openNotification` |
| `src/components/NotificationList.js` | modified: icon per type (R6.7); a tap calls `openNotification` |
| `src/screens/profile/NotificationSettingsScreen.js` | new: the switches, the iOS-permission banner, iPad column width |
| `src/screens/profile/SettingsScreen.js` | modified: the Notifications row navigates to the new screen; its value is the summary (R7.6) |
| `src/navigation/MainStackNavigator.js` | modified: `NotificationSettings` route |
| `src/utils/__tests__/openNotification.test.js`, `src/stores/__tests__/notificationStore.test.js` | new |

## Data and state

**`notifications`** (existing, extended):

| Column | Use |
|---|---|
| `type` | adds `REPLY`, `ROOM_COMMENTS`, `ROOM_JOIN`, `ROOM_BOOK` |
| `room_id` | the room the row is about; NULL for NEW_BOOK / SYSTEM |
| `book_id` | the book (existing column), set for REPLY, ROOM_COMMENTS, ROOM_BOOK |
| `event_count` | comments bundled into a ROOM_COMMENTS row; 1 otherwise |
| `last_pushed_at` | when this row was last pushed; drives the 30-minute throttle |
| `updated_at` | bumped when a bundled row changes, so it sorts to the top of the inbox |

**`notification_settings`** (new): `user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE`, `replies`, `room_comments`, `room_joins`, `room_book`, `new_books` (all `boolean NOT NULL DEFAULT true`), `updated_at`. No row means everything is on (R7.3). `PUT` upserts. The account-deletion test finds FKs to `users` from `pg_constraint`, so it covers this table without changes.

**Type → switch:** REPLY → `replies`, ROOM_COMMENTS → `room_comments`, ROOM_JOIN → `room_joins`, ROOM_BOOK → `room_book`, NEW_BOOK → `new_books`. SYSTEM has no switch and always pushes.

**API**
- `GET /users/me/notification-settings` → `{ replies, room_comments, room_joins, room_book, new_books }`
- `PUT /users/me/notification-settings` with any subset → the full set
- `GET /notifications` items gain `room_id`, `count`, `updated_at`

**Push data:** `type`, `notification_id`, plus `room_id`, `room_name`, `book_id` when set. All strings, as FCM requires.

**App state:** `notificationStore.settings` (null until fetched). Nothing new is persisted on the device. Permission is read live with `messaging().hasPermission()` when the screen focuses.

## Navigation
- New `NotificationSettings` screen in `MainStackNavigator`, pushed from Settings like `Interest`. Back chevron, standard push.
- `openNotification` targets:
  - REPLY / ROOM_COMMENTS → `findReaderBook(bookId)`, then `navigate('Main', { screen: 'ManuscriptScreen', params: { book, roomId } })`
  - ROOM_JOIN / ROOM_BOOK → `RoomLobbyScreen` with `{ room: rooms.find(id) || { id: roomId, name: roomName } }`, the same fallback `openShelfBook` uses
  - NEW_BOOK → as today
- Push taps address `Main` through the root ref, and wait for `isReady()` on a cold start (the existing pattern in `handleOpened`). Inbox taps use the screen's own navigation.

## Edge cases
- **Retried comment POST:** the `ON CONFLICT (user_id, client_id)` path returns the earlier row's id, which differs from the new `commentID`. No notification (R2.7).
- **Reply to your own comment:** no R1. Other members still get R2.
- **Reply whose root author has left the room:** they're no longer a member, so no R1. Membership is checked when sending.
- **Root author is also a recipient for R2:** excluded, so they get one notification, not two (R1.4).
- **No reading progress for the book:** treated as furthest page 0, so any comment past page 0 is locked for them.
- **Locked becomes unlocked later:** the row keeps its "commented on p. N" text; the comment layer shows the real text once they get there. A bundled row has no text either way.
- **Bundle while the reader is in the app:** the foreground `onMessage` toast shows the body as today, which is never more than the push itself.
- **Reader leaves the room with an unread bundle:** the row stays. Tapping it hits R6.5 if the room is gone, or the room's reader if it still exists (the comment layer then refuses them as a non-member). R6.5's message covers both.
- **Room deleted:** FK cascade removes its rows (R5.7). A push already on a lock screen falls back to R6.5.
- **Account deleted:** `notifications` and `notification_settings` cascade with the user (existing account-deletion rule).
- **Room picks the same book again, or clears it:** no notification (R4.2).
- **Join that 409s:** returns before the insert, so no notification (R3.3).
- **FCM unconfigured (local dev):** `ErrPushDisabled`; inbox rows are still written, nothing waits.
- **Push timeout hit:** logged and dropped; the request still succeeds. The inbox has the row.
- **Two comments race for the same recipient:** the partial unique index plus `INSERT … ON CONFLICT … DO UPDATE` keeps one unread row. Only the transaction that sees `last_pushed_at` outside the window (and sets it) pushes.
- **Switch turned off with an unread bundle:** the row stays as it is and stops updating; nothing new is written for that type.
- **Switch turned back on:** only events from then on arrive; nothing missed is backfilled.
- **Bad `NOTIFY_ROOM_COMMENT_WINDOW` value:** logged at startup, and the 30-minute default is used.
- **iOS permission off:** the server still pushes (FCM accepts it, iOS drops it). The screen says so (R7.5).
- **Offline when changing a switch:** the save fails, the switch goes back, toast (R7.4).
- **Page numbers:** "p. {page}" must use the same numbering the comment layer shows in the reader. Check this in task 5 before fixing the format.

## Alternatives considered
- **A scheduled job to flush bundles at the end of the window (Cloud Scheduler or Cloud Tasks):** sends the last burst on time, but adds infrastructure for a nudge. The row-as-throttle is enough, and the inbox stays exact.
- **Pushing in the background goroutine as NEW_BOOK does:** fine with "CPU always allocated", but the service throttles CPU, and paying for always-on CPU to send a few pushes isn't worth it.
- **Per-recipient queries in Go instead of one SQL statement:** simpler to read, but one round trip per member per comment. Rooms are small either way; SQL keeps it to one statement for the upsert.
- **Settings in `user_preferences.preferences` (JSON):** that table holds genre interests. A typed table gives defaults, types and a clean cascade.
- **Holding locked pushes until the reader catches up:** decided against; out of scope.
