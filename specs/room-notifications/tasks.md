# Room Notifications: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and `go build ./... && go vet ./... && go test ./internal/...`
for backend tasks). Backend tasks are in `readpanda/packages/api-go`.

### Backend
- [ ] 1. Migration `migrate_notification_events.sql` (re-runnable) and `readpanda_schema.sql`: the new `notifications` columns, the `room_id` FK with ON DELETE CASCADE, the partial unique index for unread room rows, and the `notification_settings` table (R2.4, R2.5, R5.7, R8.3)
- [ ] 2. Models, `internal/notify/settings.go` and config: the four new types, the new JSON fields, `Settings` with all-on defaults, the type → switch mapping and SQL filter; `RoomCommentWindow` from `NOTIFY_ROOM_COMMENT_WINDOW` (default 30m), documented in `.env.local.example` and `DEPLOYMENT.md` (R2.5, R5.3, R7.3, R8.1)
- [ ] 3. `GET` / `PUT /users/me/notification-settings`: handlers, routes, `ROUTES.md` (R8.1, R8.2)
- [ ] 4. `notify.Send`: drop recipients whose switch is off, write inbox rows, then push synchronously under a 5s timeout; `ToAllUsersExcept` skips readers with New books off; push data with `room_id` / `room_name` / `book_id`; `SendPush` adds the default APNs sound (R5.2–R5.6)
- [ ] 5. `notify.RoomComment`: upsert the unread row per (user, room), the throttle on `last_pushed_at` using `RoomCommentWindow`, skipping members with Room comments off, the locked / unlocked / bundled bodies from each member's `furthest_page`. First confirm which page numbering the comment layer shows, and match it (R2.2–R2.6)
- [ ] 6. `CreateComment`: skip `client_id` replays; R1 to the root's author unless it's the replier or they've left; R2 to the other members, excluding the replier and the R1 recipient (R1.1–R1.4, R2.1, R2.7, R5.1)
- [ ] 7. `JoinRoom`: notify the creator after a successful insert only (R3.1–R3.3, R5.1)
- [ ] 8. `SetRoomReading`: read the old book, and notify members other than the creator only when it changes to a new non-null book (R4.1, R4.2, R5.1)
- [ ] 9. `GetUserNotifications`: order by `updated_at`, return `room_id`, `count`, `updated_at` (R2.4, R6.7)
- [ ] 10. `internal/server/notifications_test.go`: reply notifies the root author with text, not on self-reply, not twice (R1+R2); locked vs unlocked body per member, reply uses root's page, no progress row = locked; bundling counts up in one row with no text, pushes once per window (fake clock or set `last_pushed_at` back), new row after read; replay doesn't notify; join notifies the creator only, 409 doesn't; book change notifies members except the creator, same book / clear doesn't; switch off → no row and no push for that type, including NEW_BOOK (stub `SendPush`); window read from config; settings GET defaults and PUT subset; room delete removes its rows (R1–R5, R8)

### App
- [ ] 11. `notificationService` (`toNotification` new fields, `getSettings`, `updateSettings`) and `notificationStore` (`settings`, `fetchSettings`, optimistic `setSetting` with rollback) (R7.3, R7.4, R8.1, R8.2)
- [ ] 12. `src/utils/openNotification.js`, used by `usePushNotifications.handleOpened` and `NotificationList`: routing per type, mark read and refresh, cold-start wait, "That's no longer available" fallback (R6.1–R6.6)
- [ ] 13. `NotificationList`: icon per type (R6.7)
- [ ] 14. `NotificationSettingsScreen`, `NotificationSettings` route, Settings row → screen with the summary value; the five switches, the iOS-permission banner with Open Settings, iPad column width (R7.1, R7.2, R7.5, R7.6, R7.7)
- [ ] 15. Jest: `openNotification` per type and the missing-target fallback; `setSetting` rollback on failure; the summary value (R6.1–R6.5, R7.4, R7.6)

### QA
- [ ] 16. On two phones (or a phone plus a second account): reply → immediate push with text and sound; room comment ahead of the other reader → "commented on p. N" with no text; five quick comments → one push, inbox row says 5; read it, comment again → new push; join with the code → creator only; change the room's book → members; switch each type off → no push and no inbox row; iOS permission off → banner; tap each type from the lock screen with the app closed and from the background, and from the inbox; delete a room with an unread row (R1–R8)

## Notes
<!-- One line per change from design.md: "Task 3: used X instead of Y because …" -->
- Before task 16, the APNs key has to be uploaded to Firebase (Cloud Messaging → Apple app configuration). The key is sandbox-only, so it works for Xcode and `yarn ipa` builds but not TestFlight.
- **Run `migrate_notification_events.sql` on Supabase before deploying tasks 4–9.**
