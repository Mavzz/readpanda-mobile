# Active Room: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes.

- [x] 1. Lift 1b's sections into `YourPlaceCard`, `WhereEveryoneIs` and `RecentComments` (no visual change yet) (R4, R5, R6)
- [x] 2. `ActiveRoomHeader` with the Invite icon, reusing InviteSection's share (R2.1–R2.3)
- [x] 3. `RoomLobbyScreen` branches on book: active layout on phone, plus iPad landscape (3/2) and portrait (640pt column), with `DangerZone` at the bottom (R1.1, R6.3, R7)
- [x] 4. My Books and Currently reading open the active Room; remove the `RoomBookScreen` route and file (R1.2, R1.3)
- [ ] 5. QA: leave (member) and delete (creator) from the active Room, locked comments never show text, dots match Home and the reader, iPad both orientations (all)

## Notes
- Task 1: `YourPlaceCard` is only 1b's Continue button for now; task 3 adds 2c's "Ch. · Page" line and the waiting count. 1b's book header stays in `RoomBookScreen`, because 2c has none and 1b goes in task 4. `RecentComments` owns the thread sheet (it's a `Modal`, so rendering it inside the ScrollView is fine).
- Task 2: kept the app's 38pt round back button instead of 2c's "‹ Rooms" text, because the active Room also opens from My Books, where "Rooms" would be the wrong label. `shareInvite(roomName, code)` is now exported from `InviteSection`, so both share points use the same message. The Invite icon is hidden until the room's invite code has loaded.
- Task 3: added `useActiveRoomBook(room)`, which takes the reader's own place from their stored position and everyone's from *this* room's members. The shelf alone can't be used: a member who never opened the book has no shelf row, and a book in two rooms has one row naming the other. `roomMembersOf` / `roomMemberProgress` are now exported from `readingProgressStore`. The reader knows pages, not chapters, so the copy says "Page 31 of 210" / "Most of the room is around p. 64" where the design says "Ch. …". Continue passes `roomId` so the reader opens with this room's comment layer. Recent comments shows the newest 3 (6 in the iPad right column).
- Task 4: shelf taps go through a shared `openShelfBook(navigation, book)` (`src/utils/`), which finds the room by id, then by name, then falls back to `{ id, name }` for the Room screen to fetch. The active Room lives in the main stack, so unlike 1b it covers the tab bar, the same as the setup Room. `RoomBookScreen` and its route are deleted.
- Device review (2026-10-14): the header's Invite icon was removed and `InviteSection` (code, Copy, Share, QR) put back in the active layout, above Leave / Delete (R2.2, R2.4 updated).
