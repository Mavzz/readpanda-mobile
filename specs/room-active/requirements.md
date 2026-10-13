# Active Room (2c phone · 14i iPad): Requirements

Status: Draft <!-- Draft → Approved -->
Design handoff: `ReadPanda Design Review.dc.html` § 2c (phone), § 14i (iPad landscape; in portrait the comments move under the schedule). § 1b is marked "Replaced by 2c": don't build it. § 18 (room schedules) is **On hold**. § 2d / § 2e / § 14l (the ⋯ menu) are **not built for now**: Leave/Delete stay at the bottom (R7).

## Goal
Once a room is reading a book, its Room screen is still the setup screen (2a): book card, invite, members. Where everyone is and what's been said live on a separate room-read screen (1b) that you reach from My Books, and that screen still uses the old 3-tab bar. The active Room puts that in one place, on phone and iPad, and replaces 1b.

## Out of scope
- **Schedules (turn 18, on hold):** the strip, "Set the pace", the edit sheet and the "Edit" link. Nothing creates a schedule yet.
- The setup state (2a / 15k), which stays as it is.
- Handing a room to another member (doesn't exist; the creator leaves by deleting).

## Requirements

### R1. When it shows
1. WHEN the room has a book THE Room screen SHALL show the active layout (2c / 14i). WHEN it has no book THE screen SHALL show 2a as today.
2. WHEN a room book is tapped on the My Books shelf or the Currently reading list THE app SHALL open that room's active Room (2c phone, 14i iPad). A solo book still opens 4b.
3. THE room-read view (1b, `RoomBookScreen`) SHALL be removed.

### R2. Header
1. THE header SHALL show back, the room name, and "{n} readers · {Book}".
2. Invite SHALL be a 44pt icon button (VoiceOver label "Invite") that opens the existing invite share.
3. THE members row SHALL NOT appear, because "Where everyone is" shows every member.

### R3. Schedule (on hold)
1. WHILE turn 18 is on hold THE Schedule card SHALL be hidden for everyone, including its strip, "Edit" and "Set the pace".

### R4. Your place
1. THE screen SHALL show "Ch. {n} · Page {p}" and "{n} comments waiting at p. {p}" (unlocked comments only), with a Continue button that opens the reader at the saved anchor and with this room's comment layer on. (In 2c this sits under the schedule strip; while that's hidden it's a card of its own.)

### R5. Where everyone is
1. THE section SHALL show each member as a dot along the book at their position, yours with an amber ring, and a line such as "Most of the room is in Ch. 3".
2. Positions SHALL match the Home friend track and the reader for the same room.

### R6. Recent comments
1. THE section SHALL show recent comments up to your position only, each with name, "p. {p} · {age}" and the body. Comments beyond your position SHALL be a count only ("{n} more unlock as you read") and never show their text.
2. Tapping a comment SHALL open its thread (the existing thread sheet).
3. Phone: stacked under "Where everyone is". iPad landscape: the right column. iPad portrait: under your place and "Where everyone is".

### R7. Leave / Delete
1. Leave room (members) and Delete room (creator) SHALL stay at the bottom of the screen, as in 2a today, in the active state as well as the setup state, with today's confirmations. *(Decided 2026-10-14: no ⋯ menu for now; 2d / 2e / 14l are deferred.)*

## Open questions
- [x] **Setup-state danger zone:** keep Leave/Delete at the bottom in every state; the ⋯ menu is deferred.
