# Report & block: Design

## Approach
### API (readpanda, `packages/api-go`)
**Migration: `scripts/migrate_report_block.sql`.** It's mirrored in
`readpanda_schema.sql`.

```sql
CREATE TABLE content_reports (
  id            varchar(50) PRIMARY KEY,               -- "rp_<uuid>"
  reporter_id   uuid REFERENCES users(uuid) ON DELETE SET NULL,      -- R3.3
  target_type   varchar(10) NOT NULL CHECK (target_type IN ('comment','user','room')),
  target_id     varchar(50) NOT NULL,
  target_user_id uuid REFERENCES users(uuid) ON DELETE SET NULL,     -- whose content it is
  room_id       varchar(50),                            -- no FK: the report outlives a deleted room
  reason        varchar(20) NOT NULL CHECK (reason IN ('harassment','hate','sexual','violence','self_harm','spam','other')),
  details       text CHECK (details IS NULL OR char_length(details) <= 500),
  snapshot      text NOT NULL,                          -- R3.2
  status        varchar(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','dismissed')),
  action        varchar(20),                            -- remove_comment | close_room | delete_room | suspend_user | dismiss
  resolved_by   uuid REFERENCES users(uuid) ON DELETE SET NULL,
  resolved_at   timestamp,
  created_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX content_reports_open_once ON content_reports (reporter_id, target_type, target_id) WHERE status = 'open'; -- R1.7
CREATE INDEX content_reports_status ON content_reports (status, created_at DESC);

CREATE TABLE user_blocks (
  blocker_id uuid NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE book_comments ADD COLUMN deleted_at timestamp,
  ADD COLUMN deleted_by varchar(10) CHECK (deleted_by IN ('author','moderator'));
```

- `DeleteMe` already lists each table it clears. It gains `user_blocks` in
  both directions; the foreign keys would cascade anyway, and this keeps it
  explicit.
- The reporter's reports are kept with a null reporter (R3.3), via the
  `ON DELETE SET NULL` key.

**Word filter (R8): `internal/moderation`.**
- `wordlist.go` holds the list, a `[]string` and the only place to edit it
  (R8.5).
