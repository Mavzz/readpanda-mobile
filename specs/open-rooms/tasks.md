# Open rooms: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and, for API tasks, `go vet ./...` and
`go test ./...` in `packages/api-go`).

### API (readpanda, branch `feat/open-rooms`)
- [x] 1. Migration and create default (R7.1, R7.2)
  - `scripts/migrate_open_rooms.sql`; `readpanda_schema.sql`; `CreateRoom` `IsPrivate *bool` → default `true`
- [x] 2. List open rooms (R1.1–R1.7)
  - `models.OpenRoom`; `ListOpenRooms` at `GET /room/open`, registered before `/room/{id}`
- [x] 3. Join an open room (R5.4, R5.9)
  - `joinRoomAs` shared with `JoinRoom`; `JoinOpenRoom` at `POST /room/{id}/join` (404 / 403 / 409)
- [x] 4. Who can join (R6.3, R6.6, R6.7)
  - `UpdateRoom` at `PATCH /room/{id}`, creator-only
- [x] 5. API tests and docs (R1.1, R1.2, R1.3, R1.5, R1.6, R5.9, R6.7, R7.2)
  - `internal/server/rooms_open_test.go`; `ROUTES.md`

### App (readpanda-mobile, branch `feat/open-rooms`)
- [x] 6. Store (R5.2, R5.3, R5.5, R5.6, R5.7, R6.3, R6.4, R7.2)
  - `fetchOpenRooms`, `joinOpenRoom` + `afterJoin`, `setRoomPrivacy`, `saveRoom` default
- [x] 7. Shared privacy options (R6.2, R7.3)
  - `src/components/RoomPrivacy.js`; Create room uses it, unchanged on screen
- [x] 8. Open room card and preview sheet (R2.4, R5.1, R5.2, R5.5–R5.8, R9.1, R9.2, R9.4)
  - `OpenRoomCard.js`, `OpenRoomSheet.js`
- [x] 9. Rooms tab (R2.1–R2.6, R8.1, R8.2)
  - Open rooms section with See all; copy changes
- [x] 10. See all screen (R3.1–R3.5)
  - `OpenRoomsScreen.js`, `OpenRooms` route
- [x] 11. Book detail (R4.1–R4.4)
  - open rooms in "Read with a room"; `PickerSheet` `onDismiss`; preview after the picker closes
- [x] 12. Who can join on the room page (R6.1–R6.5, R8.3, R9.3)
  - `WhoCanJoin.js` in both lobby layouts; `InviteSection` caption follows the setting
- [x] 13. App tests (R5.2, R5.5–R5.8, R6.4, R7.2)
  - `roomStore.openRooms.test.js`, `OpenRoomSheet.test.js`; `yarn test` passes
- [x] 14. Check end to end on the Simulators, against the local API with the migration run (R1–R9)
  - two accounts: A creates an Open room; B sees it on Rooms and on its book's Book detail, previews, joins; A gets the join notification
  - A switches it to Invite only: it leaves other readers' lists, B stays a member, the code still works; a stale preview gets "invite-only now"
  - existing rooms show "Invite only" after the migration
  - iPad grid, VoiceOver labels, largest text size

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
- Task 2: the order ends with `r.id` as a tiebreaker, so rooms with the same book, size and creation time don't swap between pages.
- Task 3: a member joining a room that's since gone invite-only gets 409, not 403, so the app opens the room (R5.7); `joinRoomAs` also holds the existing 409 check.
- Task 7: `RoomPrivacy.js` also exports `privacyOptionFor(isPrivate)` for Who can join, and the cards are announced as radio buttons with their text (they had no accessibility props before).
- Task 8: `GradientPill` now passes extra props (accessibility) through to its `PressableScale`, so Join room can be announced as busy.
- Task 10: `OpenRooms` is registered in `MainStackNavigator` beside the room page (the Rooms tab has no stack), so it opens over the tab bar. A failed first load says "Couldn't load open rooms." instead of the empty state.
- Task 11: `Popover` passes `onDismiss` through too (the room sheet is a popover on iPad). With only open rooms, the sheet's subtitle reads "Open rooms reading this book". Android opens the preview at once, since its Modals can stack and RN's `onDismiss` is iOS-only.
- Task 12: the sheet adds a caption under the cards, "Everyone already in the room stays, and the invite code keeps working." (R6.6), so closing a room doesn't look like it removes people.
- Task 13: the sheet tests live in `src/components/__tests__/OpenRoomSheet.test.js` and the store's in `src/stores/__tests__/roomStore.openRooms.test.js`, beside the existing tests.
- Task 14: `apiService` throws a 4xx as `Error("Client error 403: …")` instead of returning it, so `joinOpenRoom` reads the status back from the message (the tests mocked a returned status and missed it). Join and the privacy switch pass `maxRetries: 0`, so a failure shows at once instead of after ~4s of retries. A stale room closes the preview before its toast; any other join error is said inside the sheet, since a toast sits behind an iOS Modal.
- Outside the spec, found during task 14: on iPad, Home's Rooms tonight card holds the first 3 rooms ("All rooms" has the rest), and Start / Choose the book sit beside the book line, so a room is two lines instead of three. Popular this week caps its landscape covers at the column width, since the 13" iPad in portrait gets that layout with a narrower column and the six covers ran under Rooms tonight. On iPad, Rooms tonight and New in your rooms (landscape) carry their label inside the card as an eyebrow, as Your week does in 16c, and the greeting reads "Hi, {name}" with the day after it on one line.
- Outside the spec, found during task 14: the Manrope .ttf files carried PostScript names like `ManropeExtraLight-ExtraBold` (a variable-font export), so iOS never matched `DS.font.*` and fell back to the system font at regular weight. Renamed their name tables to `Manrope-<Weight>` (glyphs untouched), in `src/assets/fonts` and the Android copies.
