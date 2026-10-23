# Open rooms: Design

## Approach
### API (readpanda, `packages/api-go`)
**Migration (R7.1, R7.2).** New `scripts/migrate_open_rooms.sql`:

```sql
UPDATE rooms SET is_private = true WHERE is_private IS DISTINCT FROM true;
ALTER TABLE rooms ALTER COLUMN is_private SET DEFAULT true;
ALTER TABLE rooms ALTER COLUMN is_private SET NOT NULL;
CREATE INDEX IF NOT EXISTS rooms_open_idx ON rooms (current_book_id) WHERE NOT is_private;
```

`readpanda_schema.sql` gets the same column definition and index. The
migration runs before the new API is deployed. It doesn't depend on the
app, so it can go first.

**Create (R7.2).** `CreateRoom`'s request becomes `IsPrivate *bool`. A
missing value means `true`. Today a missing value decodes as `false`,
which is Open.

**List: `GET /room/open?book_id=&limit=&offset=` (R1).** New
`ListOpenRooms` in `rooms.go`. It's registered before `/room/{id}`, as
`/room/my-rooms` is, so mux doesn't read "open" as an id.

```sql
SELECT r.id, r.name, r.description, r.created_at,
       b.book_id, b.title, b.cover_image_url,
       u.username AS creator,
       (SELECT COUNT(*) FROM room_members m WHERE m.room_id = r.id) AS member_count
  FROM rooms r
  JOIN users u ON u.uuid = r.admin_id
  LEFT JOIN books b ON b.book_id = r.current_book_id
 WHERE NOT r.is_private
   AND r.admin_id <> $1
   AND NOT EXISTS (SELECT 1 FROM room_members m WHERE m.room_id = r.id AND m.user_id = $1)
   AND ($2 = '' OR r.current_book_id = $2)
 ORDER BY (r.current_book_id IS NOT NULL) DESC, member_count DESC, r.created_at DESC
 LIMIT $3 + 1 OFFSET $4
```

- `limit` defaults to 20, with a cap of 50. Asking for one extra row says
  whether there are more without a count query (R1.7).
- The response is `{ rooms: [OpenRoom], has_more }`.
- The new `models.OpenRoom` type has `id`, `name`, `description`,
  `current_book` (`BookPreview` without the manuscript URL), `member_count`,
  `creator_username` and `created_at`. It's a separate type rather than
  `RoomSummary` with fields blanked, so an invite code or member list can't
  leak through a later edit (R1.5).

**Join: `POST /room/{id}/join` (R5.4, R5.9).** The new `JoinOpenRoom` looks
the room up by id:
- `404` if it's missing
- `403 {"error": "This room is invite-only"}` if it's private
- `409` if the reader is already a member

Otherwise it does what `JoinRoom` does. Both handlers call a new
`joinRoomAs(w, room, userID)`, which holds today's insert, `notifyJoin`
and detail response. So the creator's notification and the response
(the full Room Detail) are identical for both kinds of join.

**Who can join: `PATCH /room/{id}` with `{ is_private }` (R6.3, R6.6,
R6.7).** The new `UpdateRoom` is creator-only (`403` otherwise). It
updates `is_private` and `updated_at` and returns the Room Detail.
Members and the invite code are untouched. It's a general PATCH, so
editing the name or description can be added to it later.

`ROUTES.md` documents all three routes.

### App
**Store (`roomStore.js`).**
- `normalizeOpenRoom(r)` → `{ id, name, description, currentBookTitle,
  coverUrl, memberCount, creatorName }`.
- `fetchOpenRooms({ bookId, limit, offset })` returns
  `{ status, rooms, hasMore }`. It doesn't write to the store: each screen
  keeps its own list, so Book detail's list for one book can't overwrite
  the Rooms tab's.
- `joinOpenRoom(roomId)`: the same as `joinRoomByCode` after the request.
  The shared part becomes a private `afterJoin(response)`, which:
  - merges the room into `rooms`
  - fetches its detail if the book is missing
  - attaches or adopts the book (R5.3)

  It maps `403` to "This room is invite-only now", `404` to "This room is
  gone" and `409` to `{ already: true }`.
- `setRoomPrivacy(roomId, isPrivate)`: optimistic, like `setRoomReading`.
  It restores the previous value on failure (R6.3, R6.4).
- `saveRoom` defaults `is_private` to `true` (R7.2).

**Shared privacy options.** Create room's `PRIVACY` object and its
privacy card move to `src/components/RoomPrivacy.js`, which exports
`ROOM_PRIVACY` and `PrivacyCard`. Create room and the new sheet both use
them, so the choices and their text stay identical (R6.2).

