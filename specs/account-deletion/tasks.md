# Account Deletion: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and `go build ./... && go vet ./... && go test ./internal/...`
for backend tasks). Backend tasks are in `readpanda/packages/api-go`.

### Backend
- [x] 1. Migration `migrate_account_deletion.sql`: the "Deleted reader" row (re-runnable), and the schema file updated (R5.2, R5.4)
- [x] 2. Reserve `deleted.reader`: rejected by `validateSignup`, reported as taken by `/signup/available` (R5.4)
- [x] 3. `DELETE /users/me`: one transaction for room handover / delete-if-empty, comments reassigned, books unlinked, `reading_progress` deleted, user deleted; 204 (R4.1, R4.2, R5.1–R5.3, R6.1)
- [x] 4. Apple revoke after the commit, best effort (R4.3)
- [x] 5. Tests against the local DB: handover order, empty room deleted, comments kept as Deleted reader with replies intact, books unlinked, everything else gone, a second call is a no-op; plus `ROUTES.md` (R4–R6)

### App
- [x] 6. `deleteAccount()` in `services/auth.js` (R4.1)
- [x] 7. `ConfirmSheet`: `children` slot and busy state; the new delete copy; the subscriber note and Manage subscription link (R1.1, R1.2, R2.1, R2.2, R3.3)
- [x] 8. `handleDeleteAccount`: call, local sign-out cleanup, Login and the toast on success; error toast and stay on failure (R3.1, R3.2)
- [x] 9. `toComment` maps the Deleted reader account to "Deleted reader" / "DR" (R5.2, R5.5)

### QA
- [ ] 10. Delete: an email account, a Google account, an Apple account (check the Apple ID's "Apps Using Apple ID" list no longer shows ReadPanda), a subscriber, a room creator with members, a creator alone; check the creator's comments show as "Deleted reader" to another member; then sign up again with the same email (R1–R6)

## Notes
- `migrate_apple_signin.sql` (from signup-redesign) has been run on the live database, so Apple accounts can be revoked on deletion.
- Task 1: `scripts/migrate_account_deletion.sql` adds the sentinel and stops with an error if `deleted.reader` or its email already belongs to a real account. The schema file creates the sentinel too, but `testdb` truncates every table before each test, so the handler (task 3) or the tests (task 5) must insert it; task 3 should `INSERT … ON CONFLICT DO NOTHING` it in its transaction so deletion never depends on the migration having run. Applied to the local dev DB; **run it on Supabase before deploying task 3.** Backend work is on branch `feat/account-deletion` (from `develop/1.1.0`).
- Task 2: the name is reserved in code (`deletedReaderUsername`), not only by the row: `validateSignup` answers 400 on `username` with the same "That username is taken." as a real clash, and `usernameTaken` always reports it, which also keeps it out of `/signup/available` (taken, with a suggestion) and the Apple sign-up's username pick.
- Task 3: `DeleteMe` and `deleteAccount` / `handOverRooms` in `users.go`, routed in `internal/server/router.go` (routes moved there from `main.go` on develop). Reassigned comments get `client_id = NULL` (design.md updated: it's unique per author). Members with no `joined_at` sort last. The Apple token isn't read yet; that's task 4.
- Task 4: `deleteAccount` reads `apple_refresh_token` with `FOR UPDATE` inside the transaction and returns it; `DeleteMe` revokes after the commit but before replying (Cloud Run may withhold CPU once the response is sent; Apple's client times out at 10s). Without a configured key, or on a failed revoke, it logs and still answers 204. Not exercised against Apple yet: that's QA task 10 on a device.
- Task 5: `internal/server/account_test.go`: auth required; handover by `joined_at` with a same-moment tie; empty room deleted; comments from two deleted readers with the same `client_id` both kept as Deleted reader, reply intact; book unlinked; every column with a foreign key to `users` (found from `pg_constraint`, so new tables are covered) plus `reading_progress` emptied; second call 204; Apple token present with no key still 204; same email signs up again; `deleted.reader` refused and reported taken. The tests were checked against a deliberately broken `client_id` step (fails with 500).
- Task 6: `deleteAccount()` uses `makeAuthenticatedDeleteRequest`, so an expired access token is refreshed and the call retried; apiService's retries on network and 5xx errors are safe because the endpoint is idempotent. Returns `{ ok }`. App work is on branch `feat/account-deletion` in this repo.
- Task 7: `ConfirmSheet` takes `children` (under the message) and `busy`: the confirm button shows a spinner, and Cancel, the backdrop and the system back gesture are inactive, so the sheet can't be closed halfway. Settings doesn't pass `busy` yet; task 8 drives it. The ReadPanda+ note is a tonal `surfaceContainer` panel with the "Manage subscription" link in `primary`.
- Task 8: success calls `useAuthStore.signOut()` as is (it already clears the stores and storage, and `subscriptionStore.stop()` logs out of RevenueCat; `isAuthenticated` going false is what returns to Login). The sheet closes on failure too, not only on success: a `Modal` draws above the root `Toaster`, so the error toast would otherwise be hidden; the reader taps Delete account again to retry. Success toast is the `success` type.
- Task 9: mapped by `user_id` (the fixed id), not the username. Covers the native reader as well as the JS surfaces: `ManuscriptScreen` passes the store's comments straight to `CommentSheetView.swift`, which reads `username` / `initials` from them. "Replying to Deleted reader" follows from the same field.