- `moderation.Check(text) error` lowercases the text and splits it into
  words on anything that isn't a letter or digit. It also folds a few
  look-alike characters (`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `@→a`, `$→s`).
  It returns `ErrBlockedWords` if any word is on the list.
- Matching is on whole words only, so "Scunthorpe" passes (R8.2).
  Multi-word entries match as a run of words.
- It's called from:
  - `CreateComment` (body)
  - `CreateRoom` (name, description)
  - open-rooms' `UpdateRoom`, if it ever takes a name
  - the username check in signup (`/signup`, `/signup/available`, and
    Apple and Google sign-up when they pick a username)
- The response is `400 {"error": "That includes words we don't allow.",
  "code": "blocked_words", "field": "<field>"}`.

**Reports (R1–R4): `internal/handlers/reports.go`.**
- `POST /reports` with
  `{ target_type, target_id, room_id?, reason, details? }`.
- **Checks:**
  - `details` is required when `reason = other` (R1.3).
  - The target must exist and be visible to the reporter: a member of the
    comment's room, a co-member for a reader, a member of the room or an
    open room for a room (`404` otherwise).
  - You can't report yourself, your own content, or the Deleted reader
    (`400`, R2.4).
- **Storing:** it works out `target_user_id`, `room_id` and the snapshot
  (R3.2). Then it does
  `INSERT … ON CONFLICT (reporter_id, target_type, target_id) WHERE status='open' DO NOTHING`.
  A duplicate answers `200`, the first `201` (R1.7).
- **Rate limit:** at most 30 reports per reporter in the last 24 hours,
  counted from the table. Beyond that it answers `429` with the R3.4
  message.
- **Alert (R4):** `notifyAdmins(report)` sends
  `notify.Send(adminIDs, {Type: SYSTEM, Title: "New report", Message: "<Reason label> · <comment in Room | reader <username> | room Room>"})`.
  It runs before responding, as `notifyJoin` does. A failure is only
  logged (R4.3). SYSTEM rows have no on/off switch, so admins always get
  them.

**Hiding reported comments from the reporter (R1.4).** `GetBookComments`
leaves out, for the caller, comments they've reported (any status),
through the same `hidden` set as blocks below.
- A reported root with no visible replies is dropped.
- A reported root with replies comes back as
  `{ id, hidden: "reported", replies }`, with no body or author.

**Blocks (R5, R6).**
- `POST /users/me/blocks` with `{ user_id }` (`204`, idempotent;
  `400` for yourself or the Deleted reader).
- `DELETE /users/me/blocks/{userId}` (`204`).
- `GET /users/me/blocks` returns `[ { user_id, username, blocked_at } ]`,
  newest first.

Everywhere the API sends comments to a reader, it filters with
`NOT EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = $me AND blocked_id = c.user_id)`.
That covers:
- `GetBookComments`: both the visible-roots query and the replies query,
  plus `locked_count` and `unlocked_unread_count` (R5.3)
- the notifications in `notify`: `REPLY`, `ROOM_COMMENTS` and `ROOM_JOIN`.
  A recipient who blocked the actor is dropped from the recipient list
  before writing (R5.5).
- open-rooms' `ListOpenRooms`: `AND NOT EXISTS (… blocked_id = r.admin_id)`
  (R5.4)
- `friends_read` on Book detail, which names readers

Room Detail's `members[]` gains `blocked: bool` (R5.6). Nothing changes for
the blocked reader (R5.7).

**Deleting your comment (R7): `DELETE /comments/{commentId}`.**
- Author only (`403`), and the comment must not already be deleted
  (`404`).
- If it has replies:
  `UPDATE … SET body = '', deleted_at = now(), deleted_by = 'author'`.
  Its likes and reads are deleted. `anchor_text` stays: it's the book's
  words, not the reader's, and the thread shows it as its quote.
- If it has none, the row is deleted. Deleting the last reply under a
  placeholder deletes the placeholder too, so no empty "Comment deleted"
  is left behind.
- The response is `204`.
- A placeholder never counts as unread or locked (in `GetBookComments` and
  progress's `newly_unlocked`), and it can't be liked (`404`).
- `GetBookComments` returns soft-deleted roots as `{ id, deleted: "author"
  | "moderator", replies, page, anchor_key }`, with no body, author or
  likes (R7.4).
- `CreateComment` refuses replies to a deleted root (`404`).

The body has to be the empty string, not NULL, because of the body CHECK.
The migration changes that CHECK to allow `''` only when `deleted_at` is
set.

**Suspension (R10).**
- **The check:** `users.isactive = false` means suspended. A helper,
  `requireActive(w, userID) bool`, runs one indexed query and answers
  `403 {"error": "...", "code": "account_suspended"}`.
- **Where it runs:**
  - login (password, Apple, Google), after the user is found
  - `RefreshAccessToken`
  - `CreateComment`, `CreateRoom`, `JoinRoom`, open rooms' `JoinOpenRoom`
    and `UpdateRoom`, `SetRoomReading`, `POST /reports` and the block
    routes
- Two reads check too, since they're how the app refreshes: the unread
  count (asked on every return to the foreground) and `GET /room/my-rooms`
  (Home and Rooms, pull to refresh). Other reads stay open until the access
  token expires; then the refresh fails and the app signs out (R10.2).

**Moderation API (R9).**
- `GET /admin/reports?status=open&limit=&offset=` returns reports, newest
  first, each joined with the reporter's and target user's usernames, the
  room name, and the comment's current state. A comment's state is live,
  deleted or removed.
- `POST /admin/reports/{id}/resolve` takes `{ action }`:
  - `remove_comment`: soft-delete with `deleted_by = 'moderator'`, or a
    hard delete if there are no replies (R9.2)
  - `close_room`: `is_private = true` (R9.3)
  - `delete_room`: the existing delete logic, without the creator check
  - `suspend_user`: `isactive = false` and the user's refresh tokens
    deleted (R9.4)
  - `dismiss`
- It sets `status`, `action`, `resolved_by` and `resolved_at`. Any other
  open reports on the same `target_type` and `target_id` close with the
  same action (R9.5).
- After the commit, it tells the people the action affects (R9.8), as
  `SYSTEM` notifications through `notify.Send` (always on, and a tap only
  marks them read, so the app needs no change). They carry no `room_id`: a
  deleted room would take its rows with it. Who and the room's name are read
  before the action, since a deleted room is gone after it.

  | Action | Who | Title | Message |
  |---|---|---|---|
  | `remove_comment` | the author | Your comment was removed | Your comment in "Room" broke our community rules (Reason). Questions? readpanda.support@gmail.com |
  | `close_room` | the creator | Your room is invite-only now | "Room" was taken out of open rooms for breaking our community rules (Reason). Questions? … |
  | `delete_room` | the creator | Your room was removed | "Room" was removed for breaking our community rules (Reason). Questions? … |
  | `delete_room` | other members | A room was removed | "Room" was removed for breaking our community rules. |

  "(Reason)" is the resolved report's reason label, left out for "Something
  else". Nobody is told for `dismiss` or `suspend_user` (R10.2 has its own
  alert), for a comment its author had already deleted, or when the author is
  the Deleted reader.
- The app can't learn from the notice which room went (no `room_id`), so
  it asks (R9.9): on a `SYSTEM` push in the foreground and on returning to
  the foreground, `usePushNotifications` re-reads the active room's detail
  (`recheckActiveRoom`; not the list, whose rows carry no members). A 404 from `fetchRoomDetail` drops the room
  (`roomGone`: out of `rooms`, `detachRoom` on the shelf) and records its
  id in `removedRoomIds`. The room page watches for its own id there and,
  once it's the focused screen, shows "This room was removed" and goes
  back, as Leave and Delete do.
- `PATCH /admin/users/{uuid}` takes `{ isactive }` to suspend or reinstate
  (R9.6, R10.4).
- All of these use the existing admin middleware (R9.7).

### Portal (readpanda, `packages/portal`)
- **`pages/reportsPage.jsx`, route `/reports`, linked in the nav with an
  open count:**
  - A table with the columns of R9.1.
  - Tabs: Open, Actioned, Dismissed.
  - Each open row has buttons for its target type: Remove comment,
    Close room, Delete room, Suspend user, Dismiss. Every button asks for
    confirmation.
  - The snapshot shows in a monospace block, so nothing renders as HTML.
- **`pages/usersPage.jsx` and `userDetailPage.jsx`:** a "Suspended" badge,
  and a Suspend / Reinstate button.
- **`services/`:** the calls for both pages.

### Site (readpanda, `site/`)
- `terms.html` "Reporting and enforcement": report from the ⋯ menu on a
  comment, a member, or a room; block from the same menus; email still
  works. It keeps "We review every report and act promptly", with no
  number of hours.
- `support.html` gains a short "Report or block someone" answer.

### App
**Data.**
- `commentsStore`'s comment normaliser gains:
  - `deleted: 'author' | 'moderator' | null`
  - `hidden: 'reported' | null`
  - `isMine`, matched on username the way rooms' `isMe` is
- The optimistic comment's `userId: profile?.uuid || 'me'`
  (`commentsStore.js:176`) is replaced by `isMine: true`, since the
  profile has no uuid. This fixes the bug noted in the bug-reporting
  session.
- New `src/services/safetyService.js`: `reportContent`, `blockUser`,
  `unblockUser`, `fetchBlocks` and `deleteComment`.
- New `src/stores/blocksStore.js` (zustand) holds
  `{ blocked: [{ userId, username }], loaded }` and the actions `fetch`,
  `block` and `unblock`. `block` also calls
  `commentsStore.dropAuthor(userId)`, which removes that author's
  comments from every loaded book at once, before the next fetch confirms
  it (R5.2).
- `commentsStore` gains:
  - `deleteComment(bookId, commentId)`: optimistic; placeholder or removal;
    rollback on failure (R7.3, R7.5)
  - `hideReported(bookId, commentId)` (R1.4)
  - `dropAuthor`
- Room Detail's `members` gain `blocked`.

**One place for the actions: `src/hooks/useSafetyActions.js`.** It returns
`reportComment(comment, ctx)`, `reportUser(user, ctx)`,
`reportRoom(room)`, `blockUser(user)` and `confirmDelete(comment, bookId)`.
Each one:
- picks the reason with `ActionSheetIOS.showActionSheetWithOptions`, using
  the R1.2 labels
- for "Something else", asks with `Alert.prompt` (iOS), sending only when
  the text isn't blank (R1.3)
- confirms blocks and deletes with `Alert.alert` (R5.1, R7.2)
- calls the store and shows the outcomes (R1.4–R1.6, R5.2, R7.5)
- after a report of a comment or reader, says "Thanks. We'll take a look."
  in an `Alert.alert` that also offers to block the author (R1.4, R1.5):
  one alert, which shows over any sheet, where a toast wouldn't

The system sheets present from the topmost controller, so they work over
the native reader too. Short outcomes ("ada blocked", failures) go through
a `say` the caller can pass; it defaults to a toast, and a screen showing a
native sheet passes one that's visible over it. The hook also returns
`unblockUser`, for the member list and Settings.

Android has neither `ActionSheetIOS` nor `Alert.prompt`. There,
`SafetySheetHost` (mounted beside `Toaster`) draws the reasons with
`PickerSheet` and the "Something else" box; `pickReason.ios.js` and
`pickReason.android.js` pick which.

**Reader comment sheet (native, `ios/CommentSheetView.swift`).**
- `ReaderComment` gains `isMine`, `deleted` and `hidden`.
- Each row gets a "⋯" `UIButton` with `showsMenuAsPrimaryAction` (R1.1,
  R7.1). The menu holds "Delete comment" (destructive) for your own, and
  "Report comment" and "Block <username>" for others'.
- Choosing an item fires the new `onCommentAction` event (registered in
  `RNPdfViewer.m`) with `{ action, commentId, userId, username }`. The
  confirmation, reason sheet and API call all happen in JS, through
  `useSafetyActions` in `ManuscriptScreen`, so there's one implementation.
  The updated threads come back through the existing `comments` prop.
- Placeholder rows ("Comment deleted", "Removed by ReadPanda", "You
  reported this comment") show in italic `onSurfaceVariant` text. They
  have no menu, like or reply, and an accessibility label of the same text
  (R7.4, R12.3).
- **Refused comment (R8.3):** `commentsStore.addComment` sees `400` with
  `code: blocked_words` and marks the comment `failed: 'blocked_words'`.
  The native row then shows "Includes words we don't allow" with
  "Edit" instead of "Retry". Edit puts the text back in the composer and
  removes the row. The JS thread sheet does the same.

**JS thread sheet (`CommentThreadSheet.js`).** The same "⋯" button on
each `CommentRow`, a `Pressable` with an `ellipsis-horizontal` icon and the
R12.1 label, calling `useSafetyActions`. It has the same placeholder rows.
Both `RecentComments` and `NewInRooms` pass `bookId` and `roomId` through.

**Room page.**
- **`MemberList`:** other members' rows become `Pressable`s that open an
  `ActionSheetIOS` with "Report <username>", "Block <username>" (or
  "Unblock") and Cancel. A blocked member shows "Blocked" under their name
  (R5.6). Your own row and the Deleted reader aren't pressable (R2.4).
- The active room (2c / 14i) had no member list, only the unlabelled dots
  of "Where everyone is", so it gains the same `MemberList`: after the
  recent comments, before the invite card (decided 2026-10-22).
- **`LobbyHeader` / `ActiveRoomHeader`:** a "⋯" circle button for
  non-creators, holding "Report room" (R2.2).
- **Open-room preview (specs/open-rooms `OpenRoomSheet`):** a "Report
  room" text link under Join.

**Blocked readers (R6): `src/screens/profile/BlockedReadersScreen.js`,
route `BlockedReaders`.**
- Built like `NotificationSettingsScreen`: the back button and title, one
  `SettingsGroup` of rows, each with the username and an "Unblock" text
  button.
- It has the empty text of R6.4: "You haven't blocked anyone. To block
  someone, tap ⋯ on their comment or their name in a room."
- In Settings, the "Rooms & privacy" group gets a "Blocked readers" row
  (icon `hand-left-outline`) after "Who sees my progress", with the count
  as its value. It loads `blocksStore.fetch` on focus.

**Suspended (R10.2).** `apiService` handles the refresh and the request
error path. A `403` with `code: account_suspended` calls
`authStore.signOut()` and then `Alert.alert` with the R10.2 text, once:
a flag stops several failing calls from stacking alerts.

**Word filter errors in forms (R8.4).** Create room, and sign-up's
username field, show the `400` message by the field, through each form's
existing error display.

**Help topic (R11.1).** In `helpTopics.js`, `report` changes to: "Tap ⋯ on
the comment, or tap their name in the room's member list, and choose
Report. You can block them from the same menu. We review every report
promptly. You can also email us at the address below."

## Files
| File | Change |
|------|--------|
| readpanda `api-go/scripts/migrate_report_block.sql` | new: `content_reports`, `user_blocks`, comment `deleted_at` / `deleted_by`, body CHECK |
| readpanda `api-go/scripts/readpanda_schema.sql` | modified: the same |
| readpanda `api-go/internal/moderation/` | new: `wordlist.go`, `check.go`, `check_test.go` |
| readpanda `api-go/internal/handlers/reports.go` | new: `CreateReport`, `notifyAdmins`, admin list / resolve |
| readpanda `api-go/internal/handlers/blocks.go` | new: block, unblock, list |
| readpanda `api-go/internal/handlers/comments.go` | modified: block / report / deleted filtering; `DeleteComment`; filter on create; no replies to deleted |
| readpanda `api-go/internal/handlers/rooms.go` | modified: filter on create; `members[].blocked`; open-rooms block filter; `requireActive` |
| readpanda `api-go/internal/handlers/users.go` | modified: `requireActive` on logins and refresh; filter on usernames; `DeleteMe` clears blocks; admin `PATCH /admin/users/{uuid}` |
| readpanda `api-go/internal/handlers/books.go` | modified: `friends_read` leaves out blocked readers |
| readpanda `api-go/internal/notify/` | modified: drop recipients who blocked the actor |
| readpanda `api-go/internal/server/router.go` | modified: new routes |
| readpanda `api-go/internal/server/report_block_test.go` | new: report rules, duplicates, rate limit, block filtering in comments and counts, delete rules, suspension, admin actions |
| readpanda `api-go/ROUTES.md` | modified: new routes; Room Detail and comments fields |
| readpanda `portal/src/pages/reportsPage.jsx` | new |
| readpanda `portal/src/pages/usersPage.jsx`, `userDetailPage.jsx`, `App.jsx`, `services/` | modified: suspend / reinstate; Reports route and nav |
| readpanda `site/terms.html`, `site/support.html` | modified: in-app reporting and blocking |
| `src/services/safetyService.js` | new |
| `src/stores/blocksStore.js` | new |
| `src/stores/commentsStore.js` | modified: `deleted` / `hidden` / `isMine`; `deleteComment`, `hideReported`, `dropAuthor`; `blocked_words` failure |
| `src/stores/roomStore.js` | modified: `members[].blocked` |
| `src/hooks/useSafetyActions.js` | new |
| `ios/CommentSheetView.swift`, `ios/ReaderModels.swift`, `ios/RNPdfViewer.swift`, `ios/RNPdfViewer.m` | modified: ⋯ menu, placeholders, `onCommentAction`, blocked-words row |
| `src/components/PdfViewer.js`, `src/screens/ManuscriptScreen.js` | modified: pass `onCommentAction` to `useSafetyActions` |
| `src/components/CommentThreadSheet.js` | modified: ⋯ menu, placeholders, blocked-words row |
| `src/screens/roomLobby/MemberList.js`, `LobbyHeader.js`, `ActiveRoomHeader.js` | modified: report / block |
| `src/components/OpenRoomSheet.js` | modified: Report room (after specs/open-rooms) |
| `src/screens/profile/BlockedReadersScreen.js` | new |
| `src/screens/profile/SettingsScreen.js`, `src/navigation/MainStackNavigator.js` | modified: Blocked readers row and route |
| `src/services/apiService.js` | modified: `account_suspended` sign-out |
| `src/screens/CreateRoomScreen.js`, sign-up username field | modified: show `blocked_words` by the field |
| `src/screens/profile/helpTopics.js` | modified: report answer |
| `src/hooks/__tests__/useSafetyActions.test.js`, `src/stores/__tests__/blocksStore.test.js`, `src/stores/__tests__/commentsStore.safety.test.js` | new |

## Data and state
- **API tables:** `content_reports`, `user_blocks`, and
  `book_comments.deleted_at` / `deleted_by`.
- **New routes:** `/reports`, `/users/me/blocks` (three),
  `DELETE /comments/{id}`, `/admin/reports` (two), and
  `PATCH /admin/users/{uuid}`.
- **Response changes:** comments gain `deleted` / `hidden`, and Room
  Detail members gain `blocked`. Both are additive, so older app versions
  ignore them. An old version still shows a deleted comment as an empty
  bubble, which is acceptable before launch.
- **App:** the new `blocksStore`, which isn't persisted and refetches on
  sign-in and on the Settings screen.

## Navigation
- New route `BlockedReaders` (no params), pushed from Settings.
- No other routes. Reasons and confirmations are system sheets and
  alerts.

## Edge cases
- **Report then block:** both happen. The report's snapshot keeps the
  text.
- **Blocking someone whose comment the reader is replying to:** the thread
  disappears. The reply draft is dropped and the composer closes.
- **Both block each other:** each sees nothing from the other, and the
  table holds two rows.
- **Blocking a room's creator while in their room:** you stay in the room
  and their comments are hidden. Leaving is up to you.
- **Deleting a reply:** replies have no replies, so it's always a hard
  delete.
- **A moderator removes a comment someone is viewing:** it shows as
  removed on the next load. Likes are dropped.
- **Report target gone before review:** the snapshot still shows. Remove
  turns into a no-op that just closes the report.
- **Offline:** report, block and delete each fail with their message, and
  nothing is hidden or removed (R1.6, R7.5).
- **Admin accounts:** the alert goes to every `role = 'admin'` user. If
  there are none, the report is still saved and the API logs a warning.
- **Suspended while reading:** the app signs out on its next refresh
  (foreground or pull to refresh) or write. A reader who just keeps
  reading is signed out when the access token expires.
- **Word list false positives:** whole-word matching and the R8.2 rule
  keep these rare. Fixing one is a one-line change to `wordlist.go` and a
  redeploy.
- **Response time:** nothing in the app, terms or help promises a number of
  hours. The push alerts are there so you can act promptly anyway.

## Alternatives considered
- **An email per report:** needs a mail-sending service. Push to admin
  accounts uses what exists (decided 2026-10-21).
- **Native report UI inside the reader:** two implementations to keep in
  step. The JS hook with system sheets works over the native reader.
- **Hard-delete a comment with replies:** removes other people's words
  (decided 2026-10-21).
- **Hide blocked readers from member lists:** confusing in a small room,
  where you'd see "Members · 5" and only four names. Marking them is
  clearer.
- **Auto-hide after N reports:** easy to abuse with a few accounts. A
  person reviews every report instead.
- **A third-party moderation API:** more coverage, but a new vendor, cost,
  and sending readers' text to it. The word list is enough for launch.
