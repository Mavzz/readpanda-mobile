# Account Deletion: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and `go build ./... && go vet ./... && go test ./internal/...`
for backend tasks). Backend tasks are in `readpanda/packages/api-go`.

### Backend
- [ ] 1. Migration `migrate_account_deletion.sql`: the "Deleted reader" row (re-runnable), and the schema file updated (R5.2, R5.4)
- [ ] 2. Reserve `deleted.reader`: rejected by `validateSignup`, reported as taken by `/signup/available` (R5.4)
- [ ] 3. `DELETE /users/me`: one transaction for room handover / delete-if-empty, comments reassigned, books unlinked, `reading_progress` deleted, user deleted; 204 (R4.1, R4.2, R5.1–R5.3, R6.1)
- [ ] 4. Apple revoke after the commit, best effort (R4.3)
- [ ] 5. Tests against the local DB: handover order, empty room deleted, comments kept as Deleted reader with replies intact, books unlinked, everything else gone, a second call is a no-op; plus `ROUTES.md` (R4–R6)

### App
- [ ] 6. `deleteAccount()` in `services/auth.js` (R4.1)
- [ ] 7. `ConfirmSheet`: `children` slot and busy state; the new delete copy; the subscriber note and Manage subscription link (R1.1, R1.2, R2.1, R2.2, R3.3)
- [ ] 8. `handleDeleteAccount`: call, local sign-out cleanup, Login and the toast on success; error toast and stay on failure (R3.1, R3.2)
- [ ] 9. `toComment` maps the Deleted reader account to "Deleted reader" / "DR" (R5.2, R5.5)

### QA
- [ ] 10. Delete: an email account, a Google account, an Apple account (check the Apple ID's "Apps Using Apple ID" list no longer shows ReadPanda), a subscriber, a room creator with members, a creator alone; check the creator's comments show as "Deleted reader" to another member; then sign up again with the same email (R1–R6)

## Notes
- `migrate_apple_signin.sql` (from signup-redesign) has been run on the live database, so Apple accounts can be revoked on deletion.
