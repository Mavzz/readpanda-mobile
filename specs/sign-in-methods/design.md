# Sign-in Methods: Design

## Approach
Three small endpoints under `/users/me/sign-in-methods`, and one change to `/auth/google`. The app gets a "Sign-in methods" group in Settings that reuses `SettingsRow` and `ConfirmSheet`. Connecting reuses the existing Apple and Google sheets: `auth.js` is split so the native sign-in that gets the token can be called on its own, without posting to `/auth/*`.

## Database (api-go)
`scripts/migrate_sign_in_methods.sql`, re-runnable:
- `CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub) WHERE google_sub IS NOT NULL` (R4.4). `apple_sub` already has one. The migration first lists any duplicate `google_sub` values and stops if there are any, rather than failing halfway.
- No new columns: `google_sub`, `apple_sub`, `apple_refresh_token` and `password` exist.

## API (api-go)
In `internal/handlers/users.go` (or a new `sign_in_methods.go` if `users.go` gets too long), routed in `cmd/server/main.go`, all authenticated:

| Route | Body | Does | Answers |
|---|---|---|---|
| `GET /users/me/sign-in-methods` | – | reads the user row | `{ "apple": bool, "google": bool, "password": bool, "email": "…" }` |
| `POST /users/me/sign-in-methods/apple` | `{ identity_token, authorization_code }` | `utils.VerifyAppleIdentityToken`; `UPDATE users SET apple_sub = $sub WHERE uuid = $me AND (apple_sub IS NULL OR apple_sub = $sub)`; then `keepAppleRefreshToken` | 200 with the methods; 409 if the sub is on another user (unique violation) or the account has a different one (R2.4, R2.5); 401 for a bad token |
| `POST /users/me/sign-in-methods/google` | `{ id_token }` | `idtoken.Validate` against both client ids, `email_verified` not needed (we key on `sub`); same update on `google_sub` | as above |
| `DELETE /users/me/sign-in-methods/{apple\|google}` | – | in one transaction: count remaining methods (password, other sub); if none, 409 (R3.2); else clear the sub (and for Apple, `apple_refresh_token`) | 200 with the methods. For Apple, `utils.RevokeAppleToken` after the commit, best effort (R3.3) |

Connecting the same provider again with the same sub is a no-op 200, so a retry is safe.

`GoogleAuth` change (R4.2, R4.3): look up `WHERE google_sub = $sub` first; if none, the existing `WHERE email = $1`, and on a match with `google_sub IS NULL`, set it. A new Google account already stores `google_sub`.

The Google login's `email = $1` is case-sensitive while Apple's is `LOWER(email)`; the lookup moves to `LOWER(email)` while it's being touched.

## App (`readpanda-mobile`)
| File | Change |
|------|--------|
| `src/services/auth.js` | Split `getAppleCredential()` (the sheet; `{ cancelled }` or the credential) and `getGoogleIdToken()` (both iOS paths) out of `appleSignUpLogin` / `googleSignUpLogin`, which keep working the same way. New `signInMethods()`, `connectSignInMethod(provider)`, `disconnectSignInMethod(provider)` |
| `src/screens/profile/useSignInMethods.js` | new: loads the methods on focus; `connect(provider)` / `disconnect(provider)` with the in-flight provider, and the toasts |
| `src/screens/profile/SettingsScreen.js` | the "Sign-in methods" group, above the Sign out / Delete account card (in the right column on iPad, above `accountGroup`); a `confirm` value `disconnect:apple` / `disconnect:google` for the `ConfirmSheet` |
| `src/screens/profile/SettingsRow.js` | an optional `busy` prop: an `ActivityIndicator` in place of the value and chevron, and presses ignored (R2.7) |

Icons: `logo-apple` and `logo-google` from Ionicons in the rows, in `DS.colors.onSurfaceVariant` like the other row icons. The four-colour G is for sign-in buttons only, not a Settings row icon, which Google's rules don't cover.

## Data and state
No store: the methods live in the hook's state, since only Settings reads them. Nothing new persisted.

## Navigation
None.

## Edge cases
- Apple only shares an email on the first authorization: connect doesn't need one; it keys on `sub`.
- The reader connects the Apple ID that already owns a duplicate account: 409 (R2.4). They can sign into that one with Apple, delete it, sign back in here and connect.
- Disconnecting the method the reader is signed in with right now: allowed when another remains; the session stays (access and refresh tokens aren't tied to a provider).
- Two devices: the methods reload whenever Settings gains focus.
- Offline: connect or disconnect shows the R2.6 / R3.4 toast; loading failure hides the group (R1.3).
- Deleting the account (account-deletion spec) clears all of it anyway, with the Apple revoke.

## Alternatives considered
- Merge two existing accounts: what readers with duplicates really want, but rooms, comments, progress and buckets would all need combining, with conflicts. Out of scope; delete-then-connect covers it.
- Ask "Is this you?" during a new Apple sign-up when the name looks familiar: guesses, and could reveal that an account exists.
