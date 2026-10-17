# Room Notifications: Requirements

Status: Approved <!-- Draft → Approved -->
Design handoff: none for the new screen. It follows Settings (7b phone, 15m iPad) and its existing `SettingsGroup` / `SettingsRow` switch rows. The handoff's only rule about notifications is the widget's: "Comments-waiting count only counts unlocked comments — the widget never spoils." Spans two repos: this app and `readpanda/packages/api-go`.

## Goal
Push works end to end, but the only thing that sends one is a writer publishing a book with "notify readers" on. Nothing tells you when something happens in your rooms. Someone replies to your comment, your room picks its book, a friend joins: you only find out by opening the app. This sends a push (and an inbox row) for those moments, without ever spoiling a page you haven't reached, without flooding you when a room is busy, and with a switch per type so readers decide what they hear about.

## Out of scope
- @mentions, likes, and replies to threads you replied in but didn't start.
- Schedule notifications ("The 6 members get a notification when you save", § 18). Schedules are on hold.
- Holding a locked comment's push until the reader reaches its page.
- Per-room mute.
- Updating the home screen widget from a push while the app is in the background (a silent push). The widget still refreshes as it does today.
- Android. It has no `google-services.json` yet, so push is off there.
- Changing how the existing NEW_BOOK broadcast is sent. It only gets a switch (R5.3, R7) and the sound (R5.4).

## Requirements

### R1. Replies to your comment
**User story:** As a reader, I want to know when someone replies to my comment so that I can keep the conversation going.

**Acceptance criteria**
1. WHEN someone replies to a comment THE server SHALL notify the author of the comment being replied to: title "{username} replied", body the reply's text cut to 120 characters with "…" if longer.
2. WHEN the reply's author is the comment's author THE server SHALL NOT notify anyone about it under R1.
3. A reply notification SHALL be sent right away. It's never bundled (R2.4 doesn't apply).
4. WHEN a reader gets an R1 notification for a comment THE server SHALL NOT also count that comment toward their R2 room notification.

### R2. New comments in your room
**User story:** As a room member, I want to know when my room is talking so that I can join in, without the push spoiling anything ahead of me.

**Acceptance criteria**
1. WHEN someone comments (including a reply) in a room THE server SHALL notify every other member of that room, except anyone notified under R1 for that comment.
2. WHEN the comment is on a page at or before the recipient's furthest page for that book THE notification SHALL be title "{Room name}", body "{username}: {text}" with the text cut to 120 characters.
3. WHEN the comment is on a page past the recipient's furthest page THE notification SHALL be title "{Room name}", body "{username} commented on p. {page}". It SHALL NOT contain any of the comment's text, in the push or the inbox row. A reply counts as being on its root comment's page.
4. WHILE a recipient has an unread room-comments row for a room THE server SHALL add new comments to that row instead of creating another: body "{n} new comments", where n is the number of comments since the row was created. A bundled row SHALL NOT contain any comment text.
5. THE server SHALL push a room-comments row at most once per bundling window: 30 minutes, set in server config so it can change without a code change. A comment that arrives inside the window updates the row, but doesn't push. The next comment after the window pushes the row as it stands ("{n} new comments").
6. WHEN the recipient has read the row THE next comment in that room SHALL start a new row and push it right away.
7. WHEN the comment request is a retry that returns an already stored comment (same `client_id`) THE server SHALL NOT notify anyone again.

### R3. Someone joins your room
**User story:** As a room's creator, I want to know when someone joins with my invite so that I can welcome them.

**Acceptance criteria**
1. WHEN a reader joins a room with its invite code THE server SHALL notify the room's creator: title "{Room name}", body "{username} joined the room".
2. Other members SHALL NOT be notified of joins.
3. WHEN the join fails, or the reader was already a member (409) THE server SHALL NOT notify anyone.

### R4. Your room picks its book
**User story:** As a room member, I want to know when the room picks or changes its book so that I can start reading with everyone.

**Acceptance criteria**
1. WHEN the creator sets the room's book to a book that's different from the current one THE server SHALL notify every member except the creator: title "{Room name}", body "Now reading {Book title}".
2. WHEN the book is cleared, or set to the book it already had THE server SHALL NOT notify anyone.