**Rows: `src/components/OpenRoomCard.js` (R2.4, R9.1).** It's built like
the Rooms tab's room card:
- the cover, the name, and the book title or "No book yet"
- a `people-outline` icon with "N members" where your own room card shows
  avatars and the group track

It gets one accessibility label: "<name>, reading <book>, N members". The
Rooms tab and the See all screen both use it. Your own room card stays in
`RoomsScreen`.

**Preview: `src/components/OpenRoomSheet.js` (R5).** A bottom sheet, which
on iPad is capped at `DS.layout.sheetMax` and centred, like `PickerSheet`.
It shows:
- the cover and title, or "No book yet"
- the name and description
- "N members · Started by <creator>"
- a "Join room" `GradientPill`, which shows a spinner while busy, ignores
  taps, and has `accessibilityState={{ busy }}` (R5.8, R9.2)

Its props are `{ room, visible, onClose, onJoined, onStale }`.
- On success it calls `onJoined(room)`, and the caller navigates and shows
  the toast (R5.2).
- On `already` it calls `onJoined` too (R5.7).
- On a 403 or 404 it shows the toast and calls `onStale()`, so the caller
  reloads (R5.5, R5.6).

**Rooms tab (`RoomsScreen.js`, R2, R8).**
- `useFocusEffect` and pull to refresh also call
  `fetchOpenRooms({ limit: 3 })`. Three, so it knows whether "See all" is
  needed while showing two.
- The open rooms render in `ListFooterComponent`, before the invite card.
  There's an "Open rooms" label, with "See all" when there are more than 2
  (R2.2), then the cards. On iPad the cards sit in the same 2-column row
  layout.
- An error or an empty list hides the section (R2.3). It never shows a
  toast, because the pull-to-refresh toast already reports the tab's own
  load.
- The subtitle and the invite card text change (R8).

**See all: `src/screens/OpenRoomsScreen.js`, route `OpenRooms` (R3).**
- A `FlatList` with pages of 20 and `onEndReached` loading the next page
  while `hasMore`.
- `RefreshControl` and a back button, with the same header as the
  `BookGrid` / `BucketGrid` "See all" screens.
- When empty: "No open rooms right now" and a "Start a room" button. That
  button goes through `usePlusGate('rooms')` to `CreateRoomScreen`, like
  Rooms' New.
- On iPad it's a 2-column grid.

**Book detail (R4).**
- Opening "Read with a room" calls `fetchOpenRooms({ bookId, limit: 5 })`,
  each time it opens.
- The sheet's items become:
  - your rooms reading this book
  - then the open rooms, with icon `globe-outline` and subtitle
    "Open room · N members"
  - then "Start a new room"
- Before they load, or when there are none, the sheet looks as it does
  today (R4.3).
- Picking an open room closes the picker and opens `OpenRoomSheet`. Two
  `Modal`s on iOS can't overlap, so the sheet opens from the picker's
  dismissal. `PickerSheet` gets an `onDismiss` prop, passed to its `Modal`
  and `Popover`. Book detail keeps the picked room until then.

**Room page: `src/screens/roomLobby/WhoCanJoin.js` (R6, R9.3).**
- It's a row placed straight after `InviteSection`, in both the setup and
  the active layouts.
- For the creator it's a button: "Who can join", with the value
  "Invite only" or "Open" and a chevron.
  - It opens a sheet with the two `PrivacyCard`s and the current one
    selected.
  - Picking the other one calls `setRoomPrivacy` and closes the sheet.
  - On failure it shows the toast "Couldn't change who can join" (R6.4).
- For everyone else it's the same row as plain text, with no chevron
  (R6.5).
- `useRoomLobby` already gives `iAmCreator` and the room. The room's
  `isPrivate` comes from the store, so the change shows at once.
- The invite card stays for open rooms (the list can't be searched, so a
  code is still how you bring a friend). `InviteSection` takes
  `isPrivate` and picks its caption from it (R8.3).

