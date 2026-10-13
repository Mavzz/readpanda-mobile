# Active Room: Design

## Approach
`RoomLobbyScreen` decides by state: no book → today's setup sections (2a / 15k); a book → the active layout. Both share `useRoomLobby` (room, members, book, invite code). The active layout is built from section components, mostly lifted out of `RoomBookScreen` (1b), which already has the data wiring for member progress and comments. After that `RoomBookScreen` is deleted.

```
RoomLobbyScreen
 ├─ no book → LobbyHeader + BookSection + InviteSection + MemberList + DangerZone   (unchanged)
 └─ book    → ActiveRoomHeader (back · name · "{n} readers · Book" · Invite)
              ├─ YourPlaceCard        (R4; becomes the foot of the schedule card when turn 18 ships)
              ├─ WhereEveryoneIs      (R5)
              ├─ RecentComments       (R6)
              └─ DangerZone           (R7, unchanged, at the bottom)
              phone: one column · iPad wide: SplitLayout 3/2 (left: place + everyone + danger zone, right: comments)
              iPad regular: one column at 640pt
```

## Files
| File | Change |
|------|--------|
| `src/screens/roomLobby/RoomLobbyScreen.js` | modified: branch on `currentBook` |
| `src/screens/roomLobby/ActiveRoomHeader.js` | new: header and Invite icon |
| `src/screens/roomLobby/YourPlaceCard.js` | new: chapter/page, waiting count, Continue (lifted from 1b) |
| `src/screens/roomLobby/WhereEveryoneIs.js` | new: member dots (lifted from 1b's pace track; shared with Home's `FriendTrack` once that exists) |
| `src/screens/roomLobby/RecentComments.js` | new: unlocked rows, locked count, opens `CommentThreadSheet` (lifted from 1b) |
| `src/screens/roomLobby/InviteSection.js` | modified: export the share handler so the Invite icon reuses it |
| `src/screens/MyBooksScreen.js`, `src/screens/ReadingScreen.js` | modified: room rows open `RoomLobbyScreen` with the room, not `RoomBookScreen` |
| `src/navigation/MyBooksStackNavigator.js` | modified: remove the `RoomBookScreen` route |
| `src/screens/RoomBookScreen.js` | deleted |

## Leave / Delete (R7)
`DangerZone` renders unchanged at the bottom of the active layout, with the same confirmations and behaviour as 2a. The ⋯ menu (2d / 2e / 14l) is deferred.

## Data
No new API. The room comes from `useRoomLobby`, members' positions from `readingProgressStore.fetchMemberProgress(roomId)`, and comments from `commentsStore.loadComments(roomId, bookId)`. Your position comes from `readingProgressStore.progress[bookId]`. My Books rows find the room by the shelf entry's `roomId` in `roomStore.rooms`.

## Edge cases
- The book is in several of your rooms: each room's screen shows that room's members and comments; My Books opens the room the row names.
- A member with no position yet: their dot sits at the start.
- You haven't opened the book: "Not started", Continue opens page 1.
- Offline: render from the persisted stores; comments show the last loaded set.
- A deep link to 1b's old route: none exist (widgets and invites open `RoomLobbyScreen`).