### R5. Delivery rules for every type
1. THE reader who caused an event SHALL never be notified about it.
2. Every notification SHALL write an inbox row first and then push to the recipient's devices. A failed or unconfigured push SHALL NOT lose the inbox row (the existing `notify` rule).
3. WHEN the recipient has switched a type off (R7) THE server SHALL neither push it nor write or update an inbox row for it. This includes the NEW_BOOK broadcast. Rows written before the switch was turned off stay.
4. Every push, including NEW_BOOK, SHALL play the default iOS notification sound.
5. THE push data SHALL carry `type`, `notification_id`, and as relevant `room_id`, `room_name` and `book_id`, so the app can open the right place (R6).
6. Event pushes SHALL finish sending before the request that triggered them responds, bounded by a timeout. A slow or failed push SHALL NOT fail or noticeably delay that request beyond the timeout. A reader with many registered devices SHALL still be reached within it: one slow or failing device SHALL NOT keep the others from being tried. *(Added 2026-10-17 after device QA: with 25 devices sent one after another, the 5s budget ran out after 8.)*
7. WHEN a room is deleted THE inbox rows about it SHALL be deleted with it.

### R6. Opening a notification
**User story:** As a reader, I want tapping a notification to take me to the thing it's about.

**Acceptance criteria**
1. WHEN a reply or room-comments notification is tapped (from a push or the inbox) THE app SHALL open the reader on that book with that room's comments selected (`ManuscriptScreen` with `roomId`).
2. WHEN a join or room-book notification is tapped THE app SHALL open that room (`RoomLobbyScreen`).
3. A NEW_BOOK notification SHALL keep opening the book, as today.
4. WHEN a notification is tapped THE app SHALL mark it read and refresh the inbox, as today.
5. IF the book or room no longer exists, or the reader is no longer a member THEN THE app SHALL stay where it is and show "That's no longer available".
6. WHEN a tap cold-starts the app THE app SHALL get to the same place once navigation is ready (the existing NEW_BOOK behavior, now for every type).
7. THE inbox SHALL show an icon per type: reply, room comments, join, room book, new book, and other.
8. WHEN the app returns to the foreground THE bell's unread count SHALL refresh from the server. *(Added 2026-10-17 after device QA: pushes that arrived in the background left the badge stale until the bell was opened.)*

### R7. Notification settings
**User story:** As a reader, I want to choose which notifications I get so that the app only interrupts me for what I care about.

**Acceptance criteria**
1. WHEN Settings → Notifications is tapped THE app SHALL open a Notifications screen instead of iOS settings.
2. THE screen SHALL have one switch each for: Replies to you, Room comments, New members, Room picks a book, and New books. Every reader sees all five, including New members.
3. Every switch SHALL start on, for new and existing readers.
4. WHEN a switch is changed THE app SHALL update it at once and save it to the server. IF saving fails THEN THE switch SHALL go back and the app SHALL show "Couldn't save. Try again."
5. WHEN iOS notification permission is off for ReadPanda THE screen SHALL say "Notifications are off for ReadPanda in iOS Settings" with an "Open Settings" link that opens the system settings. The switches stay usable.
6. THE Settings row's value SHALL summarize the state: "All on", "{n} of 5 on", "All off", or "Off in iOS Settings" when permission is off.
7. On iPad the screen SHALL use the same constrained column width as Settings (15m) and never stretch a row across the screen.

### R8. Server settings
1. `GET /users/me/notification-settings` SHALL return the five switches, all `true` for a reader who has never changed them.
2. `PUT /users/me/notification-settings` SHALL accept any subset of the five, save it, and return the full set.
3. WHEN an account is deleted THE settings SHALL be deleted with it.

## Open questions
- [x] Which events → replies, room comments, joins, room picks a book.
- [x] Locked comments → push without content.
- [x] Busy rooms → one row per room, pushed at most every 30 minutes. Replies always immediate.
- [x] Controls → per-type switches stored on the server.
- [x] Joins → creator only.
- [x] Inbox → one row per room for comments.
- [x] Defaults → all on.
- [x] A switched-off type → nothing is sent to that reader: no push and no inbox row (R5.3).
- [x] "New members" switch → shown to everyone (R7.2).
- [x] Bundling window → 30 minutes for now, configurable on the server (R2.5).