## Files
| File | Change |
|------|--------|
| readpanda `packages/api-go/scripts/migrate_open_rooms.sql` | new: existing rooms Invite only, `NOT NULL DEFAULT true`, partial index |
| readpanda `packages/api-go/scripts/readpanda_schema.sql` | modified: same column definition and index |
| readpanda `packages/api-go/internal/handlers/rooms.go` | modified: `CreateRoom` default; `ListOpenRooms`, `JoinOpenRoom`, `UpdateRoom`; `joinRoomAs` shared with `JoinRoom` |
| readpanda `packages/api-go/internal/models/models.go` | modified: `OpenRoom` |
| readpanda `packages/api-go/internal/server/router.go` | modified: three routes (`/room/open` before `/room/{id}`) |
| readpanda `packages/api-go/internal/server/rooms_open_test.go` | new: list filters and order, no invite code, join rules, creator-only PATCH, create default |
| readpanda `packages/api-go/ROUTES.md` | modified: the three routes |
| `src/stores/roomStore.js` | modified: `fetchOpenRooms`, `joinOpenRoom`, `setRoomPrivacy`, `afterJoin`; `saveRoom` default |
| `src/components/RoomPrivacy.js` | new: `ROOM_PRIVACY`, `PrivacyCard` (moved from Create room) |
| `src/screens/CreateRoomScreen.js` | modified: uses `RoomPrivacy` |
| `src/components/OpenRoomCard.js` | new |
| `src/components/OpenRoomSheet.js` | new: preview and Join |
| `src/components/PickerSheet.js` | modified: `onDismiss` |
| `src/screens/RoomsScreen.js` | modified: Open rooms section; copy |
| `src/screens/OpenRoomsScreen.js` | new: See all |
| `src/navigation/MainStackNavigator.js` | modified: `OpenRooms` route |
| `src/screens/BookDetailScreen.js` | modified: open rooms in "Read with a room" |
| `src/screens/roomLobby/WhoCanJoin.js` | new |
| `src/screens/roomLobby/RoomLobbyScreen.js` | modified: places `WhoCanJoin` |
| `src/stores/__tests__/roomStore.openRooms.test.js` | new: normalize, join outcomes, privacy rollback, create default |
| `src/components/__tests__/OpenRoomSheet.test.js` | new: join flow, busy state, stale and already-member paths |

## Data and state
- **API:** three new routes. `rooms.is_private` becomes
  `NOT NULL DEFAULT true`, and there's a new partial index.
- **Store:** no new persisted keys.
  - Open-room lists live in each screen's state, not in `roomStore`. They're
    a browse view, and caching them would show rooms that have since
    closed.
  - Joined rooms land in `rooms` through `afterJoin`, as joins by code do.
  - `isPrivate` already exists on normalized rooms.

## Navigation
- New route `OpenRooms` (no params) in `MainStackNavigator`, pushed from the
  Rooms tab's "See all".
- Joining navigates to `RoomLobbyScreen` with the joined room, the same as
  a join by code.
- The `ROOM_JOIN` push already deep-links the creator to the room.

## Edge cases
- **Offline or API error:**
  - The Rooms tab hides the section (R2.3).
  - Book detail shows its sheet without open rooms.
  - The See all screen shows the empty state with pull to refresh.
  - A failed join shows the API's message, or "Couldn't join that room".
- **Closed while previewing:** the join returns 403. The toast says it's
  invite-only now, and the list reloads (R5.5).
- **Deleted while previewing:** the join returns 404, the toast says so,
  and the list reloads (R5.6).
- **Joined elsewhere already** (another device or a code): the join returns
  409, and the app opens the room (R5.7).
- **Double tap on Join:** the button is busy and ignores taps. The API's
  `ON CONFLICT DO NOTHING` and the single notification on
  `RowsAffected == 1` already cover a race (R5.8).
- **The creator closes a room:** members stay, and the code still works
  (R6.6). It just stops appearing in lists.
- **An open room with no book:** it's listed after rooms with books, as
  "No book yet". It never shows on Book detail.
- **Large lists:** pages of 20, capped at 50 per request. Book detail shows
  at most 5. There's no search yet.
- **Old app versions after the migration:** they send `is_private`
  explicitly from Create room. Open there was the creator's choice, so it's
  honoured. Rooms they list or open behave as before.
- **Strangers in a room:** report and block come in their own spec, which
  ships in the same release. The terms already let us remove content and
  readers.

## Alternatives considered
- **Reuse `POST /room/join` with the room's id instead of a code:** fewer
  routes, but it would mix "I have a code" with "this room is public", and
  the 403 rule only applies to the second.
- **Return the invite code in the list and join with it:** no new join
  route, but anyone could then pass on the code of a room that later
  closes, which defeats R6.6.
- **Keep the list in `roomStore`:** one shared list, but Book detail's
  per-book list would fight the Rooms tab's.
- **Join on tap:** decided against (2026-10-21). An accidental tap would
  make you a member and notify the creator.
- **Open rooms on Discover:** decided against (2026-10-21). The design
  rules keep rooms off Discover.
