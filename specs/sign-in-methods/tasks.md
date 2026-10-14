# Sign-in Methods: Tasks

Each task should be small enough to review in one diff. Tick a task when it's
done and `yarn lint:check` passes (and `go build ./... && go vet ./... && go test ./internal/...`
for backend tasks). Backend tasks are in `readpanda/packages/api-go`.

### Backend
- [ ] 1. Migration `migrate_sign_in_methods.sql`: duplicate check, unique `google_sub` index; schema file updated (R4.4)
- [ ] 2. `GoogleAuth`: `google_sub` first, then `LOWER(email)`, storing `google_sub` on an email match (R4.2, R4.3)
- [ ] 3. `GET /users/me/sign-in-methods` (R1.1, R1.2)
- [ ] 4. `POST /users/me/sign-in-methods/{apple|google}`: verify, connect, 409 for taken or a different one, keep the Apple refresh token (R2.1, R2.4, R2.5, R4.1, R4.4)
- [ ] 5. `DELETE /users/me/sign-in-methods/{apple|google}`: last-method guard, clear, Apple revoke after the commit (R3.2, R3.3)
- [ ] 6. Tests against the local DB: connect, reconnect no-op, taken by another, different one already there, last-method refused, Google login by `google_sub` with a different email; plus `ROUTES.md` (R2–R4)

### App
- [ ] 7. `auth.js`: split out `getAppleCredential()` / `getGoogleIdToken()` (sign-in unchanged), add the three service calls (R2.1)
- [ ] 8. `useSignInMethods` and `SettingsRow` `busy` (R1.3, R2.2–R2.7, R3.4)
- [ ] 9. Settings: the group, phone and iPad placement, the disconnect `ConfirmSheet` and the only-method toast (R1.1, R1.2, R3.1, R3.2)

### QA
- [ ] 10. Sign up with Google; connect an Apple ID with a different (or hidden) email; sign out; Continue with Apple opens the same account. Then: Apple that owns another account (409), disconnect Google while Apple remains, try to disconnect the last one, an email account connecting both, iPad layout (R1–R4)

## Notes
- Deploy order: migration (task 1) before the `GoogleAuth` change (task 2) ships.
